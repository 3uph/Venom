# Forge — Phase 2 Implementation Plan

> Reference spec: `docs/superpowers/specs/2026-06-02-forge-phase2-design.md`

## Tasks

### P2-1: Backend validator + streaming primitives
- Add `websockets` to `api/requirements.txt` (uvicorn protocol). Install in venv.
- Create `api/pipelines/streaming.py`: `run_queues: dict[str, asyncio.Queue]`; `async def publish(run_id, event)`; `async def subscribe(run_id) -> AsyncIterator[dict]`; `async def close_run(run_id)`.
- Create `api/pipelines/validator.py`: `validate_pipeline(pipeline, db) -> ValidationResult` checking cycles, missing required file inputs, function-in-manifest, module-exists.
- Update `api/pipelines/schemas.py` with `ValidationError`, `ValidationResult`.

### P2-2: Engine rewrite
- Rewrite `api/pipelines/engine.py`:
  - Pre-validate; if invalid, mark run failed with errors in `step_results`.
  - Build `input_paths[node_id][param_name]` from edges where source is `file_*`.
  - For each module node in topological order, resolve file params from input_paths + upstream `node_outputs` by `targetHandle`. No first-file fallback.
  - Publish `run_started`, `node_started/completed/failed`, `run_finished` events.
- Topological sort treats `file_*` nodes as sources (no dependencies, never executed as modules).

### P2-3: Routes — async execute + validate + WS stream
- `POST /api/pipelines/{id}/execute`: create run record (status=running), schedule `asyncio.create_task(execute_pipeline(...))`, return run immediately.
- `POST /api/pipelines/{id}/validate`: run validator, return result.
- `WebSocket /api/pipelines/{id}/runs/{run_id}/stream?token=<jwt>`: validate token, subscribe to run queue, push events to client until `run_finished` or disconnect.

### P2-4: Echo module annotations (optional/backwards-compat demo)
- Add `name: "output"` to `returns` for both functions.
- Add `produces: "binary"` to returns; `accepts: "binary"` to `input_file` params.

### P2-5: Frontend — ProjectFileNode + FilePalette
- `dashboard/src/pipelines/nodes/ProjectFileNode.tsx`: source-only node, distinct teal color, shows filename.
- `dashboard/src/pipelines/FilePalette.tsx`: lists project files, draggable items emit drag event with `file_id`/`filename` payload.

### P2-6: Frontend — Dynamic-handle ModuleNode
- Rewrite `dashboard/src/pipelines/nodes/ModuleNode.tsx`:
  - Accept `data.manifest_function` (resolved by parent) containing params + returns.
  - Render one `<Handle id={param.name} type="target">` per `file` param. Render output handle `id={returns.name||'output'}`.
  - Color handle by `accepts`/`produces` hint.
  - Show validation error indicator if node has errors in surrounding context.

### P2-7: Frontend — Hooks
- `usePipelineValidation.ts`: debounced POST `/validate`, returns `errors[]`.
- `usePipelineExecution.ts`: opens WS with JWT token, returns `nodeStatuses: Record<string, status>` and `runFinished: bool`, plus `start(pipelineId)` that calls execute then opens WS.

### P2-8: Frontend — ValidationPanel + Toolbar update
- `ValidationPanel.tsx`: collapsible list of validation errors with click-to-focus node.
- `PipelineToolbar.tsx`: Execute button disabled when validation invalid; tooltip shows reason count.
- `NodeConfigPanel.tsx`: hide file params (now wired via edges); only show non-file params (string, enum, etc.).

### P2-9: PipelineEditorPage refactor
- Compose: FilePalette (left), ReactFlow canvas (center), ValidationPanel + NodeConfigPanel (right).
- Drop handler: when item from FilePalette dropped, spawn `projectFileNode` with `id=file_<file_id>`. If a node with that id already exists, focus it (avoid duplicate).
- Resolve `manifest_function` per ModuleNode by lookup in module registry cache.
- Wire validation + execution hooks.

### P2-10: Integration smoke (Phase 2)
- Update headless test in repo (`/tmp/...` script — or document in spec). New flow:
  1. Boot echo + backend; login; create project; upload two files.
  2. Register echo module.
  3. Build pipeline with two nodes wired via handles: fileA → echo_file → append_bytes.
  4. POST /validate → assert valid.
  5. POST /execute → poll `/runs/{run_id}` until terminal status, assert completed.
  6. Open WS for same run_id (or a second run) and capture event sequence.
  7. Assert final marked file appears in project outputs.
  8. Negative: remove edge wiring node B input → /validate returns missing_required_input.

### P2-11: Commit / wrap
- Commit per task with `feat:`/`refactor:` prefix matching content.
