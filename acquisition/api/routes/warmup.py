"""Warmup API routes."""

from fastapi import APIRouter, Request

from ...warmup_agent import execute_warmups, schedule_warmups

router = APIRouter()


@router.post("/schedule")
async def trigger_schedule(request: Request, dry_run: bool = False):
    client = request.app.state.http_client
    return await schedule_warmups(client, dry_run=dry_run)


@router.post("/execute")
async def trigger_execute(request: Request, dry_run: bool = False):
    client = request.app.state.http_client
    return await execute_warmups(client, dry_run=dry_run)
