from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db.engine import get_db
from api.db.models import Pipeline, PipelineRun
from api.auth.dependencies import get_current_user
from api.pipelines.schemas import PipelineCreate, PipelineUpdate, PipelineOut, PipelineRunOut
from api.pipelines.engine import execute_pipeline

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[PipelineOut])
def list_pipelines(project_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Pipeline)
    if project_id:
        query = query.filter_by(project_id=project_id)
    return query.order_by(Pipeline.created_at.desc()).all()


@router.post("", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
def create_pipeline(body: PipelineCreate, db: Session = Depends(get_db)):
    pipeline = Pipeline(name=body.name, project_id=body.project_id, graph=body.graph)
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.get("/{pipeline_id}", response_model=PipelineOut)
def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.patch("/{pipeline_id}", response_model=PipelineOut)
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


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    db.delete(pipeline)
    db.commit()


@router.post("/{pipeline_id}/execute", response_model=PipelineRunOut)
async def run_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    run = await execute_pipeline(pipeline, db)
    return run


@router.get("/{pipeline_id}/runs", response_model=list[PipelineRunOut])
def list_runs(pipeline_id: str, db: Session = Depends(get_db)):
    return db.query(PipelineRun).filter_by(pipeline_id=pipeline_id).order_by(PipelineRun.started_at.desc()).all()
