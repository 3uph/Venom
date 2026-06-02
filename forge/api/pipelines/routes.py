import asyncio
import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.db.engine import get_db, SessionLocal
from api.db.models import Pipeline, PipelineRun, Project, ProjectFile
from api.auth.dependencies import get_current_user
from api.auth.jwt import verify_token
from api.pipelines.schemas import (
    PipelineCreate, PipelineUpdate, PipelineOut, PipelineRunOut, ValidationResultOut,
)
from api.pipelines.engine import execute_pipeline
from api.pipelines.validator import validate_pipeline
from api.pipelines.streaming import subscribe

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])
authed_router = APIRouter(prefix="/api/pipelines", tags=["pipelines"], dependencies=[Depends(get_current_user)])


@authed_router.get("", response_model=list[PipelineOut])
def list_pipelines(project_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Pipeline)
    if project_id:
        query = query.filter_by(project_id=project_id)
    return query.order_by(Pipeline.created_at.desc()).all()


@authed_router.post("", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
def create_pipeline(body: PipelineCreate, db: Session = Depends(get_db)):
    pipeline = Pipeline(name=body.name, project_id=body.project_id, graph=body.graph)
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@authed_router.get("/{pipeline_id}", response_model=PipelineOut)
def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@authed_router.patch("/{pipeline_id}", response_model=PipelineOut)
def update_pipeline(pipeline_id: str, body: PipelineUpdate, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if body.name is not None:
        pipeline.name = body.name
    if body.graph is not None:
        pipeline.graph = body.graph
    db.commit()
    db.refresh(pipeline)
    return pipeline


@authed_router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    db.delete(pipeline)
    db.commit()


@authed_router.post("/{pipeline_id}/validate", response_model=ValidationResultOut)
def validate_pipeline_endpoint(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    result = validate_pipeline(pipeline, db)
    return ValidationResultOut(
        valid=result.valid,
        errors=[e.to_dict() for e in result.errors],
    )


@authed_router.post("/{pipeline_id}/execute", response_model=PipelineRunOut)
async def run_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    run = PipelineRun(
        pipeline_id=pipeline_id,
        status="running",
        started_at=datetime.now(timezone.utc),
        step_results={},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    run_id = run.id
    asyncio.create_task(execute_pipeline(pipeline_id, run_id, SessionLocal))
    return run


@authed_router.get("/{pipeline_id}/runs", response_model=list[PipelineRunOut])
def list_runs(pipeline_id: str, db: Session = Depends(get_db)):
    return db.query(PipelineRun).filter_by(pipeline_id=pipeline_id).order_by(PipelineRun.started_at.desc()).all()


@authed_router.get("/{pipeline_id}/runs/{run_id}", response_model=PipelineRunOut)
def get_run(pipeline_id: str, run_id: str, db: Session = Depends(get_db)):
    run = db.get(PipelineRun, run_id)
    if not run or run.pipeline_id != pipeline_id:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


class DuplicateBody(BaseModel):
    name: str | None = None


class CloneBody(BaseModel):
    project_id: str
    name: str | None = None
    file_mappings: dict[str, str] = {}


@authed_router.post("/{pipeline_id}/duplicate", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
def duplicate_pipeline(pipeline_id: str, body: DuplicateBody, db: Session = Depends(get_db)):
    src = db.get(Pipeline, pipeline_id)
    if not src:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    new_name = body.name or f"{src.name} (copy)"
    dup = Pipeline(
        project_id=src.project_id,
        name=new_name,
        graph=copy.deepcopy(src.graph or {}),
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    return dup


@authed_router.post("/{pipeline_id}/clone", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
def clone_pipeline(pipeline_id: str, body: CloneBody, db: Session = Depends(get_db)):
    src = db.get(Pipeline, pipeline_id)
    if not src:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    target = db.get(Project, body.project_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target project not found")

    graph = copy.deepcopy(src.graph or {})
    needed: list[str] = []
    new_nodes = []
    id_remap: dict[str, str] = {}
    for node in graph.get("nodes", []):
        if node.get("type") == "projectFileNode":
            old_file_id = node.get("data", {}).get("file_id")
            new_file_id = body.file_mappings.get(old_file_id)
            if not new_file_id:
                needed.append(old_file_id)
                continue
            pf = db.get(ProjectFile, new_file_id)
            if not pf or pf.project_id != body.project_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mapped file {new_file_id} not in target project",
                )
            new_node_id = f"file_{new_file_id}"
            id_remap[node["id"]] = new_node_id
            new_nodes.append({
                "id": new_node_id,
                "type": "projectFileNode",
                "position": node.get("position", {"x": 0, "y": 0}),
                "data": {"file_id": new_file_id, "filename": pf.filename},
            })
        else:
            new_nodes.append(node)

    if needed:
        raise HTTPException(
            status_code=400,
            detail=f"Missing file_mappings for: {needed}",
        )

    new_edges = []
    for edge in graph.get("edges", []):
        new_edge = dict(edge)
        if edge.get("source") in id_remap:
            new_edge["source"] = id_remap[edge["source"]]
        new_edges.append(new_edge)

    cloned = Pipeline(
        project_id=body.project_id,
        name=body.name or f"{src.name} (cloned)",
        graph={"nodes": new_nodes, "edges": new_edges},
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return cloned


@authed_router.post("/{pipeline_id}/runs/{run_id}/rerun", response_model=PipelineRunOut)
async def rerun_run(pipeline_id: str, run_id: str, db: Session = Depends(get_db)):
    src = db.get(PipelineRun, run_id)
    if not src or src.pipeline_id != pipeline_id:
        raise HTTPException(status_code=404, detail="Run not found")
    new_run = PipelineRun(
        pipeline_id=pipeline_id,
        status="running",
        started_at=datetime.now(timezone.utc),
        step_results={},
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    asyncio.create_task(execute_pipeline(pipeline_id, new_run.id, SessionLocal))
    return new_run


@authed_router.get("/{pipeline_id}/runs/{run_id}/artifacts/{node_id}/download")
def download_artifact(pipeline_id: str, run_id: str, node_id: str, db: Session = Depends(get_db)):
    run = db.get(PipelineRun, run_id)
    if not run or run.pipeline_id != pipeline_id:
        raise HTTPException(status_code=404, detail="Run not found")
    results = run.step_results or {}
    step = results.get(node_id)
    if not step or not step.get("output_path"):
        raise HTTPException(status_code=404, detail="Artifact not found for node")
    path = Path(step["output_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact file missing on disk")
    return FileResponse(path, filename=path.name)


@router.websocket("/{pipeline_id}/runs/{run_id}/stream")
async def stream_run(websocket: WebSocket, pipeline_id: str, run_id: str):
    token = websocket.query_params.get("token", "")
    if not verify_token(token):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    try:
        async for event in subscribe(run_id):
            await websocket.send_text(json.dumps(event))
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
