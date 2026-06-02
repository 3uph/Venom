import hashlib
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
def list_projects(include_archived: bool = False, db: Session = Depends(get_db)):
    q = db.query(Project)
    if not include_archived:
        q = q.filter(Project.archived == False)  # noqa: E712
    projects = q.order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        result.append(ProjectListOut(
            id=p.id, name=p.name, description=p.description, archived=p.archived,
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
    if body.notes is not None:
        project.notes = body.notes
    if body.archived is not None:
        project.archived = body.archived
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/archive", response_model=ProjectOut)
def archive_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.archived = True
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/restore", response_model=ProjectOut)
def restore_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.archived = False
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
    contents = file.file.read()
    with open(dest, "wb") as f:
        f.write(contents)
    sha256 = hashlib.sha256(contents).hexdigest()
    pf = ProjectFile(
        project_id=project_id,
        filename=file.filename,
        file_type=file_type,
        path=str(dest),
        sha256=sha256,
        size_bytes=len(contents),
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return {"id": pf.id, "filename": pf.filename, "sha256": sha256, "size_bytes": pf.size_bytes}


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
