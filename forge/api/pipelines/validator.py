from dataclasses import dataclass, field, asdict
from sqlalchemy.orm import Session
from api.db.models import Pipeline, RegisteredModule


@dataclass
class ValidationError:
    type: str
    node_id: str | None = None
    param: str | None = None
    function: str | None = None
    module_id: str | None = None
    node_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: v for k, v in d.items() if v not in (None, [])}


@dataclass
class ValidationResult:
    valid: bool
    errors: list[ValidationError]

    def to_dict(self) -> dict:
        return {"valid": self.valid, "errors": [e.to_dict() for e in self.errors]}


def _file_param_names(manifest: dict | None, function_name: str) -> tuple[list[str], list[str]]:
    """Returns (required_file_params, all_file_params)."""
    if not manifest:
        return [], []
    for fn in manifest.get("functions", []):
        if fn["name"] == function_name:
            file_params = [p for p in fn.get("params", []) if p.get("type") == "file"]
            required = [p["name"] for p in file_params if p.get("required")]
            all_ = [p["name"] for p in file_params]
            return required, all_
    return [], []


def _function_exists(manifest: dict | None, function_name: str) -> bool:
    if not manifest:
        return False
    return any(fn["name"] == function_name for fn in manifest.get("functions", []))


def _detect_cycle(nodes: list[dict], edges: list[dict]) -> list[str]:
    node_ids = [n["id"] for n in nodes]
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    in_degree: dict[str, int] = {nid: 0 for nid in node_ids}
    for edge in edges:
        s, t = edge.get("source"), edge.get("target")
        if s in adjacency and t in in_degree:
            adjacency[s].append(t)
            in_degree[t] += 1

    queue = [nid for nid in node_ids if in_degree[nid] == 0]
    visited = 0
    while queue:
        n = queue.pop(0)
        visited += 1
        for nb in adjacency[n]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                queue.append(nb)
    if visited == len(node_ids):
        return []
    return [nid for nid, deg in in_degree.items() if deg > 0]


def validate_pipeline(pipeline: Pipeline, db: Session) -> ValidationResult:
    graph = pipeline.graph or {}
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    errors: list[ValidationError] = []

    cycle = _detect_cycle(nodes, edges)
    if cycle:
        errors.append(ValidationError(type="cycle_detected", node_ids=cycle))

    incoming: dict[str, dict[str, str]] = {}
    for edge in edges:
        tgt = edge.get("target")
        handle = edge.get("targetHandle")
        if tgt and handle:
            incoming.setdefault(tgt, {})[handle] = edge.get("source", "")

    for node in nodes:
        node_type = node.get("type")
        if node_type != "moduleNode":
            continue
        nid = node["id"]
        data = node.get("data", {})
        module_id = data.get("module_id")
        function_name = data.get("function")

        if not module_id:
            errors.append(ValidationError(type="unknown_module", node_id=nid))
            continue
        module = db.get(RegisteredModule, module_id)
        if not module:
            errors.append(ValidationError(type="unknown_module", node_id=nid, module_id=module_id))
            continue
        if not function_name:
            errors.append(ValidationError(type="function_not_set", node_id=nid))
            continue
        if not _function_exists(module.manifest_cache, function_name):
            errors.append(ValidationError(
                type="function_not_in_manifest", node_id=nid, function=function_name
            ))
            continue

        required, _all = _file_param_names(module.manifest_cache, function_name)
        wired = incoming.get(nid, {})
        for req in required:
            if req not in wired:
                errors.append(ValidationError(
                    type="missing_required_input", node_id=nid, param=req
                ))

    return ValidationResult(valid=len(errors) == 0, errors=errors)
