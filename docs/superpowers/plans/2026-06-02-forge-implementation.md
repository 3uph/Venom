# Forge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based Red Team artifact builder with a central dashboard that orchestrates independent modules via HTTP, featuring a visual drag & drop pipeline editor.

**Architecture:** Docker-deployable dashboard (React frontend + FastAPI backend + SQLite) that connects to remote modules via IP:port. Each module is a standalone Flask service exposing `/manifest`, `/health`, `/execute`. Pipeline editor uses ReactFlow for visual node-based workflow creation.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, SQLite, React 18, TypeScript, ReactFlow, Flask, Docker, JWT auth (python-jose), httpx (async HTTP client).

---

## File Structure

```
forge/
├── api/                              # FastAPI backend
│   ├── main.py                       # App factory, CORS, static mount
│   ├── config.py                     # Settings (secret key, db path, storage path)
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── routes.py                 # POST /api/auth/login, GET /api/auth/me
│   │   ├── dependencies.py           # get_current_user dependency
│   │   └── jwt.py                    # create_token, verify_token
│   ├── db/
│   │   ├── __init__.py
│   │   ├── engine.py                 # SQLite engine + session factory
│   │   └── models.py                 # All SQLAlchemy models
│   ├── projects/
│   │   ├── __init__.py
│   │   ├── routes.py                 # CRUD /api/projects, file upload/download
│   │   └── schemas.py               # Pydantic schemas
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── routes.py                 # CRUD /api/modules, manifest fetch, health poll
│   │   └── schemas.py               # Pydantic schemas
│   ├── pipelines/
│   │   ├── __init__.py
│   │   ├── routes.py                 # CRUD /api/pipelines, POST execute
│   │   ├── schemas.py               # Pydantic schemas
│   │   └── engine.py                # Pipeline execution engine
│   └── requirements.txt
├── dashboard/                        # React frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                  # Entry point
│       ├── App.tsx                   # Router setup
│       ├── api/
│       │   └── client.ts            # Axios instance with JWT interceptor
│       ├── auth/
│       │   ├── LoginPage.tsx         # Login form
│       │   └── AuthProvider.tsx      # Context + protected route
│       ├── projects/
│       │   ├── ProjectListPage.tsx   # List + create projects
│       │   ├── ProjectDetailPage.tsx # Files + pipelines for a project
│       │   └── FileUpload.tsx        # Upload component
│       ├── modules/
│       │   └── ModuleRegistryPage.tsx # Add/view/remove modules
│       ├── pipelines/
│       │   ├── PipelineEditorPage.tsx # ReactFlow canvas
│       │   ├── nodes/
│       │   │   └── ModuleNode.tsx     # Custom node component
│       │   ├── PipelineToolbar.tsx    # Save, execute, clear
│       │   └── NodeConfigPanel.tsx    # Side panel for node params
│       └── layout/
│           └── AppLayout.tsx          # Sidebar + header
├── module-sdk/                        # Python SDK for building modules
│   ├── forge_module_sdk/
│   │   ├── __init__.py               # Exports ForgeModule, Param
│   │   ├── module.py                 # ForgeModule class
│   │   └── param.py                  # Param dataclass
│   ├── setup.py
│   └── requirements.txt
├── modules/                           # Example module
│   └── echo-module/
│       ├── main.py                    # Example module using SDK
│       └── requirements.txt
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Task 1: Project Scaffolding + Git Init

**Files:**
- Create: `forge/.env.example`
- Create: `forge/api/requirements.txt`
- Create: `forge/api/__init__.py`
- Create: `forge/dashboard/package.json`
- Create: `forge/module-sdk/requirements.txt`
- Create: `forge/.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /home/kali/Documents/shell
git init
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p forge/{api/{auth,db,projects,modules,pipelines},dashboard/src/{api,auth,projects,modules,pipelines/nodes,layout},module-sdk/forge_module_sdk,modules/echo-module}
```

- [ ] **Step 3: Create .gitignore**

Create `forge/.gitignore`:
```
__pycache__/
*.pyc
*.pyo
.env
*.db
storage/
node_modules/
dist/
build/
.vite/
```

- [ ] **Step 4: Create .env.example**

Create `forge/.env.example`:
```
FORGE_SECRET_KEY=change-me-to-a-random-string
FORGE_ADMIN_USER=admin
FORGE_ADMIN_PASSWORD=change-me
FORGE_DB_PATH=./forge.db
FORGE_STORAGE_PATH=./storage
```

- [ ] **Step 5: Create api/requirements.txt**

Create `forge/api/requirements.txt`:
```
fastapi==0.115.12
uvicorn==0.34.3
sqlalchemy==2.0.41
python-jose[cryptography]==3.4.0
python-multipart==0.0.20
passlib[bcrypt]==1.7.4
httpx==0.28.1
pydantic==2.11.4
aiosqlite==0.21.0
```

- [ ] **Step 6: Create dashboard/package.json**

Create `forge/dashboard/package.json`:
```json
{
  "name": "forge-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@xyflow/react": "^12.6.0",
    "axios": "^1.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.6.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.5.2",
    "typescript": "~5.8.3",
    "vite": "^6.3.5"
  }
}
```

- [ ] **Step 7: Create module-sdk/requirements.txt**

Create `forge/module-sdk/requirements.txt`:
```
flask==3.1.1
```

- [ ] **Step 8: Create empty __init__.py files**

```bash
touch forge/api/__init__.py
touch forge/api/auth/__init__.py
touch forge/api/db/__init__.py
touch forge/api/projects/__init__.py
touch forge/api/modules/__init__.py
touch forge/api/pipelines/__init__.py
touch forge/module-sdk/forge_module_sdk/__init__.py
```

- [ ] **Step 9: Commit**

```bash
git add forge/
git add docs/
git commit -m "feat: scaffold forge project structure"
```

---

## Task 2: Backend — Config + Database Models

**Files:**
- Create: `forge/api/config.py`
- Create: `forge/api/db/engine.py`
- Create: `forge/api/db/models.py`

- [ ] **Step 1: Create config.py**

Create `forge/api/config.py`:
```python
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
```

Add `pydantic-settings==2.9.1` to `forge/api/requirements.txt`.

- [ ] **Step 2: Create database engine**

Create `forge/api/db/engine.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from api.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(f"sqlite:///{settings.db_path}", echo=False)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 3: Create models**

Create `forge/api/db/models.py`:
```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from api.db.engine import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    files: Mapped[list["ProjectFile"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    pipelines: Mapped[list["Pipeline"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50))
    path: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    project: Mapped["Project"] = relationship(back_populates="files")


class RegisteredModule(Base):
    __tablename__ = "registered_modules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255))
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int] = mapped_column(Integer)
    platform: Mapped[str] = mapped_column(String(50), default="unknown")
    last_health_check: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="unknown")
    manifest_cache: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    graph: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship(back_populates="pipelines")
    runs: Mapped[list["PipelineRun"]] = relationship(back_populates="pipeline", cascade="all, delete-orphan")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    pipeline_id: Mapped[str] = mapped_column(ForeignKey("pipelines.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    step_results: Mapped[dict] = mapped_column(JSON, default=dict)

    pipeline: Mapped["Pipeline"] = relationship(back_populates="runs")
```

- [ ] **Step 4: Verify models load**

```bash
cd /home/kali/Documents/shell/forge
python -c "from api.db.engine import Base, init_db; from api.db.models import *; init_db(); print('DB created OK')"
```

Expected: `DB created OK` and `forge.db` file created.

- [ ] **Step 5: Clean up test db and commit**

```bash
rm -f forge/forge.db
git add forge/api/config.py forge/api/db/ forge/api/requirements.txt
git commit -m "feat: add config and database models"
```

---

## Task 3: Backend — Auth (JWT)

**Files:**
- Create: `forge/api/auth/jwt.py`
- Create: `forge/api/auth/dependencies.py`
- Create: `forge/api/auth/routes.py`

- [ ] **Step 1: Create JWT utilities**

Create `forge/api/auth/jwt.py`:
```python
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
```

- [ ] **Step 2: Create auth dependency**

Create `forge/api/auth/dependencies.py`:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.auth.jwt import verify_token

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    username = verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return username
```

- [ ] **Step 3: Create auth routes**

Create `forge/api/auth/routes.py`:
```python
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
```

- [ ] **Step 4: Create main.py with auth routes**

Create `forge/api/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.db.engine import init_db
from api.auth.routes import router as auth_router

app = FastAPI(title="Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
def on_startup():
    init_db()
```

- [ ] **Step 5: Test auth manually**

```bash
cd /home/kali/Documents/shell/forge
pip install -r api/requirements.txt
uvicorn api.main:app --port 8080 &
sleep 2
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
kill %1
```

Expected: JSON with `{"token":"eyJ...","username":"admin"}`

- [ ] **Step 6: Commit**

```bash
git add forge/api/auth/ forge/api/main.py
git commit -m "feat: add JWT auth with login endpoint"
```

---

## Task 4: Backend — Projects CRUD + File Management

**Files:**
- Create: `forge/api/projects/schemas.py`
- Create: `forge/api/projects/routes.py`
- Modify: `forge/api/main.py` (add router)

- [ ] **Step 1: Create project schemas**

Create `forge/api/projects/schemas.py`:
```python
from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectFileOut(BaseModel):
    id: str
    filename: str
    file_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    files: list[ProjectFileOut] = []

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    file_count: int = 0

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Create project routes**

Create `forge/api/projects/routes.py`:
```python
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from api.db.engine import get_db
from api.db.models import Project, ProjectFile
from api.auth.dependencies import get_current_user
from api.projects.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectListOut
from api.config import settings

router = APIRouter(prefix="/api/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


def _project_dir(project_id: str) -> Path:
    return Path(settings.storage_path) / "projects" / project_id


@router.get("", response_model=list[ProjectListOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        result.append(ProjectListOut(
            id=p.id, name=p.name, description=p.description,
            created_at=p.created_at, file_count=len(p.files)
        ))
    return result


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=body.name, description=body.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    base = _project_dir(project.id)
    (base / "uploads").mkdir(parents=True, exist_ok=True)
    (base / "outputs").mkdir(parents=True, exist_ok=True)
    (base / "temp").mkdir(parents=True, exist_ok=True)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    base = _project_dir(project_id)
    if base.exists():
        shutil.rmtree(base)
    db.delete(project)
    db.commit()


@router.post("/{project_id}/files", response_model=dict)
def upload_file(project_id: str, file_type: str = "shellcode", file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    dest_dir = _project_dir(project_id) / "uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / file.filename
    with open(dest, "wb") as f:
        f.write(file.file.read())
    pf = ProjectFile(
        project_id=project_id,
        filename=file.filename,
        file_type=file_type,
        path=str(dest),
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return {"id": pf.id, "filename": pf.filename}


@router.get("/{project_id}/files/{file_id}/download")
def download_file(project_id: str, file_id: str, db: Session = Depends(get_db)):
    pf = db.get(ProjectFile, file_id)
    if not pf or pf.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(pf.path, filename=pf.filename)


@router.delete("/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(project_id: str, file_id: str, db: Session = Depends(get_db)):
    pf = db.get(ProjectFile, file_id)
    if not pf or pf.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")
    p = Path(pf.path)
    if p.exists():
        p.unlink()
    db.delete(pf)
    db.commit()
```

- [ ] **Step 3: Register router in main.py**

Add to `forge/api/main.py` after auth_router import:
```python
from api.projects.routes import router as projects_router
```

Add after `app.include_router(auth_router)`:
```python
app.include_router(projects_router)
```

- [ ] **Step 4: Test projects API**

```bash
cd /home/kali/Documents/shell/forge
uvicorn api.main:app --port 8080 &
sleep 2
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Op","description":"test"}'
curl -s http://localhost:8080/api/projects -H "Authorization: Bearer $TOKEN"
kill %1
```

Expected: project created and listed.

- [ ] **Step 5: Commit**

```bash
git add forge/api/projects/ forge/api/main.py
git commit -m "feat: add projects CRUD with file upload/download"
```

---

## Task 5: Backend — Module Registry

**Files:**
- Create: `forge/api/modules/schemas.py`
- Create: `forge/api/modules/routes.py`
- Modify: `forge/api/main.py` (add router)

- [ ] **Step 1: Create module schemas**

Create `forge/api/modules/schemas.py`:
```python
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
```

- [ ] **Step 2: Create module routes**

Create `forge/api/modules/routes.py`:
```python
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
```

- [ ] **Step 3: Register router in main.py**

Add to `forge/api/main.py`:
```python
from api.modules.routes import router as modules_router
```
```python
app.include_router(modules_router)
```

- [ ] **Step 4: Commit**

```bash
git add forge/api/modules/ forge/api/main.py
git commit -m "feat: add module registry with manifest fetch and health check"
```

---

## Task 6: Backend — Pipelines CRUD + Execution Engine

**Files:**
- Create: `forge/api/pipelines/schemas.py`
- Create: `forge/api/pipelines/routes.py`
- Create: `forge/api/pipelines/engine.py`
- Modify: `forge/api/main.py` (add router)

- [ ] **Step 1: Create pipeline schemas**

Create `forge/api/pipelines/schemas.py`:
```python
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
```

- [ ] **Step 2: Create pipeline execution engine**

Create `forge/api/pipelines/engine.py`:
```python
import httpx
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from api.db.models import Pipeline, PipelineRun, RegisteredModule, ProjectFile
from api.config import settings


def _project_dir(project_id: str) -> Path:
    return Path(settings.storage_path) / "projects" / project_id


async def execute_pipeline(pipeline: Pipeline, db: Session) -> PipelineRun:
    run = PipelineRun(
        pipeline_id=pipeline.id,
        status="running",
        started_at=datetime.now(timezone.utc),
        step_results={},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    graph = pipeline.graph
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    edge_map = {}
    for edge in edges:
        edge_map[edge["target"]] = edge["source"]

    execution_order = _topological_sort(nodes, edges)

    node_outputs: dict[str, str] = {}
    step_results: dict[str, dict] = {}

    try:
        for node_id in execution_order:
            node = next(n for n in nodes if n["id"] == node_id)
            node_data = node.get("data", {})
            module_id = node_data.get("module_id")
            function_name = node_data.get("function")
            params = node_data.get("params", {})

            module = db.get(RegisteredModule, module_id)
            if not module:
                raise ValueError(f"Module {module_id} not found")

            file_params = {}
            for key, value in list(params.items()):
                if isinstance(value, str) and value.startswith("file:"):
                    file_id = value.replace("file:", "")
                    pf = db.get(ProjectFile, file_id)
                    if pf:
                        file_params[key] = pf.path
                    del params[key]
                elif isinstance(value, str) and value.startswith("prev:"):
                    source_node = value.replace("prev:", "")
                    if source_node in node_outputs:
                        file_params[key] = node_outputs[source_node]
                    del params[key]

            source_node_id = edge_map.get(node_id)
            if source_node_id and source_node_id in node_outputs:
                file_param_names = _get_file_param_names(module.manifest_cache, function_name)
                for fp_name in file_param_names:
                    if fp_name not in file_params:
                        file_params[fp_name] = node_outputs[source_node_id]
                        break

            output_path = await _call_module(module, function_name, params, file_params, pipeline.project_id)
            node_outputs[node_id] = output_path

            step_results[node_id] = {
                "status": "completed",
                "output_path": output_path,
                "module": module.name,
                "function": function_name,
            }

        final_node_id = execution_order[-1]
        if final_node_id in node_outputs:
            temp_path = Path(node_outputs[final_node_id])
            output_dir = _project_dir(pipeline.project_id) / "outputs"
            output_dir.mkdir(parents=True, exist_ok=True)
            final_path = output_dir / temp_path.name
            temp_path.rename(final_path)
            step_results[final_node_id]["output_path"] = str(final_path)

            pf = ProjectFile(
                project_id=pipeline.project_id,
                filename=final_path.name,
                file_type="output",
                path=str(final_path),
            )
            db.add(pf)

        run.status = "completed"
        run.step_results = step_results
        run.finished_at = datetime.now(timezone.utc)

    except Exception as e:
        run.status = "failed"
        step_results["error"] = str(e)
        run.step_results = step_results
        run.finished_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(run)
    return run


def _get_file_param_names(manifest: dict | None, function_name: str) -> list[str]:
    if not manifest:
        return []
    for fn in manifest.get("functions", []):
        if fn["name"] == function_name:
            return [p["name"] for p in fn.get("params", []) if p.get("type") == "file"]
    return []


async def _call_module(module: RegisteredModule, function_name: str, params: dict, file_params: dict[str, str], project_id: str) -> str:
    url = f"http://{module.host}:{module.port}/execute"

    async with httpx.AsyncClient(timeout=120.0) as client:
        files_payload = {}
        for key, path in file_params.items():
            files_payload[key] = (Path(path).name, open(path, "rb"), "application/octet-stream")

        import json
        data = {
            "function": function_name,
            "params": json.dumps(params),
        }

        resp = await client.post(url, data=data, files=files_payload)
        resp.raise_for_status()

        for fobj in files_payload.values():
            fobj[1].close()

        temp_dir = _project_dir(project_id) / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)

        content_disposition = resp.headers.get("content-disposition", "")
        if "filename=" in content_disposition:
            filename = content_disposition.split("filename=")[-1].strip('"')
        else:
            filename = f"{function_name}_output.bin"

        output_path = temp_dir / filename
        with open(output_path, "wb") as f:
            f.write(resp.content)

        return str(output_path)


def _topological_sort(nodes: list[dict], edges: list[dict]) -> list[str]:
    node_ids = [n["id"] for n in nodes]
    in_degree = {nid: 0 for nid in node_ids}
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}

    for edge in edges:
        src, tgt = edge["source"], edge["target"]
        adjacency[src].append(tgt)
        in_degree[tgt] = in_degree.get(tgt, 0) + 1

    queue = [nid for nid in node_ids if in_degree[nid] == 0]
    result = []

    while queue:
        node = queue.pop(0)
        result.append(node)
        for neighbor in adjacency.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result
```

- [ ] **Step 3: Create pipeline routes**

Create `forge/api/pipelines/routes.py`:
```python
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
```

- [ ] **Step 4: Register router in main.py**

Add to `forge/api/main.py`:
```python
from api.pipelines.routes import router as pipelines_router
```
```python
app.include_router(pipelines_router)
```

- [ ] **Step 5: Commit**

```bash
git add forge/api/pipelines/ forge/api/main.py
git commit -m "feat: add pipelines CRUD with sequential execution engine"
```

---

## Task 7: Module SDK

**Files:**
- Create: `forge/module-sdk/forge_module_sdk/param.py`
- Create: `forge/module-sdk/forge_module_sdk/module.py`
- Create: `forge/module-sdk/forge_module_sdk/__init__.py`
- Create: `forge/module-sdk/setup.py`

- [ ] **Step 1: Create Param dataclass**

Create `forge/module-sdk/forge_module_sdk/param.py`:
```python
from dataclasses import dataclass, field


@dataclass
class Param:
    name: str
    type: str = "string"
    required: bool = False
    description: str = ""
    options: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "type": self.type,
            "required": self.required,
            "description": self.description,
        }
        if self.options:
            d["options"] = self.options
        return d
```

- [ ] **Step 2: Create ForgeModule class**

Create `forge/module-sdk/forge_module_sdk/module.py`:
```python
import json
import time
import tempfile
from pathlib import Path
from functools import wraps
from flask import Flask, jsonify, request, send_file
from forge_module_sdk.param import Param


class ForgeModule:
    def __init__(self, name: str, version: str, platform: str, description: str = ""):
        self.name = name
        self.version = version
        self.platform = platform
        self.description = description
        self._functions: list[dict] = []
        self._handlers: dict[str, callable] = {}
        self._start_time = time.time()
        self._app = Flask(name)
        self._setup_routes()

    def function(self, name: str, description: str, params: list[Param], returns: dict):
        def decorator(fn):
            self._functions.append({
                "name": name,
                "description": description,
                "params": [p.to_dict() for p in params],
                "returns": returns,
            })
            self._handlers[name] = fn

            @wraps(fn)
            def wrapper(*args, **kwargs):
                return fn(*args, **kwargs)
            return wrapper
        return decorator

    def _setup_routes(self):
        @self._app.route("/manifest", methods=["GET"])
        def manifest():
            return jsonify({
                "name": self.name,
                "version": self.version,
                "platform": self.platform,
                "description": self.description,
                "functions": self._functions,
            })

        @self._app.route("/health", methods=["GET"])
        def health():
            return jsonify({
                "status": "ok",
                "name": self.name,
                "version": self.version,
                "uptime_seconds": int(time.time() - self._start_time),
            })

        @self._app.route("/execute", methods=["POST"])
        def execute():
            func_name = request.form.get("function")
            if not func_name or func_name not in self._handlers:
                return jsonify({"error": f"Unknown function: {func_name}"}), 400

            params_json = request.form.get("params", "{}")
            try:
                params = json.loads(params_json)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid params JSON"}), 400

            func_def = next((f for f in self._functions if f["name"] == func_name), None)
            file_param_names = [p["name"] for p in func_def["params"] if p["type"] == "file"] if func_def else []

            kwargs = dict(params)
            for fp_name in file_param_names:
                if fp_name in request.files:
                    uploaded = request.files[fp_name]
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded.filename}")
                    uploaded.save(tmp.name)
                    kwargs[fp_name] = tmp.name

            try:
                result_path = self._handlers[func_name](**kwargs)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

            if result_path and Path(result_path).exists():
                return send_file(result_path, as_attachment=True, download_name=Path(result_path).name)
            else:
                return jsonify({"error": "Handler did not return a valid file path"}), 500

    def run(self, host: str = "0.0.0.0", port: int = 5000):
        self._app.run(host=host, port=port)
```

- [ ] **Step 3: Update __init__.py exports**

Create `forge/module-sdk/forge_module_sdk/__init__.py`:
```python
from forge_module_sdk.module import ForgeModule
from forge_module_sdk.param import Param

__all__ = ["ForgeModule", "Param"]
```

- [ ] **Step 4: Create setup.py**

Create `forge/module-sdk/setup.py`:
```python
from setuptools import setup, find_packages

setup(
    name="forge-module-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=["flask>=3.1.0"],
    python_requires=">=3.10",
)
```

- [ ] **Step 5: Commit**

```bash
git add forge/module-sdk/
git commit -m "feat: add module SDK with ForgeModule, Param, manifest/health/execute"
```

---

## Task 8: Example Echo Module (for testing)

**Files:**
- Create: `forge/modules/echo-module/main.py`
- Create: `forge/modules/echo-module/requirements.txt`

- [ ] **Step 1: Create echo module**

Create `forge/modules/echo-module/main.py`:
```python
import sys
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "module-sdk"))

from forge_module_sdk import ForgeModule, Param

module = ForgeModule(
    name="echo-module",
    version="1.0",
    platform="linux",
    description="Test module that echoes input files with optional renaming",
)


@module.function(
    name="echo_file",
    description="Returns the input file, optionally renamed",
    params=[
        Param("input_file", type="file", required=True, description="File to echo back"),
        Param("output_name", type="string", required=True, description="Output filename"),
    ],
    returns={"type": "file", "description": "The echoed file"},
)
def echo_file(input_file: str, output_name: str) -> str:
    input_path = Path(input_file)
    output_path = input_path.parent / output_name
    shutil.copy2(input_path, output_path)
    return str(output_path)


@module.function(
    name="append_bytes",
    description="Appends a marker to the file",
    params=[
        Param("input_file", type="file", required=True, description="File to modify"),
        Param("marker", type="string", required=False, description="Marker text to append"),
    ],
    returns={"type": "file", "description": "Modified file"},
)
def append_bytes(input_file: str, marker: str = "FORGED") -> str:
    input_path = Path(input_file)
    output_path = input_path.parent / f"marked_{input_path.name}"
    with open(input_path, "rb") as src, open(output_path, "wb") as dst:
        dst.write(src.read())
        dst.write(marker.encode())
    return str(output_path)


if __name__ == "__main__":
    module.run(host="0.0.0.0", port=5050)
```

- [ ] **Step 2: Create requirements.txt**

Create `forge/modules/echo-module/requirements.txt`:
```
flask>=3.1.0
```

- [ ] **Step 3: Test echo module standalone**

```bash
cd /home/kali/Documents/shell/forge
pip install flask
python modules/echo-module/main.py &
sleep 2
curl -s http://localhost:5050/manifest | python3 -m json.tool
curl -s http://localhost:5050/health | python3 -m json.tool
kill %1
```

Expected: manifest shows 2 functions (echo_file, append_bytes), health shows status "ok".

- [ ] **Step 4: Commit**

```bash
git add forge/modules/echo-module/
git commit -m "feat: add echo module for integration testing"
```

---

## Task 9: Frontend — Project Setup + Auth

**Files:**
- Create: `forge/dashboard/index.html`
- Create: `forge/dashboard/tsconfig.json`
- Create: `forge/dashboard/vite.config.ts`
- Create: `forge/dashboard/src/main.tsx`
- Create: `forge/dashboard/src/App.tsx`
- Create: `forge/dashboard/src/api/client.ts`
- Create: `forge/dashboard/src/auth/AuthProvider.tsx`
- Create: `forge/dashboard/src/auth/LoginPage.tsx`

- [ ] **Step 1: Create index.html**

Create `forge/dashboard/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Forge</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create tsconfig.json**

Create `forge/dashboard/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `forge/dashboard/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

- [ ] **Step 4: Create API client**

Create `forge/dashboard/src/api/client.ts`:
```typescript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('forge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('forge_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 5: Create AuthProvider**

Create `forge/dashboard/src/auth/AuthProvider.tsx`:
```tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('forge_token')
  );

  const login = (newToken: string) => {
    localStorage.setItem('forge_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('forge_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Create LoginPage**

Create `forge/dashboard/src/auth/LoginPage.tsx`:
```tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import api from '../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#0f0f0f',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
        width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <h1 style={{ color: '#ff4444', textAlign: 'center', fontSize: '1.5rem' }}>
          FORGE
        </h1>
        {error && <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</div>}
        <input
          type="text" placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '0.6rem', background: '#2a2a2a', border: '1px solid #333',
            borderRadius: '4px', color: '#e0e0e0', fontSize: '1rem',
          }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: '0.6rem', background: '#2a2a2a', border: '1px solid #333',
            borderRadius: '4px', color: '#e0e0e0', fontSize: '1rem',
          }}
        />
        <button type="submit" style={{
          padding: '0.6rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', fontSize: '1rem', cursor: 'pointer',
        }}>
          Login
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Create App.tsx and main.tsx**

Create `forge/dashboard/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth/AuthProvider';
import LoginPage from './auth/LoginPage';
import AppLayout from './layout/AppLayout';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

Create `forge/dashboard/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Create AppLayout (placeholder)**

Create `forge/dashboard/src/layout/AppLayout.tsx`:
```tsx
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const navItems = [
  { path: '/projects', label: 'Projects' },
  { path: '/modules', label: 'Modules' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{
        width: '200px', background: '#1a1a1a', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        borderRight: '1px solid #333',
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>FORGE</h2>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              color: location.pathname.startsWith(item.path) ? '#ff4444' : '#888',
              textDecoration: 'none', padding: '0.5rem',
              borderRadius: '4px',
              background: location.pathname.startsWith(item.path) ? '#2a2a2a' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{
            padding: '0.5rem', background: 'transparent', border: '1px solid #333',
            borderRadius: '4px', color: '#888', cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<div>Select a section from the sidebar.</div>} />
          <Route path="/projects" element={<div>Projects (next task)</div>} />
          <Route path="/modules" element={<div>Modules (next task)</div>} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 9: Install dependencies and test**

```bash
cd /home/kali/Documents/shell/forge/dashboard
npm install
npm run dev &
sleep 3
echo "Frontend running at http://localhost:3000"
kill %1
```

- [ ] **Step 10: Commit**

```bash
git add forge/dashboard/
git commit -m "feat: add frontend scaffolding with auth, routing, dark theme"
```

---

## Task 10: Frontend — Project Management Pages

**Files:**
- Create: `forge/dashboard/src/projects/ProjectListPage.tsx`
- Create: `forge/dashboard/src/projects/ProjectDetailPage.tsx`
- Create: `forge/dashboard/src/projects/FileUpload.tsx`
- Modify: `forge/dashboard/src/layout/AppLayout.tsx` (add routes)

- [ ] **Step 1: Create ProjectListPage**

Create `forge/dashboard/src/projects/ProjectListPage.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  file_count: number;
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    const res = await api.get('/projects');
    setProjects(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/projects', { name, description });
    setName('');
    setDescription('');
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/projects/${id}`);
    load();
  };

  const inputStyle = {
    padding: '0.5rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.9rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Projects</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={{
          padding: '0.5rem 1rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
        }}>
          Create
        </button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projects.map((p) => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '6px',
            border: '1px solid #333',
          }}>
            <Link to={`/projects/${p.id}`} style={{ color: '#e0e0e0', textDecoration: 'none', flex: 1 }}>
              <strong>{p.name}</strong>
              <span style={{ color: '#666', marginLeft: '1rem' }}>{p.description}</span>
              <span style={{ color: '#555', marginLeft: '1rem', fontSize: '0.8rem' }}>{p.file_count} files</span>
            </Link>
            <button onClick={() => handleDelete(p.id)} style={{
              padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #ff4444',
              borderRadius: '4px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem',
            }}>
              Delete
            </button>
          </div>
        ))}
        {projects.length === 0 && <div style={{ color: '#555' }}>No projects yet.</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FileUpload component**

Create `forge/dashboard/src/projects/FileUpload.tsx`:
```tsx
import { useRef } from 'react';
import api from '../api/client';

interface Props {
  projectId: string;
  onUploaded: () => void;
}

export default function FileUpload({ projectId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const files = inputRef.current?.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      form.append('file_type', 'shellcode');
      await api.post(`/projects/${projectId}/files`, form);
    }
    if (inputRef.current) inputRef.current.value = '';
    onUploaded();
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input ref={inputRef} type="file" multiple style={{ color: '#888' }} />
      <button onClick={handleUpload} style={{
        padding: '0.4rem 0.8rem', background: '#333', border: '1px solid #555',
        borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer',
      }}>
        Upload
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create ProjectDetailPage**

Create `forge/dashboard/src/projects/ProjectDetailPage.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import FileUpload from './FileUpload';

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
}

interface PipelineSummary {
  id: string;
  name: string;
  created_at: string;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [newPipelineName, setNewPipelineName] = useState('');

  const load = async () => {
    const [projRes, pipRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/pipelines?project_id=${projectId}`),
    ]);
    setProject(projRes.data);
    setPipelines(pipRes.data);
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDeleteFile = async (fileId: string) => {
    await api.delete(`/projects/${projectId}/files/${fileId}`);
    load();
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    const res = await api.get(`/projects/${projectId}/files/${fileId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    await api.post('/pipelines', { name: newPipelineName, project_id: projectId, graph: { nodes: [], edges: [] } });
    setNewPipelineName('');
    load();
  };

  if (!project) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/projects" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
        &larr; Back to Projects
      </Link>
      <h2 style={{ margin: '0.5rem 0' }}>{project.name}</h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>{project.description}</p>

      <h3 style={{ marginBottom: '0.5rem' }}>Files</h3>
      <FileUpload projectId={project.id} onUploaded={load} />
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {project.files.map((f) => (
          <div key={f.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.5rem 0.75rem', background: '#1a1a1a', borderRadius: '4px',
          }}>
            <span>
              <span style={{ color: f.file_type === 'output' ? '#44ff44' : '#e0e0e0' }}>{f.filename}</span>
              <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.8rem' }}>[{f.file_type}]</span>
            </span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={() => handleDownloadFile(f.id, f.filename)}
                style={{ padding: '0.2rem 0.5rem', background: '#333', border: 'none', borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem' }}>
                Download
              </button>
              <button onClick={() => handleDeleteFile(f.id)}
                style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ff4444', borderRadius: '3px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: '1.5rem 0 0.5rem' }}>Pipelines</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          placeholder="Pipeline name" value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          style={{ padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}
        />
        <button onClick={handleCreatePipeline} style={{
          padding: '0.4rem 0.8rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
        }}>
          New Pipeline
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {pipelines.map((p) => (
          <Link key={p.id} to={`/projects/${projectId}/pipelines/${p.id}`}
            style={{
              display: 'block', padding: '0.5rem 0.75rem', background: '#1a1a1a',
              borderRadius: '4px', color: '#e0e0e0', textDecoration: 'none',
            }}>
            {p.name}
          </Link>
        ))}
        {pipelines.length === 0 && <div style={{ color: '#555' }}>No pipelines yet.</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update AppLayout with routes**

Replace the `<Routes>` section in `forge/dashboard/src/layout/AppLayout.tsx`:

```tsx
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import ProjectListPage from '../projects/ProjectListPage';
import ProjectDetailPage from '../projects/ProjectDetailPage';

const navItems = [
  { path: '/projects', label: 'Projects' },
  { path: '/modules', label: 'Modules' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{
        width: '200px', background: '#1a1a1a', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        borderRight: '1px solid #333',
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>FORGE</h2>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              color: location.pathname.startsWith(item.path) ? '#ff4444' : '#888',
              textDecoration: 'none', padding: '0.5rem',
              borderRadius: '4px',
              background: location.pathname.startsWith(item.path) ? '#2a2a2a' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{
            padding: '0.5rem', background: 'transparent', border: '1px solid #333',
            borderRadius: '4px', color: '#888', cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/modules" element={<div>Modules (next task)</div>} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add forge/dashboard/src/projects/ forge/dashboard/src/layout/AppLayout.tsx
git commit -m "feat: add project list, detail, file upload/download pages"
```

---

## Task 11: Frontend — Module Registry Page

**Files:**
- Create: `forge/dashboard/src/modules/ModuleRegistryPage.tsx`
- Modify: `forge/dashboard/src/layout/AppLayout.tsx` (add route)

- [ ] **Step 1: Create ModuleRegistryPage**

Create `forge/dashboard/src/modules/ModuleRegistryPage.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react';
import api from '../api/client';

interface ModuleFunction {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; options?: string[] }[];
}

interface Module {
  id: string;
  name: string;
  host: string;
  port: number;
  platform: string;
  status: string;
  last_health_check: string | null;
  manifest_cache: { functions?: ModuleFunction[] } | null;
}

export default function ModuleRegistryPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const res = await api.get('/modules');
    setModules(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/modules', { host, port: parseInt(port) });
      setHost('');
      setPort('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register module');
    }
  };

  const handleRefresh = async (id: string) => {
    await api.post(`/modules/${id}/refresh`);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/modules/${id}`);
    load();
  };

  const inputStyle = {
    padding: '0.5rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.9rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Modules</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input placeholder="Host (IP)" value={host} onChange={(e) => setHost(e.target.value)} style={inputStyle} />
        <input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: '100px' }} />
        <button type="submit" style={{
          padding: '0.5rem 1rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
        }}>
          Register
        </button>
      </form>
      {error && <div style={{ color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {modules.map((m) => (
          <div key={m.id} style={{
            padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '6px',
            border: '1px solid #333',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                <strong>{m.name}</strong>
                <span style={{ color: '#555', marginLeft: '0.5rem' }}>{m.host}:{m.port}</span>
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.8rem',
                  color: m.status === 'online' ? '#44ff44' : '#ff4444',
                }}>
                  [{m.status}]
                </span>
                <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{m.platform}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => handleRefresh(m.id)}
                  style={{ padding: '0.2rem 0.5rem', background: '#333', border: 'none', borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Refresh
                </button>
                <button onClick={() => handleDelete(m.id)}
                  style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ff4444', borderRadius: '3px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Remove
                </button>
              </div>
            </div>
            {expanded === m.id && m.manifest_cache?.functions && (
              <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Functions:</div>
                {m.manifest_cache.functions.map((fn) => (
                  <div key={fn.name} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ color: '#ff8844' }}>{fn.name}</div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>{fn.description}</div>
                    <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Params: {fn.params.map((p) => `${p.name}(${p.type}${p.required ? '*' : ''})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {modules.length === 0 && <div style={{ color: '#555' }}>No modules registered.</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AppLayout route**

In `forge/dashboard/src/layout/AppLayout.tsx`, add import:
```tsx
import ModuleRegistryPage from '../modules/ModuleRegistryPage';
```

Replace the modules route:
```tsx
<Route path="/modules" element={<ModuleRegistryPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add forge/dashboard/src/modules/ forge/dashboard/src/layout/AppLayout.tsx
git commit -m "feat: add module registry page with register, refresh, manifest view"
```

---

## Task 12: Frontend — Pipeline Editor with ReactFlow

**Files:**
- Create: `forge/dashboard/src/pipelines/PipelineEditorPage.tsx`
- Create: `forge/dashboard/src/pipelines/nodes/ModuleNode.tsx`
- Create: `forge/dashboard/src/pipelines/NodeConfigPanel.tsx`
- Create: `forge/dashboard/src/pipelines/PipelineToolbar.tsx`
- Modify: `forge/dashboard/src/layout/AppLayout.tsx` (add route)

- [ ] **Step 1: Create ModuleNode component**

Create `forge/dashboard/src/pipelines/nodes/ModuleNode.tsx`:
```tsx
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ModuleNodeData {
  label: string;
  module_id: string;
  module_name: string;
  function: string;
  params: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'error';
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  pending: '#555',
  running: '#ffaa00',
  completed: '#44ff44',
  error: '#ff4444',
};

export default function ModuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ModuleNodeData;
  const borderColor = selected ? '#ff4444' : '#333';
  const statusColor = statusColors[nodeData.status || 'pending'] || '#555';

  return (
    <div style={{
      padding: '0.5rem 0.75rem', background: '#1a1a1a', border: `2px solid ${borderColor}`,
      borderRadius: '8px', minWidth: '180px',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff4444' }} />
      <div style={{ fontSize: '0.75rem', color: '#888' }}>{nodeData.module_name}</div>
      <div style={{ fontSize: '0.9rem', color: '#e0e0e0', fontWeight: 'bold' }}>{nodeData.function || 'Select function'}</div>
      <div style={{ fontSize: '0.7rem', color: statusColor, marginTop: '0.2rem' }}>
        {nodeData.status || 'pending'}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#ff4444' }} />
    </div>
  );
}
```

- [ ] **Step 2: Create NodeConfigPanel**

Create `forge/dashboard/src/pipelines/NodeConfigPanel.tsx`:
```tsx
import { useEffect, useState } from 'react';
import api from '../api/client';

interface ModuleFunction {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; options?: string[]; description?: string }[];
}

interface Module {
  id: string;
  name: string;
  manifest_cache: { functions?: ModuleFunction[] } | null;
}

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
}

interface Props {
  nodeData: Record<string, any>;
  projectId: string;
  onUpdate: (data: Record<string, any>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ nodeData, projectId, onUpdate, onClose }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
    api.get(`/projects/${projectId}`).then((r) => setFiles(r.data.files || []));
  }, [projectId]);

  const selectedModule = modules.find((m) => m.id === nodeData.module_id);
  const functions = selectedModule?.manifest_cache?.functions || [];
  const selectedFn = functions.find((f) => f.name === nodeData.function);

  const handleChange = (key: string, value: any) => {
    onUpdate({ ...nodeData, [key]: value });
  };

  const handleParamChange = (paramName: string, value: string) => {
    const params = { ...(nodeData.params || {}), [paramName]: value };
    onUpdate({ ...nodeData, params });
  };

  const inputStyle = {
    padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem', width: '100%',
  };

  return (
    <div style={{
      width: '300px', background: '#1a1a1a', borderLeft: '1px solid #333',
      padding: '1rem', overflow: 'auto', height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem' }}>Node Config</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>X</button>
      </div>

      <label style={{ color: '#888', fontSize: '0.8rem' }}>Module</label>
      <select
        value={nodeData.module_id || ''}
        onChange={(e) => handleChange('module_id', e.target.value)}
        style={{ ...inputStyle, marginBottom: '0.75rem' }}
      >
        <option value="">Select module</option>
        {modules.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.host}:{m.port})</option>)}
      </select>

      {selectedModule && (
        <>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>Function</label>
          <select
            value={nodeData.function || ''}
            onChange={(e) => {
              const fn = functions.find((f) => f.name === e.target.value);
              handleChange('function', e.target.value);
              handleChange('module_name', selectedModule.name);
              handleChange('label', `${selectedModule.name}: ${e.target.value}`);
              if (fn) handleChange('params', {});
            }}
            style={{ ...inputStyle, marginBottom: '0.75rem' }}
          >
            <option value="">Select function</option>
            {functions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </>
      )}

      {selectedFn && selectedFn.params.map((p) => (
        <div key={p.name} style={{ marginBottom: '0.5rem' }}>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            {p.name} ({p.type}){p.required && ' *'}
          </label>
          {p.type === 'enum' && p.options ? (
            <select
              value={nodeData.params?.[p.name] || ''}
              onChange={(e) => handleParamChange(p.name, e.target.value)}
              style={inputStyle}
            >
              <option value="">Select...</option>
              {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : p.type === 'file' ? (
            <select
              value={nodeData.params?.[p.name] || ''}
              onChange={(e) => handleParamChange(p.name, e.target.value)}
              style={inputStyle}
            >
              <option value="">Select file...</option>
              <option value="prev:auto">From previous node</option>
              {files.map((f) => <option key={f.id} value={`file:${f.id}`}>{f.filename}</option>)}
            </select>
          ) : (
            <input
              value={nodeData.params?.[p.name] || ''}
              onChange={(e) => handleParamChange(p.name, e.target.value)}
              placeholder={p.description || p.name}
              style={inputStyle}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PipelineToolbar**

Create `forge/dashboard/src/pipelines/PipelineToolbar.tsx`:
```tsx
interface Module {
  id: string;
  name: string;
}

interface Props {
  modules: Module[];
  onAddNode: (moduleId: string, moduleName: string) => void;
  onSave: () => void;
  onExecute: () => void;
  executing: boolean;
}

export default function PipelineToolbar({ modules, onAddNode, onSave, onExecute, executing }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem',
      background: '#1a1a1a', borderBottom: '1px solid #333', alignItems: 'center',
    }}>
      <span style={{ color: '#888', fontSize: '0.85rem', marginRight: '0.5rem' }}>Add node:</span>
      {modules.map((m) => (
        <button key={m.id} onClick={() => onAddNode(m.id, m.name)}
          style={{
            padding: '0.3rem 0.6rem', background: '#2a2a2a', border: '1px solid #444',
            borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.8rem',
          }}>
          + {m.name}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onSave} style={{
        padding: '0.3rem 0.8rem', background: '#333', border: '1px solid #555',
        borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer',
      }}>
        Save
      </button>
      <button onClick={onExecute} disabled={executing} style={{
        padding: '0.3rem 0.8rem', background: executing ? '#555' : '#ff4444', border: 'none',
        borderRadius: '4px', color: '#fff', cursor: executing ? 'default' : 'pointer',
      }}>
        {executing ? 'Running...' : 'Execute'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create PipelineEditorPage**

Create `forge/dashboard/src/pipelines/PipelineEditorPage.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  BackgroundVariant,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/client';
import ModuleNode from './nodes/ModuleNode';
import NodeConfigPanel from './NodeConfigPanel';
import PipelineToolbar from './PipelineToolbar';

const nodeTypes: NodeTypes = { moduleNode: ModuleNode };

interface Module {
  id: string;
  name: string;
}

export default function PipelineEditorPage() {
  const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [pipelineName, setPipelineName] = useState('');

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
    api.get(`/pipelines/${pipelineId}`).then((r) => {
      const graph = r.data.graph || { nodes: [], edges: [] };
      setNodes(graph.nodes || []);
      setEdges(graph.edges || []);
      setPipelineName(r.data.name);
    });
  }, [pipelineId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleAddNode = (moduleId: string, moduleName: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'moduleNode',
      position: { x: 100 + nodes.length * 250, y: 150 },
      data: {
        label: moduleName,
        module_id: moduleId,
        module_name: moduleName,
        function: '',
        params: {},
        status: 'pending',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  };

  const handleNodeUpdate = (data: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode ? { ...n, data: { ...n.data, ...data } } : n))
    );
  };

  const handleSave = async () => {
    await api.patch(`/pipelines/${pipelineId}`, {
      graph: { nodes, edges },
    });
  };

  const handleExecute = async () => {
    await handleSave();
    setExecuting(true);
    try {
      const res = await api.post(`/pipelines/${pipelineId}/execute`);
      const run = res.data;
      if (run.step_results) {
        setNodes((nds) =>
          nds.map((n) => {
            const stepResult = run.step_results[n.id];
            if (stepResult) {
              return { ...n, data: { ...n.data, status: stepResult.status } };
            }
            return n;
          })
        );
      }
    } catch (err) {
      console.error('Pipeline execution failed', err);
    } finally {
      setExecuting(false);
    }
  };

  const selected = nodes.find((n) => n.id === selectedNode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Pipeline: </span>
        <span style={{ color: '#e0e0e0' }}>{pipelineName}</span>
      </div>
      <PipelineToolbar
        modules={modules}
        onAddNode={handleAddNode}
        onSave={handleSave}
        onExecute={handleExecute}
        executing={executing}
      />
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#0f0f0f' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#222" />
            <Controls />
          </ReactFlow>
        </div>
        {selected && projectId && (
          <NodeConfigPanel
            nodeData={selected.data as Record<string, any>}
            projectId={projectId}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add pipeline editor route to AppLayout**

In `forge/dashboard/src/layout/AppLayout.tsx`, add import:
```tsx
import PipelineEditorPage from '../pipelines/PipelineEditorPage';
```

Add route inside `<Routes>`:
```tsx
<Route path="/projects/:projectId/pipelines/:pipelineId" element={<PipelineEditorPage />} />
```

- [ ] **Step 6: Commit**

```bash
git add forge/dashboard/src/pipelines/ forge/dashboard/src/layout/AppLayout.tsx
git commit -m "feat: add pipeline editor with ReactFlow, node config, toolbar"
```

---

## Task 13: Docker Deployment

**Files:**
- Create: `forge/Dockerfile`
- Create: `forge/docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

Create `forge/Dockerfile`:
```dockerfile
FROM node:20-slim AS frontend-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install
COPY dashboard/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY --from=frontend-build /app/dashboard/dist ./static
RUN mkdir -p /app/storage

ENV FORGE_STORAGE_PATH=/app/storage
ENV FORGE_DB_PATH=/app/storage/forge.db

EXPOSE 8080

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 2: Update main.py to serve static files**

Add to `forge/api/main.py` after CORS middleware:
```python
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

static_dir = Path(__file__).parent.parent / "static"
```

Add at the end of the file, after all routers:
```python
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(static_dir / "index.html")
```

- [ ] **Step 3: Create docker-compose.yml**

Create `forge/docker-compose.yml`:
```yaml
services:
  forge:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - forge-data:/app/storage
    environment:
      - FORGE_SECRET_KEY=${FORGE_SECRET_KEY:-change-me}
      - FORGE_ADMIN_USER=${FORGE_ADMIN_USER:-admin}
      - FORGE_ADMIN_PASSWORD=${FORGE_ADMIN_PASSWORD:-admin}

volumes:
  forge-data:
```

- [ ] **Step 4: Commit**

```bash
git add forge/Dockerfile forge/docker-compose.yml forge/api/main.py
git commit -m "feat: add Docker deployment with static frontend serving"
```

---

## Task 14: Integration Test — Full Flow

- [ ] **Step 1: Start echo module**

```bash
cd /home/kali/Documents/shell/forge
python modules/echo-module/main.py &
sleep 2
```

- [ ] **Step 2: Start API backend**

```bash
cd /home/kali/Documents/shell/forge
uvicorn api.main:app --port 8080 &
sleep 2
```

- [ ] **Step 3: Start frontend dev server**

```bash
cd /home/kali/Documents/shell/forge/dashboard
npm run dev &
sleep 3
```

- [ ] **Step 4: Test full flow in browser**

Open `http://localhost:3000`:
1. Login with admin/admin
2. Create project "Test"
3. Upload a test file (any small binary)
4. Go to Modules → Register echo module at 127.0.0.1:5050
5. Back to project → Create pipeline "test-pipeline"
6. Open pipeline → Add echo-module node → Configure: select echo_file function, select uploaded file, set output_name
7. Save → Execute
8. Check project files for output

- [ ] **Step 5: Stop all processes**

```bash
kill %1 %2 %3
rm -f forge/forge.db
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: integration test verified, cleanup"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Scaffolding | Directory structure, git init, dependencies |
| 2 | Backend | Config, SQLAlchemy models, SQLite |
| 3 | Backend | JWT auth (login endpoint) |
| 4 | Backend | Projects CRUD, file upload/download |
| 5 | Backend | Module registry (register, refresh, health) |
| 6 | Backend | Pipelines CRUD, sequential execution engine |
| 7 | Module SDK | ForgeModule class, Param, Flask endpoints |
| 8 | Module SDK | Echo module for testing |
| 9 | Frontend | React setup, auth, routing, dark theme |
| 10 | Frontend | Project list, detail, file management |
| 11 | Frontend | Module registry page |
| 12 | Frontend | Pipeline editor (ReactFlow, node config) |
| 13 | Deploy | Dockerfile, docker-compose, static serving |
| 14 | Test | Full integration test |
