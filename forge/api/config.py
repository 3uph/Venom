from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    secret_key: str = "change-me-to-a-random-string"
    admin_user: str = "admin"
    admin_password: str = "admin"
    db_path: str = "./forge.db"
    storage_path: str = "./storage"
    token_expire_minutes: int = 480

    model_config = {"env_prefix": "FORGE_"}


settings = Settings()
