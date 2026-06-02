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
