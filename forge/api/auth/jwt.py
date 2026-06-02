from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from api.config import settings

ALGORITHM = "HS256"


def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.token_expire_minutes)
    return jwt.encode({"sub": username, "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
