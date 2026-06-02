# Venom — Red Team Artifact Builder

> Project context for Claude Code sessions. Read this first.

## TL;DR

Venom = web app for building, packaging, and delivering Red Team artifacts during authorized engagements.

- **Dashboard** (React + FastAPI + SQLite, single Docker container) orchestrates remote modules via HTTP.
- **Modules** are independent Flask services exposing `/manifest`, `/health`, `/execute`. They live on any host (Linux build VM, Windows compile VM, etc.) and the dashboard knows them only by IP:port.
- **Pipeline editor** (ReactFlow) chains module functions visually. Each `file` param becomes a typed input handle, each `returns.name` an output handle.
- **Templates** = pipelines with placeholders replacing concrete project files. Reusable across engagements.

The product is named **Venom**. The top-level directory is `forge/` (legacy from a rename, do not change). User-visible strings and code identifiers are Venom.

## Repo layout

```
/
├── CLAUDE.md                                # this file
├── docs/superpowers/
│   ├── specs/
│   │   ├── 2026-06-02-forge-design.md             # original product spec (dashboard)
│   │   ├── 2026-06-02-forge-phase2-design.md      # pipeline editor (handle-per-param)
│   │   └── 2026-06-02-forge-phase3-design.md      # templates + productivity
│   ├── plans/
│   │   ├── 2026-06-02-forge-implementation.md     # phase 1 dashboard
│   │   ├── 2026-06-02-forge-phase2-implementation.md
│   │   ├── 2026-06-02-forge-phase3-implementation.md
│   │   └── 2026-06-02-loader-builder-roadmap.md   # ← loader-builder phases
│   └── research/
│       ├── 2026-06-02-loader-builder-research-v1.md  # EDR evasion baseline (Q1 2025)
│       └── 2026-06-02-loader-builder-research-v2.md  # 2026 update (BYOVD, ClickFix, LLM, Mockingjay)
└── forge/                                   # all code lives here
    ├── api/                                 # FastAPI backend
    │   ├── auth/                            # JWT login
    │   ├── db/                              # SQLAlchemy models + SQLite engine
    │   ├── projects/                        # projects CRUD, file upload/download with sha256+size
    │   ├── modules/                         # module registry + health poller (lifespan task)
    │   ├── pipelines/                       # pipelines CRUD, engine (per-handle resolution), validator, streaming
    │   ├── templates/                       # pipeline templates + save_as_template + instantiate
    │   ├── config.py                        # env_prefix VENOM_
    │   └── main.py                          # FastAPI(title="Venom API") + lifespan + static SPA mount
    ├── dashboard/                           # React + TypeScript + Vite + ReactFlow
    │   └── src/
    │       ├── api/client.ts                # axios + JWT interceptor + venom_token localStorage
    │       ├── auth/                        # AuthProvider + LoginPage
    │       ├── projects/                    # ProjectListPage (tabs Active/Archived), ProjectDetailPage (notes/files/pipelines), FileUpload, ClonePipelineDialog
    │       ├── modules/ModuleRegistryPage.tsx
    │       ├── templates/                   # TemplatesPage, TemplateDetailPage, InstantiateTemplateDialog (+ shared Modal)
    │       ├── pipelines/
    │       │   ├── PipelineEditorPage.tsx   # ReactFlowProvider + dnd file palette + minimap + run history drawer
    │       │   ├── PipelineToolbar.tsx      # module buttons grouped by category, auto-layout, save-as-template, execute
    │       │   ├── NodeConfigPanel.tsx      # non-file params only (file params wired via edges)
    │       │   ├── ValidationPanel.tsx      # debounced /validate display
    │       │   ├── FilePalette.tsx          # draggable project files
    │       │   ├── RunHistoryDrawer.tsx     # collapsible bottom drawer with rerun + per-node artifact download
    │       │   ├── SaveAsTemplateDialog.tsx
    │       │   ├── autoLayout.ts            # dagre LR
    │       │   ├── usePipelineValidation.ts # debounced POST /validate
    │       │   ├── usePipelineExecution.ts  # POST /execute + WebSocket /stream subscription
    │       │   └── nodes/{ModuleNode,ProjectFileNode}.tsx
    │       ├── layout/AppLayout.tsx         # sidebar nav + ThemeToggle + Sign out
    │       └── theme/                       # themes.ts (dark+light tokens), ThemeProvider, ThemeToggle, tokens.ts (CSS var shortcuts), global.css
    ├── module-sdk/                          # venom_module_sdk Python package (for module authors)
    │   └── venom_module_sdk/
    │       ├── module.py                    # VenomModule class (Flask app + manifest/health/execute routes)
    │       └── param.py                     # Param dataclass (name, type, required, options, accepts)
    ├── modules/                             # module implementations
    │   ├── echo-module/                     # tests-only, port 5050
    │   └── loader-builder/                  # Phase 1 MVP, port 5051
    │       ├── main.py                      # manifest + 6 functions
    │       ├── recipe.py                    # Recipe dataclass (intermediate state)
    │       ├── orchestrator/
    │       │   ├── compose.py               # Jinja2 render + AES-CTR encrypt + bytes-to-C-array
    │       │   ├── build.py                 # mingw-w64 invocation
    │       │   └── polymorphic.py           # seeded RNG: idents + AES key/IV per build
    │       ├── submodules/core/loader_main.c.j2   # the loader C template
    │       └── tests/test_recipe.py
    ├── Dockerfile + docker-compose.yml      # dashboard container, port 8080
    ├── .env.example                         # VENOM_* env vars
    └── requirements.txt                     # backend deps
```

## How to run dev locally

```bash
cd /home/kali/Documents/shell/forge

# Backend (FastAPI on :8080)
.venv/bin/uvicorn api.main:app --port 8080

# Echo module (tests, :5050)
PYTHONPATH=module-sdk .venv/bin/python modules/echo-module/main.py

# Loader-builder module (:5051)
PYTHONPATH=modules/loader-builder:module-sdk .venv/bin/python modules/loader-builder/main.py

# Frontend (Vite dev server on :3000 with /api proxy → :8080)
cd dashboard && npm run dev
```

Default credentials: `admin` / `admin` (set via `VENOM_ADMIN_USER` / `VENOM_ADMIN_PASSWORD`).

Open <http://localhost:3000>. Toggle theme top-right of login or sidebar bottom.

## Current state (snapshot 2026-06-02)

| Component | Phase | Status |
|-----------|-------|--------|
| Dashboard skeleton | 1 | ✅ done — auth + projects + modules + sequential engine + echo module |
| Pipeline editor (handle-per-param) | 2 | ✅ done — typed handles, file palette, validation, WS streaming, project file nodes |
| Templates + productivity | 3 | ✅ done — templates, save/instantiate, run history, duplicate/clone, archive/notes, file sha256+size, module categories, auto-health poller, minimap, dagre auto-layout |
| Modern UI + theme | 4 | ✅ done — light/dark CSS variables, ThemeProvider, minimalist restyle |
| Loader-builder module | 1 (MVP) | ✅ done — recipe + atomic composition + BCrypt AES-CTR + VirtualAlloc/CreateThread compiled via mingw-w64 |
| Loader-builder evasion layers | 2-7 | ⏳ pending — see `docs/superpowers/plans/2026-06-02-loader-builder-roadmap.md` |
| Packager module | — | ⏳ not started |
| Delivery module | — | ⏳ not started |

## Architecture invariants (do not break)

1. **Dashboard is decoupled from modules.** It knows them only by IP:port + manifest cache. Modules can live on any host. Do not introduce module-specific logic in the dashboard.
2. **Engine resolves edges by `targetHandle`.** A project file node feeds into a module node via the handle ID matching the param name. No "first file param" fallback.
3. **Recipe JSON is the loader-builder intermediate state.** Atomic functions transform recipe → recipe. Terminal `compile_loader` consumes recipe → emits PE.
4. **Manifest is the contract.** Adding a technique to a module = new function in manifest + new submodule template. The dashboard auto-renders handles.
5. **PEP 668 active on Kali.** Always use `forge/.venv`, never system pip.
6. **bcrypt pinned to 3.2.2.** passlib 1.7.4 is incompatible with bcrypt 4.x's 72-byte enforcement at backend-detection time. Do not unpin.
7. **Top-level directory stays `forge/`.** Renaming would require updating Dockerfile paths, hardcoded references in plans/specs, and gitops. Product name is Venom; dir name is incidental.

## Caveats / known limitations

- WebSocket per-run event queues are not garbage-collected. Acceptable for typical engagement runs; long-running daemon mode would need cleanup.
- Modules currently lack authentication. Trust the network. Phase 5+ should add per-module shared secret.
- Run rerun re-uses the *current* pipeline graph, not a historical snapshot. Pipeline versioning is out of scope for now.
- `.venv` lives in `forge/.venv` and is gitignored. Recreate with `python3 -m venv forge/.venv && forge/.venv/bin/pip install -r forge/api/requirements.txt`.
- bcrypt 3.2.2 must be installed explicitly: `forge/.venv/bin/pip install 'bcrypt==3.2.2'`.

## Conventions for next sessions

- **Tone**: user prefers caveman mode (drop articles/filler, fragments OK, no pleasantries). Code/commits/security write normal English. Toggle with `/caveman lite|full|ultra` or `stop caveman`.
- **Discipline**: spec → plan → execute. Use the superpowers skills (brainstorming, writing-plans, executing-plans, finishing-a-development-branch) when starting non-trivial work.
- **Tasks**: TaskCreate/TaskUpdate for multi-step work.
- **Commits**: Conventional Commits (feat:, fix:, docs:, chore:, refactor:). Branch is `main`.
- **Remote**: `origin = git@github.com:3uph/Venom.git`. Push to `main`.
- **New modules**: replicate the loader-builder pattern (Recipe JSON intermediate state, atomic functions for each technique, composite shortcut function, submodules organized by category with Jinja2 templates).
- **Research-driven**: before implementing a new technique, check `docs/superpowers/research/` for the v1/v2 EDR evasion notes. Add new findings as v3, never overwrite.

## Pointers to read in order

1. This file (you just did).
2. `docs/superpowers/specs/2026-06-02-forge-design.md` — product vision.
3. `docs/superpowers/specs/2026-06-02-forge-phase2-design.md` — pipeline editor contract.
4. `docs/superpowers/research/2026-06-02-loader-builder-research-v2.md` — current EDR evasion landscape.
5. `docs/superpowers/plans/2026-06-02-loader-builder-roadmap.md` — what to implement next in the loader-builder module.
6. `forge/modules/loader-builder/recipe.py` — the Recipe schema (params already declared for techniques not yet implemented; templates are the missing piece).
