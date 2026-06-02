import httpx
import json
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from api.db.models import Pipeline, PipelineRun, RegisteredModule, ProjectFile
from api.config import settings
from api.pipelines.streaming import publish, close_run
from api.pipelines.validator import validate_pipeline


def _project_dir(project_id: str) -> Path:
    return Path(settings.storage_path) / "projects" / project_id


def _is_project_file_node(node_id: str) -> bool:
    return node_id.startswith("file_")


def _topological_sort_modules(nodes: list[dict], edges: list[dict]) -> list[str]:
    module_node_ids = [n["id"] for n in nodes if n.get("type") == "moduleNode"]
    in_degree = {nid: 0 for nid in module_node_ids}
    adjacency: dict[str, list[str]] = {nid: [] for nid in module_node_ids}

    for edge in edges:
        s, t = edge.get("source"), edge.get("target")
        if t in in_degree and s in in_degree:
            adjacency[s].append(t)
            in_degree[t] += 1

    queue = [nid for nid in module_node_ids if in_degree[nid] == 0]
    result = []
    while queue:
        n = queue.pop(0)
        result.append(n)
        for nb in adjacency[n]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                queue.append(nb)
    return result


async def execute_pipeline(pipeline_id: str, run_id: str, db_factory) -> None:
    """Background task. Re-opens DB session, drives the run, publishes events."""
    db: Session = db_factory()
    try:
        pipeline = db.get(Pipeline, pipeline_id)
        run = db.get(PipelineRun, run_id)
        if not pipeline or not run:
            return

        validation = validate_pipeline(pipeline, db)
        if not validation.valid:
            run.status = "failed"
            run.step_results = {"validation_errors": [e.to_dict() for e in validation.errors]}
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            await publish(run_id, {"event": "run_finished", "status": "failed"})
            close_run(run_id)
            return

        graph = pipeline.graph or {}
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        node_by_id = {n["id"]: n for n in nodes}

        input_paths: dict[str, dict[str, str]] = {}
        for edge in edges:
            src = edge.get("source", "")
            if _is_project_file_node(src):
                file_id = src.removeprefix("file_")
                pf = db.get(ProjectFile, file_id)
                if pf:
                    input_paths.setdefault(edge["target"], {})[edge["targetHandle"]] = pf.path

        order = _topological_sort_modules(nodes, edges)
        node_outputs: dict[str, str] = {}
        step_results: dict[str, dict] = {}

        await publish(run_id, {"event": "run_started", "run_id": run_id})

        current_node_id: str | None = None
        try:
            for node_id in order:
                current_node_id = node_id
                node = node_by_id[node_id]
                data = node.get("data", {})
                module_id = data.get("module_id")
                function_name = data.get("function")
                params = dict(data.get("params", {}))

                file_params = dict(input_paths.get(node_id, {}))
                for edge in edges:
                    if edge.get("target") == node_id:
                        src = edge.get("source", "")
                        if not _is_project_file_node(src) and src in node_outputs:
                            file_params[edge["targetHandle"]] = node_outputs[src]

                module = db.get(RegisteredModule, module_id)
                if not module:
                    raise ValueError(f"Module {module_id} not found")

                await publish(run_id, {"event": "node_started", "node_id": node_id})
                output_path = await _call_module(
                    module, function_name, params, file_params, pipeline.project_id
                )
                node_outputs[node_id] = output_path
                step_results[node_id] = {
                    "status": "completed",
                    "output_path": output_path,
                    "module": module.name,
                    "function": function_name,
                }
                await publish(run_id, {
                    "event": "node_completed",
                    "node_id": node_id,
                    "output_path": output_path,
                })

            terminal_nodes = _terminal_module_nodes(order, edges)
            for tnid in terminal_nodes:
                if tnid in node_outputs:
                    temp_path = Path(node_outputs[tnid])
                    output_dir = _project_dir(pipeline.project_id) / "outputs"
                    output_dir.mkdir(parents=True, exist_ok=True)
                    final_path = output_dir / temp_path.name
                    if temp_path.exists():
                        temp_path.rename(final_path)
                    step_results[tnid]["output_path"] = str(final_path)
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
            db.commit()
            await publish(run_id, {"event": "run_finished", "status": "completed"})

        except Exception as e:
            run.status = "failed"
            step_results["error"] = str(e)
            if current_node_id:
                await publish(run_id, {
                    "event": "node_failed",
                    "node_id": current_node_id,
                    "error": str(e),
                })
            run.step_results = step_results
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            await publish(run_id, {"event": "run_finished", "status": "failed"})
    finally:
        close_run(run_id)
        db.close()


def _terminal_module_nodes(order: list[str], edges: list[dict]) -> list[str]:
    has_outgoing = {edge.get("source") for edge in edges if not _is_project_file_node(edge.get("source", ""))}
    return [nid for nid in order if nid not in has_outgoing]


async def _call_module(
    module: RegisteredModule,
    function_name: str,
    params: dict,
    file_params: dict[str, str],
    project_id: str,
) -> str:
    url = f"http://{module.host}:{module.port}/execute"

    async with httpx.AsyncClient(timeout=120.0) as client:
        files_payload = {}
        open_files = []
        for key, path in file_params.items():
            fobj = open(path, "rb")
            open_files.append(fobj)
            files_payload[key] = (Path(path).name, fobj, "application/octet-stream")

        data = {"function": function_name, "params": json.dumps(params)}

        try:
            resp = await client.post(url, data=data, files=files_payload)
            resp.raise_for_status()
        finally:
            for fobj in open_files:
                try:
                    fobj.close()
                except Exception:
                    pass

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
