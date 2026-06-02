from pydantic import BaseModel
from datetime import datetime


class ModuleRegister(BaseModel):
    host: str
    port: int


class ModuleOut(BaseModel):
    id: str
    name: str
    host: str
    port: int
    platform: str
    status: str
    last_health_check: datetime | None
    manifest_cache: dict | None

    model_config = {"from_attributes": True}
