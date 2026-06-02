from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from passlib.hash import bcrypt
from api.config import settings
from api.auth.jwt import create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

_hashed_password: str | None = None


def _get_hashed_password() -> str:
    global _hashed_password
    if _hashed_password is None:
        _hashed_password = bcrypt.hash(settings.admin_password)
    return _hashed_password


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    if body.username != settings.admin_user or not bcrypt.verify(body.password, _get_hashed_password()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(body.username)
    return LoginResponse(token=token, username=body.username)
