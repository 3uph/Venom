# Forge — Red Team Artifact Builder

## Overview

Private web-based toolkit for building, packaging, and delivering Red Team artifacts during authorized engagements. Modular architecture: a central dashboard orchestrates independent modules deployed on any machine.

## Architecture

### Core Principle: Full Decoupling

Dashboard knows nothing about modules until registered by the operator. Dashboard is a Docker container deployable anywhere. Modules are standalone services on any host (Windows, Linux) — connected only by IP:port.

```
┌─────────────────────────────────┐
│     FORGE DASHBOARD (Docker)    │
│  Frontend: React + ReactFlow    │
│  Backend: Python FastAPI        │
│  DB: SQLite                     │
│  Storage: local filesystem      │
│  Auth: simple JWT (single user) │
└────────────┬────────────────────┘
             │ HTTP
   ┌─────────┼──────────┬──────────────┐
   ▼         ▼          ▼              ▼
┌───────┐ ┌───────┐ ┌────────┐  ┌──────────┐
│Mod A  │ │Mod B  │ │Mod C   │  │ Mod D    │
│Linux  │ │Linux  │ │Windows │  │ Linux    │
│:5000  │ │:5001  │ │:5002   │  │ :5003    │
└───────┘ └───────┘ └────────┘  └──────────┘
```

### Dashboard

Single Docker container with:

- **Frontend**: React + ReactFlow (drag & drop node pipeline editor)
- **Backend**: Python FastAPI (async, typed)
- **Database**: SQLite (projects, modules registry, pipeline definitions)
- **Storage**: Local filesystem (uploaded files, generated artifacts)
- **Auth**: JWT with single username/password, configured on first run

Dashboard responsibilities:
- Project management (create, delete, list)
- File management (upload shellcodes, download artifacts)
- Module registry (add/remove module by IP:port, poll health)
- Pipeline editor (visual node graph)
- Pipeline execution (orchestrate calls to modules in sequence)

### Modules

Each module is an independent service deployable on any machine. Module only needs Python + Flask (or any language that implements the contract).

Module responsibilities:
- Expose `/manifest` — self-describe capabilities
- Expose `/health` — report status
- Expose `/execute` — receive params + files, execute function, return result

Modules do NOT know about dashboard, other modules, or projects. They receive input, process it, return output. Stateless from dashboard's perspective.

## Module Contract

### GET /manifest

```json
{
  "name": "c-loader-builder",
  "version": "1.0",
  "platform": "linux",
  "description": "Builds C loaders with embedded shellcode",
  "functions": [
    {
      "name": "build_loader",
      "description": "Compile C loader with shellcode",
      "params": [
        {
          "name": "shellcode",
          "type": "file",
          "required": true,
          "description": "Raw shellcode binary"
        },
        {
          "name": "technique",
          "type": "enum",
          "options": ["syscall_direct", "ntcreatethread", "apc_injection"],
          "required": true,
          "description": "Injection technique"
        },
        {
          "name": "output_name",
          "type": "string",
          "required": true,
          "description": "Output filename without extension"
        },
        {
          "name": "output_format",
          "type": "enum",
          "options": ["exe", "dll"],
          "required": true,
          "description": "Output binary format"
        }
      ],
      "returns": {
        "type": "file",
        "description": "Compiled binary"
      }
    }
  ]
}
```

### GET /health

```json
{
  "status": "ok",
  "name": "c-loader-builder",
  "version": "1.0",
  "uptime_seconds": 3600
}
```

### POST /execute

Request: `multipart/form-data`
- `function`: string (function name from manifest)
- `params`: JSON string (non-file parameters)
- File fields matching param names of type "file"

Response: file download (the generated artifact) or JSON error.

## Data Model

### Project

```
- id: uuid
- name: string
- description: string
- created_at: datetime
- updated_at: datetime
```

### ProjectFile

```
- id: uuid
- project_id: FK -> Project
- filename: string
- file_type: string (shellcode, output, other)
- path: string (filesystem path)
- created_at: datetime
```

### RegisteredModule

```
- id: uuid
- name: string (from manifest)
- host: string (IP or hostname)
- port: int
- platform: string (from manifest)
- last_health_check: datetime
- status: enum (online, offline, unknown)
- manifest_cache: JSON (cached manifest)
```

### Pipeline

```
- id: uuid
- project_id: FK -> Project
- name: string
- graph: JSON (ReactFlow node/edge serialization)
- created_at: datetime
- updated_at: datetime
```

### PipelineRun

```
- id: uuid
- pipeline_id: FK -> Pipeline
- status: enum (pending, running, completed, failed)
- started_at: datetime
- finished_at: datetime
- step_results: JSON (per-node status and output references)
```

## Pipeline Editor

Visual drag & drop editor using ReactFlow:

- **Nodes**: Each node = one function from one registered module
  - Displays: module name, function name, configurable parameters
  - Parameters configurable per node (technique, output_name, output_format, etc.)
  - File inputs selectable from project files or from previous node output
- **Edges**: Connect output of one node to input of next
- **Execution**: Sequential, left to right. Output of node N becomes input file for node N+1
- **Status**: Each node shows execution state (pending → running → done/error)

## Project Workspace

```
/storage/
└── projects/
    └── {project_id}/
        ├── uploads/        # User-uploaded files (shellcodes, etc.)
        ├── outputs/        # Final artifacts from pipeline runs
        └── temp/           # Intermediate files during pipeline execution
```

## Module SDK

Python package to simplify module creation:

```python
from forge_module_sdk import ForgeModule, function, Param

module = ForgeModule(
    name="c-loader-builder",
    version="1.0",
    platform="linux"
)

@module.function(
    name="build_loader",
    description="Compile C loader with shellcode",
    params=[
        Param("shellcode", type="file", required=True),
        Param("technique", type="enum",
              options=["syscall_direct", "ntcreatethread", "apc_injection"],
              required=True),
        Param("output_name", type="string", required=True),
        Param("output_format", type="enum", options=["exe", "dll"], required=True)
    ],
    returns={"type": "file"}
)
def build_loader(shellcode, technique, output_name, output_format):
    # Implementation here
    ...
    return path_to_compiled_binary

module.run(host="0.0.0.0", port=5001)
```

## Deployment

### Dashboard
```dockerfile
# Single Dockerfile
# Python backend + React frontend (built static, served by FastAPI)
# Exposes single port (default 8080)
# Volume mount for /storage (persistent data)
# Environment vars: FORGE_SECRET_KEY, FORGE_ADMIN_PASSWORD
```

### Modules
Each module is its own repo/folder with its own deployment:
- Linux modules: Docker or direct Python
- Windows modules: Direct Python, or as Windows service

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | React + TypeScript + ReactFlow | Mature node editor, large ecosystem |
| Backend | Python 3.11+ FastAPI | Async, typed, good for orchestration |
| Database | SQLite + SQLAlchemy | No infra overhead, single user |
| File Storage | Local filesystem | Simple, reliable |
| Auth | JWT (python-jose) | Single user, stateless tokens |
| Module SDK | Python Flask | Lightweight, deployable anywhere |
| Containerization | Docker + docker-compose | Dashboard only, modules independent |

## Security Considerations

- Auth required for all dashboard endpoints
- Modules should be deployed on trusted networks only (no public exposure)
- File uploads validated by extension and size limits
- No shell injection: all compilation commands use subprocess with argument lists, never shell=True
- HTTPS recommended for production (reverse proxy)

## Scope — Phase 1 (Skeleton)

1. Dashboard backend: auth, projects CRUD, file upload/download, module registry
2. Dashboard frontend: login, project list, project detail with file management, module registry page
3. Module SDK: base class with manifest/health/execute endpoints
4. Module registration: add by IP:port, fetch manifest, health polling
5. Pipeline editor: basic ReactFlow canvas, add nodes from registered modules, configure params, save/load
6. Pipeline execution: sequential execution, pass output between nodes, save final artifact

NOT in Phase 1: advanced error recovery, parallel pipeline branches, module authentication, audit logging.
