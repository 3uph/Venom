import asyncio
from datetime import datetime, timezone
import httpx
from api.db.engine import SessionLocal
from api.db.models import RegisteredModule

POLL_INTERVAL_SECONDS = 30
HEALTH_TIMEOUT_SECONDS = 3.0


async def _check_one(host: str, port: int) -> str:
    url = f"http://{host}:{port}/health"
    try:
        async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT_SECONDS) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("status", "online")
            return "offline"
    except Exception:
        return "offline"


async def poll_loop():
    while True:
        try:
            db = SessionLocal()
            try:
                modules = db.query(RegisteredModule).all()
                for m in modules:
                    new_status = await _check_one(m.host, m.port)
                    m.status = new_status
                    m.last_health_check = datetime.now(timezone.utc)
                db.commit()
            finally:
                db.close()
        except Exception:
            pass
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


_task: asyncio.Task | None = None


def start():
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(poll_loop())


def stop():
    global _task
    if _task and not _task.done():
        _task.cancel()
