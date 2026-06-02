# Forge — Phase 2 Design: Robust Dashboard + Visual Pipeline Editor

## Context

Phase 1 shipped a working skeleton (backend CRUD + skeleton frontend + sequential engine + echo module). Phase 2 hardens the **dashboard and pipeline editor** so future module work has a stable host. Modules themselves are not built in Phase 2.

The pipeline editor must turn manifest data into editable visual graphs where every `file` parameter of a module function becomes a typed input port, every `returns` becomes a typed output port, and project files appear as drag-and-droppable source nodes. Edges are explicit param-level wires.

This is the foundation for the operator workflow described in the use case:

```
[Shellcode (project file)] ──output──▶ shellcode [c-loader-builder] ──output──▶ payload [html-smuggler] ──▶ output
```

## Goals

1. **Manifest fidelity** — every param/return shown in editor matches what the module's manifest declared.
2. **Typed handles** — entry/exit points map 1:1 to file params and the function return.
3. **Project files as nodes** — operator drags an uploaded file onto canvas, then wires it.
4. **Per-handle edge resolution** — engine routes inputs based on `targetHandle`, not first-file fallback.
5. **Validation before execute** — required inputs wired, no cycles, manifest still valid.
6. **Real-time status streaming** — node colors update while pipeline runs (WebSocket).
7. **Manifest drift detection** — if a registered module's manifest changes and breaks an existing pipeline, surface it clearly.

## Non-Goals (deferred)

- Pipeline templates / cross-project reuse.
- Pipeline run versioning / snapshots.
- Mutation seed convention (lives in module code when modules are built).
- Authentication of modules (Phase 1 assumption: trusted network).
- Parallel branch execution (engine stays sequential per topological order; fan-out at edges is OK because each downstream still runs in order).

## Architecture

### Manifest (backwards-compatible extension)

Existing fields unchanged. Optional additions:

```jsonc
{
  "name": "c-loader-builder",
  "version": "1.0",
  "platform": "linux",
  "functions": [
    {
      "name": "build_loader",
      "params": [
        {
          "name": "shellcode",
          "type": "file",
          "required": true,
          "accepts": "binary"          // optional UI hint
        },
        {
          "name": "technique",
          "type": "enum",
          "options": ["syscall_direct", "ntcreatethread"]
        }
      ],
      "returns": {
        "type": "file",
        "name": "output",              // optional; default "output"
        "produces": "pe_binary"        // optional UI hint
      }
    }
  ]
}
```

`accepts` / `produces` are informational hints. The dashboard uses them to color handles and surface a non-blocking warning when an edge connects `produces=A` to `accepts=B`. Missing hints mean "any file".

### Pipeline Graph Schema

```jsonc
{
  "nodes": [
    {
      "id": "file_<file_uuid>",
      "type": "projectFileNode",
      "position": { "x": 50, "y": 100 },
      "data": { "file_id": "<uuid>", "filename": "havoc.bin" }
    },
    {
      "id": "node_<timestamp>",
      "type": "moduleNode",
      "position": { "x": 350, "y": 100 },
      "data": {
        "module_id": "<uuid>",
        "function": "build_loader",
        "params": { "technique": "syscall_direct" }
      }
    }
  ],
  "edges": [
    {
      "id": "e_<ts>",
      "source": "file_<file_uuid>",
      "sourceHandle": "output",
      "target": "node_<timestamp>",
      "targetHandle": "shellcode"
    }
  ]
}
```

Rules:
- `projectFileNode` IDs use a deterministic `file_<file_uuid>` prefix so the same file can be the source of multiple edges (fan-out).
- `moduleNode.data.params` holds non-file params only. File params are resolved from edges.
- Every edge MUST carry `sourceHandle` and `targetHandle`. The engine no longer guesses.

### Backend

```
api/pipelines/
├── engine.py        # rewritten: per-handle resolution
├── routes.py        # +POST /{id}/validate, +WS /{id}/runs/{run_id}/stream
├── schemas.py       # +ValidationResult, +ValidationError
├── validator.py     # new: cycles, missing inputs, manifest drift
└── streaming.py     # new: per-run asyncio.Queue + pub helpers
```

### Validation

`POST /api/pipelines/{id}/validate` returns:

```json
{
  "valid": false,
  "errors": [
    { "node_id": "node_a", "type": "missing_required_input", "param": "shellcode" },
    { "node_id": "node_b", "type": "function_not_in_manifest", "function": "old_fn" },
    { "type": "cycle_detected", "node_ids": ["node_x", "node_y"] },
    { "node_id": "node_c", "type": "unknown_module", "module_id": "..." }
  ]
}
```

Frontend calls validate on Save and just before Execute. Execute button disabled if `valid=false`.

### Execution Streaming (WebSocket)

`WS /api/pipelines/{id}/runs/{run_id}/stream` — events:

```jsonc
{ "event": "run_started", "run_id": "..." }
{ "event": "node_started",   "node_id": "..." }
{ "event": "node_completed", "node_id": "...", "output_path": "..." }
{ "event": "node_failed",    "node_id": "...", "error": "..." }
{ "event": "run_finished",   "status": "completed" | "failed" }
```

Implementation:
- `streaming.py` keeps `dict[run_id, asyncio.Queue]`. Engine awaits `publish(run_id, event)` after each step.
- WS handler subscribes (creates queue if not present), drains queue to socket until `run_finished` or client disconnect.
- JWT auth via `?token=<jwt>` query param (WS protocols don't carry HTTP auth headers as a standard).
- Run kicked off via `POST /api/pipelines/{id}/execute`. The POST returns the freshly-created `PipelineRun` immediately (`status="running"`, `started_at` set) and the run continues in background via `asyncio.create_task`.
- Clients pick one of: (a) connect to the WS stream for live events, or (b) poll `GET /api/pipelines/{id}/runs/{run_id}` until `status` is `completed` or `failed`. Phase 1 curl smoke pattern (single POST → assert `status=="completed"`) is no longer valid; the new headless smoke uses option (b) with bounded polling.

### Engine (rewrite)

```python
async def execute_pipeline(pipeline, db) -> PipelineRun:
    graph = pipeline.graph
    nodes = graph["nodes"]
    edges = graph["edges"]

    # Pre-validate
    result = validate_pipeline(pipeline, db)
    if not result.valid:
        # Refuse with persisted failed run
        ...

    order = _topological_sort_nodes_only_modules(nodes, edges)

    # Pre-collect file-node feeds
    input_paths: dict[str, dict[str, str]] = {}  # node_id -> {param: path}
    for edge in edges:
        if edge["source"].startswith("file_"):
            file_id = edge["source"].removeprefix("file_")
            pf = db.get(ProjectFile, file_id)
            if pf:
                input_paths.setdefault(edge["target"], {})[edge["targetHandle"]] = pf.path

    node_outputs: dict[str, str] = {}
    await publish(run.id, {"event": "run_started", "run_id": run.id})
    try:
        for node_id in order:
            await publish(run.id, {"event": "node_started", "node_id": node_id})
            node = next(n for n in nodes if n["id"] == node_id)
            module_id = node["data"]["module_id"]
            function_name = node["data"]["function"]
            params = dict(node["data"].get("params", {}))
            file_params = dict(input_paths.get(node_id, {}))

            for edge in edges:
                if edge["target"] == node_id and not edge["source"].startswith("file_"):
                    src = edge["source"]
                    if src in node_outputs:
                        file_params[edge["targetHandle"]] = node_outputs[src]

            module = db.get(RegisteredModule, module_id)
            output_path = await _call_module(module, function_name, params, file_params, pipeline.project_id)
            node_outputs[node_id] = output_path
            await publish(run.id, {"event": "node_completed", "node_id": node_id, "output_path": output_path})
            ...
    except Exception as e:
        await publish(run.id, {"event": "node_failed", "node_id": node_id, "error": str(e)})
        ...
    await publish(run.id, {"event": "run_finished", "status": run.status})
```

### Frontend Components

```
src/pipelines/
├── PipelineEditorPage.tsx        # refactor: includes FilePalette, ValidationPanel, streaming hook
├── PipelineToolbar.tsx           # mod: Execute disabled when validation fails
├── NodeConfigPanel.tsx           # mod: file params hidden (now edges); shows non-file params only
├── FilePalette.tsx               # NEW: vertical list of project files, drag onto canvas
├── ValidationPanel.tsx           # NEW: list of current validation errors
├── usePipelineValidation.ts      # NEW: hook calling /validate
├── usePipelineExecution.ts       # NEW: WS subscription; returns per-node status map
├── nodes/
│   ├── ModuleNode.tsx            # rewrite: dynamic <Handle id=param.name> per file param + return handle(s)
│   └── ProjectFileNode.tsx       # NEW: source-only, distinct color, filename label
```

### Data Flow (Operator's perspective)

1. Operator opens pipeline editor for an existing pipeline.
2. Sidebar `FilePalette` lists project files. Sidebar toolbar lists registered modules.
3. Drag a file from `FilePalette` → spawns a `ProjectFileNode` at drop coordinates.
4. Click a module button → spawns a `ModuleNode`. Operator picks `function` in config panel; node renders handles for each file param + return.
5. Operator drags from output handle to target handle. ReactFlow `Connection` stores `sourceHandle` + `targetHandle`.
6. Validation runs on every change (debounced). `ValidationPanel` shows live errors. Execute button disabled until valid.
7. Execute: POST `/execute`, get `run_id`, open WS, paint nodes as events arrive. On `run_finished` close WS.

## Error Handling

| Failure | Surfaced as |
|---------|-------------|
| Module manifest changed, function removed | Validation error `function_not_in_manifest` + red border on node |
| Required file param not wired | Validation error `missing_required_input` |
| Graph has a cycle | Validation error `cycle_detected` (all involved node_ids) |
| Module unreachable during execute | WS `node_failed` + run.status=failed |
| WS disconnects mid-run | Frontend reconnects with backoff up to 3 retries; if all fail, fall back to polling `/runs/{run_id}` every 2s |
| Manifest refresh fails | Module marked `offline`; pipelines using it surface `unknown_module` validation error until re-registered |

## Testing

Headless integration test (extends Task 14 of Phase 1):

```
1. Boot echo module + backend.
2. Login, create project, upload file_A and file_B.
3. Register echo module.
4. Create pipeline with graph:
     fileA ──output──▶ input_file [echo_module.echo_file (output_name="step1.bin")]
                              ──output──▶ input_file [echo_module.append_bytes (marker="X")]
5. POST /validate — assert valid.
6. POST /execute — open WS, collect events, assert order:
     run_started, node_started(A), node_completed(A),
     node_started(B), node_completed(B), run_finished(completed).
7. Verify project files now include final marked output.
8. Mutation pipeline: change marker to "Y", re-execute, assert different output content.
9. Negative: remove targetHandle wiring for input_file on node B → validate returns missing_required_input.
```

Unit tests for `validator.py` (cycles, missing inputs, drift) using crafted graph dicts.

## Out of Scope

- Drag-and-drop reordering of palette items.
- Multi-select editing of nodes.
- Keyboard shortcuts.
- Internationalization.

## Deliverables

1. Backend: `validator.py`, `streaming.py`, engine rewrite, new routes.
2. Frontend: `ProjectFileNode`, dynamic-handle `ModuleNode`, `FilePalette`, `ValidationPanel`, hooks for validation + WS, refactored `PipelineEditorPage`.
3. Echo module: optional annotation of `returns.name` and `accepts/produces` hints (backwards-compatible; demo data for UI hints).
4. Integration smoke extended to exercise WS + validation.
