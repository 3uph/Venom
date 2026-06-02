from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.db.engine import init_db
from api.auth.routes import router as auth_router

app = FastAPI(title="Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
def on_startup():
    init_db()
