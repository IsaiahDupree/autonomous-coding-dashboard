"""Orchestrator API routes."""

import asyncio

from fastapi import APIRouter, Request

from ...orchestrator import AcquisitionOrchestrator
from ..schemas import OrchestratorStatus

router = APIRouter()

_orchestrator: AcquisitionOrchestrator | None = None


@router.post("/start")
async def start_orchestrator(request: Request, dry_run: bool = False, interval: int = 3600):
    global _orchestrator
    if _orchestrator and _orchestrator.running:
        return {"status": "already_running"}

    _orchestrator = AcquisitionOrchestrator(dry_run=dry_run, cycle_interval=interval)
    asyncio.create_task(_orchestrator.start())
    return {"status": "started", "dry_run": dry_run, "interval": interval}


@router.post("/stop")
async def stop_orchestrator():
    global _orchestrator
    if _orchestrator and _orchestrator.running:
        await _orchestrator.stop()
        return {"status": "stopped"}
    return {"status": "not_running"}


@router.get("/status", response_model=OrchestratorStatus)
async def get_status():
    if _orchestrator and _orchestrator.running:
        return OrchestratorStatus(running=True)
    return OrchestratorStatus(running=False)


@router.post("/cycle")
async def run_single_cycle(request: Request, dry_run: bool = False):
    orch = AcquisitionOrchestrator(dry_run=dry_run)
    orch._client = request.app.state.http_client
    return await orch.run_cycle()
