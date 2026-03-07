"""FastAPI server for the Acquisition Agent."""

import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from .routes import discovery, warmup, outreach, orchestrator, reports
from .schemas import HealthResponse

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=60.0)
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="Acquisition Agent API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(discovery.router, prefix="/api/discovery", tags=["discovery"])
app.include_router(warmup.router, prefix="/api/warmup", tags=["warmup"])
app.include_router(outreach.router, prefix="/api/outreach", tags=["outreach"])
app.include_router(orchestrator.router, prefix="/api/orchestrator", tags=["orchestrator"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        version="0.1.0",
        uptime_seconds=round(time.time() - START_TIME, 1),
    )
