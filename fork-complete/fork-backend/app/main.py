from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 - ensures models are registered before create_all
from app.routers import members, posts

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FORK. API",
    description="Backend for FORK. — a members-only build-in-public network for Jamshedpur CS students",
    version="1.0.0",
)

# Allow the Vite dev server to call this API.
# Tighten allow_origins to your real frontend domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(members.router)
app.include_router(posts.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "FORK. API"}
