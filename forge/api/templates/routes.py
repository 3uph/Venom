import copy
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db.engine import get_db
from api.db.models import Pipeline, PipelineTemplate, Project, ProjectFile
from api.auth.dependencies import get_current_user
from api.templates.schemas import (
    TemplateCreate, TemplateUpdate, TemplateOut, SaveAsTemplateBody, InstantiateBody, Placeholder,
)

router = APIRouter(prefix="/api/templates", tags=["templates"], dependencies=[Depends(get_current_user)])
pipeline_extra = APIRouter(prefix="/api/pipelines", tags=["templates"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[TemplateOut])
def list_templates(tag: str | None = None, db: Session = Depends(get_db)):
    q = db.query(PipelineTemplate).order_by(PipelineTemplate.created_at.desc())
    templates = q.all()
    if tag:
        templates = [t for t in templates if tag in (t.tags or [])]
    return templates


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(body: TemplateCreate, db: Session = Depends(get_db)):
    t = PipelineTemplate(
        name=body.name,
        description=body.description,
        tags=body.tags,
        graph=body.graph,
        placeholders=[p.model_dump() for p in body.placeholders],
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = db.get(PipelineTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


@router.patch("/{template_id}", response_model=TemplateOut)
def update_template(template_id: str, body: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.get(PipelineTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if body.name is not None:
        t.name = body.name
    if body.description is not None:
        t.description = body.description
    if body.tags is not None:
        t.tags = body.tags
    if body.graph is not None:
        t.graph = body.graph
    if body.placeholders is not None:
        t.placeholders = [p.model_dump() for p in body.placeholders]
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    t = db.get(PipelineTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()


@router.post("/{template_id}/instantiate", response_model=dict, status_code=status.HTTP_201_CREATED)
def instantiate_template(template_id: str, body: InstantiateBody, db: Session = Depends(get_db)):
    t = db.get(PipelineTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    project = db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Target project not found")

    placeholders = t.placeholders or []
    ph_ids = {p["id"] for p in placeholders}
    missing = ph_ids - set(body.file_mappings.keys())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing mappings for placeholders: {sorted(missing)}")

    # Verify each mapped file exists in target project
    for ph_id, file_id in body.file_mappings.items():
        pf = db.get(ProjectFile, file_id)
        if not pf or pf.project_id != body.project_id:
            raise HTTPException(
                status_code=400,
                detail=f"File {file_id} not in target project (for placeholder {ph_id})",
            )

    graph = copy.deepcopy(t.graph or {})
    new_nodes = []
    id_remap: dict[str, str] = {}
    for node in graph.get("nodes", []):
        if node.get("type") == "placeholderNode":
            ph_id = node["id"]
            file_id = body.file_mappings.get(ph_id)
            if not file_id:
                continue
            pf = db.get(ProjectFile, file_id)
            new_node_id = f"file_{file_id}"
            id_remap[ph_id] = new_node_id
            new_nodes.append({
                "id": new_node_id,
                "type": "projectFileNode",
                "position": node.get("position", {"x": 0, "y": 0}),
                "data": {"file_id": file_id, "filename": pf.filename if pf else ph_id},
            })
        else:
            new_nodes.append(node)

    new_edges = []
    for edge in graph.get("edges", []):
        new_edge = dict(edge)
        if edge.get("source") in id_remap:
            new_edge["source"] = id_remap[edge["source"]]
        new_edges.append(new_edge)

    new_graph = {"nodes": new_nodes, "edges": new_edges}

    pipeline = Pipeline(
        project_id=body.project_id,
        name=body.name or f"{t.name} (instance)",
        graph=new_graph,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return {"id": pipeline.id, "project_id": pipeline.project_id, "name": pipeline.name}


@pipeline_extra.post("/{pipeline_id}/save_as_template", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def save_pipeline_as_template(pipeline_id: str, body: SaveAsTemplateBody, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    graph = copy.deepcopy(pipeline.graph or {})
    placeholders: list[dict] = []
    id_remap: dict[str, str] = {}
    ph_counter = 0
    new_nodes = []
    for node in graph.get("nodes", []):
        if node.get("type") == "projectFileNode":
            ph_counter += 1
            ph_id = f"ph_{ph_counter}"
            data = node.get("data", {})
            label = data.get("filename") or f"input_{ph_counter}"
            placeholders.append({"id": ph_id, "label": label, "hint": "binary"})
            id_remap[node["id"]] = ph_id
            new_nodes.append({
                "id": ph_id,
                "type": "placeholderNode",
                "position": node.get("position", {"x": 0, "y": 0}),
                "data": {"placeholder_id": ph_id, "label": label, "hint": "binary"},
            })
        else:
            new_nodes.append(node)

    new_edges = []
    for edge in graph.get("edges", []):
        new_edge = dict(edge)
        if edge.get("source") in id_remap:
            new_edge["source"] = id_remap[edge["source"]]
        new_edges.append(new_edge)

    template_graph = {"nodes": new_nodes, "edges": new_edges}

    t = PipelineTemplate(
        name=body.name,
        description=body.description,
        tags=body.tags,
        graph=template_graph,
        placeholders=placeholders,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t
