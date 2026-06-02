from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.db.engine import init_db
from api.auth.routes import router as auth_router
from api.projects.routes import router as projects_router
from api.modules.routes import router as modules_router
from api.modules import poller as modules_poller
from api.pipelines.routes import router as pipelines_router, authed_router as pipelines_authed_router
from api.templates.routes import router as templates_router, pipeline_extra as templates_pipeline_extra


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    modules_poller.start()
    try:
        yield
    finally:
        modules_poller.stop()


app = FastAPI(title="Venom API", lifespan=lifespan)

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
app.include_router(templates_router)
app.include_router(templates_pipeline_extra)


static_dir = Path(__file__).parent.parent / "static"

if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(static_dir / "index.html")
