from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.db.engine import init_db
from api.auth.routes import router as auth_router
from api.projects.routes import router as projects_router
from api.modules.routes import router as modules_router
from api.pipelines.routes import router as pipelines_router, authed_router as pipelines_authed_router

app = FastAPI(title="Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(modules_router)
app.include_router(pipelines_router)
app.include_router(pipelines_authed_router)


@app.on_event("startup")
def on_startup():
    init_db()


static_dir = Path(__file__).parent.parent / "static"

if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(static_dir / "index.html")
