from pydantic import BaseModel
from datetime import datetime


class PipelineCreate(BaseModel):
    name: str
    project_id: str
    graph: dict = {}


class PipelineUpdate(BaseModel):
    name: str | None = None
    graph: dict | None = None


class PipelineOut(BaseModel):
    id: str
    project_id: str
    name: str
    graph: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PipelineRunOut(BaseModel):
    id: str
    pipeline_id: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    step_results: dict

    model_config = {"from_attributes": True}
