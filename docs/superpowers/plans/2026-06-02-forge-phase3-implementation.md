# Forge — Phase 3 Implementation Plan

> Spec: `docs/superpowers/specs/2026-06-02-forge-phase3-design.md`

## Backend

### P3-B1: DB schema extensions
- Modify `api/db/models.py`:
  - `Project`: add `archived: bool default False`, `notes: str default ""`.
  - `ProjectFile`: add `sha256: str(64) default ""`, `size_bytes: int default 0`.
  - New `PipelineTemplate` model.
- Wipe `forge.db` on next startup (init_db creates fresh schema).

### P3-B2: Templates module
- `api/templates/__init__.py`, `schemas.py`, `routes.py`.
- Templates CRUD + tag filter + `instantiate` + `save_as_template`.
- `save_as_template` logic: walk pipeline.graph.nodes; each `projectFileNode` → new `placeholderNode` with `placeholder_id = ph_<idx>`. Edges keep handle ids, but `source` replaced with `ph_<idx>`. Placeholder list built from the projectFileNodes' filenames as labels.
- `instantiate` logic: walk template.graph.nodes; each `placeholderNode` → `projectFileNode` with `file_id = mappings[ph_id]` and id `file_<new_file_id>`. Update edge `source` accordingly.

### P3-B3: Routes — module additions
- Modules routes: add `category` exposure (already JSON in manifest_cache, no schema change).
- Pipelines routes additions:
  - `POST /api/pipelines/{id}/duplicate`
  - `POST /api/pipelines/{id}/clone` (target project, mapping)
  - `POST /api/pipelines/{id}/runs/{run_id}/rerun`
  - `GET  /api/pipelines/{id}/runs/{run_id}/artifacts/{node_id}/download`
- Projects routes additions:
  - `POST /api/projects/{id}/archive`
  - `POST /api/projects/{id}/restore`
  - List supports `?include_archived=true|false` (default false).
  - Upload computes sha256 + size before insert.
  - `ProjectUpdate` accepts `notes` and `archived`.

### P3-B4: Module auto-health poller
- `api/modules/poller.py` with `start_poller(app)`. Uses lifespan handler in `main.py`.
- Convert `on_event("startup")` → lifespan context manager. Init db + start poller; on shutdown, cancel task.

### P3-B5: SDK + echo
- `ForgeModule(... category="other")`. Add to manifest output.
- Echo module: set `category="other"` (representative; real modules set real categories).

## Frontend

### P3-F1: Templates pages + nav
- `dashboard/src/templates/TemplatesPage.tsx` — list, tag filter, delete.
- `dashboard/src/templates/TemplateDetailPage.tsx` — read-only RF preview, instantiate button.
- `dashboard/src/templates/InstantiateTemplateDialog.tsx`.
- Add nav item to `AppLayout.tsx` + routes.

### P3-F2: Save as Template
- Button in `PipelineToolbar.tsx`. Opens dialog (name, description, tags). POSTs to `/save_as_template`.

### P3-F3: Run history drawer + per-node artifact download + re-run
- New `dashboard/src/pipelines/RunHistoryDrawer.tsx` embedded in `PipelineEditorPage.tsx`. Collapsible bottom panel listing runs; row click expands step_results with download buttons.

### P3-F4: Duplicate + Clone-to-project
- Buttons added in `ProjectDetailPage.tsx` next to each pipeline link. Clone opens dialog (pick project, map files).

### P3-F5: Module categories in toolbar
- `PipelineToolbar.tsx`: group module buttons by `m.manifest_cache.category` (default "other"). Header per category with subtle color.

### P3-F6: Project archive + notes + file metadata
- `ProjectListPage.tsx`: tabs Active/Archived.
- `ProjectDetailPage.tsx`: notes textarea + Archive button + file rows display sha256 (first 8 chars) and size.

### P3-F7: Editor enhancements
- Add `<MiniMap />` to RF canvas.
- Install `dagre`. Add "Auto-layout" button in toolbar that calls a layout helper to compute positions.

## Integration smoke (P3-Smoke)
- End-to-end: project A, upload, build pipeline, save_as_template, instantiate into project B with new file mapping, run, verify outputs, duplicate, rerun, archive, restore, auto-health.
