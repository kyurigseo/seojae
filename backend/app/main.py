from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as main_router
from app.api.routes.auth import router as auth_router
from app.api.routes.audit import router as audit_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.analytics import router as analytics_router
from app.gateway.router import router as gateway_router

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

app.include_router(main_router)
app.include_router(auth_router)
app.include_router(audit_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(gateway_router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Production build of the React frontend (`cd frontend && npm run build`),
# served alongside the API so `uvicorn app.main:app` is the only command
# needed for a demo. During development, run the Vite dev server separately
# (`npm run dev`) instead — it talks to this API over CORS (allow_origins=*).
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
