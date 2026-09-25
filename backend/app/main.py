from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

app = FastAPI(
    title="Medisync Scoring Service (Backend 1)",
    description="처방 시계열 이상탐지 · 리스크 스코어링 · 설명가능한 AI 서비스",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Light demo frontend (plain HTML/CSS/JS, no build step) served alongside
# the API so `uvicorn app.main:app` is the only command needed for a demo.
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
