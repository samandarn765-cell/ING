"""EduPrep AI — FastAPI ilovasi kirish nuqtasi.

Ishga tushirish:  uvicorn app.main:app --reload --port 8000
Swagger hujjatlari: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import Base, engine
from .routers import dashboard, exam, homework, planner, practice, speaking, vocab, weakspots
from .services.ai_service import AIError
from .services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="EduPrep AI", version="1.0.0", description="Shaxsiy AI ingliz tili repetitori", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AIError)
async def ai_error_handler(_: Request, exc: AIError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


for r in (dashboard, homework, exam, speaking, vocab, weakspots, planner, practice):
    app.include_router(r.router)


@app.get("/")
def root():
    return {"app": "EduPrep AI", "docs": "/docs"}
