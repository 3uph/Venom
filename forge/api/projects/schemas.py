from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    notes: str | None = None
    archived: bool | None = None


class ProjectFileOut(BaseModel):
    id: str
    filename: str
    file_type: str
    sha256: str = ""
    size_bytes: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    notes: str = ""
    archived: bool = False
    created_at: datetime
    updated_at: datetime
    files: list[ProjectFileOut] = []

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    id: str
    name: str
    description: str
    archived: bool = False
    created_at: datetime
    file_count: int = 0

    model_config = {"from_attributes": True}
