from pydantic import BaseModel
from datetime import datetime


class Placeholder(BaseModel):
    id: str
    label: str
    hint: str = ""


class TemplateCreate(BaseModel):
    name: str
    description: str = ""
    tags: list[str] = []
    graph: dict
    placeholders: list[Placeholder] = []


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    graph: dict | None = None
    placeholders: list[Placeholder] | None = None


class TemplateOut(BaseModel):
    id: str
    name: str
    description: str
    tags: list[str]
    graph: dict
    placeholders: list[Placeholder]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SaveAsTemplateBody(BaseModel):
    name: str
    description: str = ""
    tags: list[str] = []


class InstantiateBody(BaseModel):
    project_id: str
    name: str | None = None
    file_mappings: dict[str, str]
