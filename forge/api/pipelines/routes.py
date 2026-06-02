import asyncio
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from api.db.engine import get_db, SessionLocal
from api.db.models import Pipeline, PipelineRun
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
