from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
from api.db.engine import get_db
from api.db.models import RegisteredModule
from api.auth.dependencies import get_current_user
from api.modules.schemas import ModuleRegister, ModuleOut

router = APIRouter(prefix="/api/modules", tags=["modules"], dependencies=[Depends(get_current_user)])


async def _fetch_manifest(host: str, port: int) -> dict:
    url = f"http://{host}:{port}/manifest"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def _check_health(host: str, port: int) -> dict:
    url = f"http://{host}:{port}/health"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


@router.get("", response_model=list[ModuleOut])
def list_modules(db: Session = Depends(get_db)):
    return db.query(RegisteredModule).all()


@router.post("", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
async def register_module(body: ModuleRegister, db: Session = Depends(get_db)):
    existing = db.query(RegisteredModule).filter_by(host=body.host, port=body.port).first()
    if existing:
        raise HTTPException(status_code=400, detail="Module already registered at this address")
    try:
        manifest = await _fetch_manifest(body.host, body.port)
    except Exception:
        raise HTTPException(status_code=502, detail=f"Cannot reach module at {body.host}:{body.port}")
    module = RegisteredModule(
        name=manifest.get("name", "unknown"),
        host=body.host,
        port=body.port,
        platform=manifest.get("platform", "unknown"),
        status="online",
        last_health_check=datetime.now(timezone.utc),
        manifest_cache=manifest,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.get("/{module_id}", response_model=ModuleOut)
def get_module(module_id: str, db: Session = Depends(get_db)):
    module = db.get(RegisteredModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module


@router.post("/{module_id}/refresh", response_model=ModuleOut)
async def refresh_module(module_id: str, db: Session = Depends(get_db)):
    module = db.get(RegisteredModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    try:
        manifest = await _fetch_manifest(module.host, module.port)
        health = await _check_health(module.host, module.port)
        module.manifest_cache = manifest
        module.name = manifest.get("name", module.name)
        module.platform = manifest.get("platform", module.platform)
        module.status = health.get("status", "unknown")
        module.last_health_check = datetime.now(timezone.utc)
    except Exception:
        module.status = "offline"
        module.last_health_check = datetime.now(timezone.utc)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(module_id: str, db: Session = Depends(get_db)):
    module = db.get(RegisteredModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
