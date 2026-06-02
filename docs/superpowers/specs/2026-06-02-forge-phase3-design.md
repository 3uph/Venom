# Forge — Phase 3 Design: Templates + Dashboard Productivity

## Context

Phase 2 hardened the pipeline editor. Phase 3 extends the dashboard with reusable workflows (Tier 1 — templates / payload DB) and operator productivity features (Tier 2 — run history, duplicate/clone, module categories, auto-health, file metadata, project archive/notes, editor enhancements). Modules still not in scope.

## Tier 1 — Pipeline Templates

A **template** is a pipeline graph with concrete `projectFileNode` references replaced by typed **placeholders**. Templates live in a global table, independent of any project. Operators instantiate a template into a project by mapping each placeholder to a file in that project.

### Data model

```
PipelineTemplate
  id           uuid
  name         str
  description  str
  tags         JSON list[str]
  graph        JSON           # graph with placeholder nodes in place of file_<uuid>
  placeholders JSON list[ { "id": "ph_1", "label": "shellcode_input", "hint": "binary" } ]
  created_at   datetime
  updated_at   datetime
```

### Placeholder node

In template graph, `projectFileNode` is replaced by:

```jsonc
{
  "id": "ph_1",
  "type": "placeholderNode",
  "data": { "placeholder_id": "ph_1", "label": "shellcode_input", "hint": "binary" }
}
```

Edges retain `sourceHandle: "output"`.

### Endpoints

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET    | `/api/templates`                                  | `?tag=...` | list |
| POST   | `/api/templates`                                  | `{name, description, tags, graph, placeholders}` | manual |
| GET    | `/api/templates/{id}`                             |          | detail |
| PATCH  | `/api/templates/{id}`                             | partial  |        |
| DELETE | `/api/templates/{id}`                             |          |        |
| POST   | `/api/pipelines/{id}/save_as_template`            | `{name, description, tags}` | derive template from existing pipeline by walking graph, replacing each `file_<uuid>` with a `placeholder_<n>` |
| POST   | `/api/templates/{id}/instantiate`                 | `{project_id, name, file_mappings: { ph_id: file_id }}` | create concrete Pipeline in target project |

### Frontend

- New top-level nav `Templates` → `TemplatesPage.tsx` (list, tag filter, create/delete).
- `TemplateDetailPage.tsx` (read-only ReactFlow preview, "Use in project" button).
- `InstantiateTemplateDialog.tsx` — pick project from dropdown, map each placeholder via select of that project's files. Submit → redirects to new pipeline's editor.
- `SaveAsTemplateButton.tsx` integrated into `PipelineToolbar.tsx`.

## Tier 2 — Productivity

### T6: Run history UI

- Pipeline run list embedded in editor (collapsible bottom drawer) or accessible from project detail.
- Per-run row: status, started_at, duration, link to detail.
- Run detail panel: node-by-node `step_results` with output paths and per-node artifact download.
- Backend already exposes `GET /api/pipelines/{id}/runs` + `GET .../runs/{run_id}`. Add:
  - `GET /api/pipelines/{id}/runs/{run_id}/artifacts/{node_id}/download` → returns the temp/output file for that node.

### T7: Re-run past run

- Backend: `POST /api/pipelines/{id}/runs/{run_id}/rerun` — schedules a fresh run with the same pipeline graph as currently stored (NB: this re-uses the *current* graph, not a historical snapshot; we don't version pipelines yet). Returns the new run.
- Frontend: button in run detail row.

### T8: Pipeline duplicate / clone-to-project

- Backend:
  - `POST /api/pipelines/{id}/duplicate` body `{name?}` → copies graph + name as `<name> (copy)` into same project.
  - `POST /api/pipelines/{id}/clone` body `{project_id, name?, file_mappings: { old_file_id: new_file_id }}` → copies into another project; replaces every `file_<old>` node id and edge source with `file_<new>` per mapping. Any unmapped file becomes a placeholder-style error: route returns 400 listing them.
- Frontend: buttons in pipeline list/detail.

### T9: Module categories

- Optional `category` field at manifest top level: `"loader" | "obfuscator" | "packager" | "delivery" | "stager" | "other"`.
- SDK `ForgeModule(name, version, platform, description="", category="other")` — adds field.
- `PipelineToolbar.tsx` groups module buttons under category headers with distinct colors.

### T10: Auto health polling

- FastAPI lifespan-managed background task. Every 30 seconds: for each registered module, attempt `/health` with 3s timeout; update `status` + `last_health_check`. Errors → `offline`.
- Implementation file: `api/modules/poller.py`. Start in main.py lifespan handler (replace deprecated `on_event` while we're touching it).

### T11: File metadata + hash

- On upload, compute `sha256` and `size_bytes` before persisting.
- New columns on `ProjectFile`: `sha256: str(64)`, `size_bytes: int`.
- Schema `ProjectFileOut` gains both fields.
- Frontend file rows show `<short-sha>` + human-readable size.

### T12: Project archive + notes

- New columns on `Project`: `archived: bool default False`, `notes: str default ""`.
- Routes:
  - `POST /api/projects/{id}/archive` / `/restore` — toggle `archived`.
  - `PATCH /api/projects/{id}` already there — extend `ProjectUpdate` with `notes`, `archived`.
- List endpoint: query `?include_archived=false` (default) excludes archived.
- Frontend:
  - Sidebar tabs "Active" / "Archived" on ProjectListPage.
  - ProjectDetailPage: notes markdown textarea (autosave on blur), Archive/Restore button.

### T13: Editor minimap + auto-layout

- Add `<MiniMap />` to ReactFlow canvas.
- Add `dagre` dependency. "Auto-layout" toolbar button computes positions left-to-right (rankdir=LR) and applies via `setNodes`.

## DB Migration Strategy

No migration framework. Phase 1 already accepts wiping `forge.db` on schema change. Document in commit message. Existing deploys (none yet) accept reset.

## Testing

Extend headless smoke (`P3-smoke`):

1. Create project, upload file_A (sha256 + size returned).
2. Build pipeline with handle wiring, save.
3. Save as template (no project_id) → templates list contains it; graph has placeholder in place of file node.
4. Create project_B.
5. Instantiate template into project_B with file_A_copy → returns new pipeline in B; validate returns valid.
6. Run the cloned pipeline → completes; output appears in project_B.
7. Duplicate pipeline in same project; new pipeline appears.
8. Re-run past run → new run completes.
9. Archive project_B; list (default) does not show it; list with `include_archived=true` does.
10. Module categories: register echo (which we annotate with category) → manifest_cache.category present.
11. Auto-health poller: kill echo module, wait 60s, GET module → status "offline".

## Out of Scope (deferred to Phase 4 or later)

- Tier 3 features (audit log, cron scheduling, webhooks, artifact analysis, burned-flag).
- Real modules.
- WebSocket reconnection with backoff (already noted).
- Pipeline versioning / snapshots.
