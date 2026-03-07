"""Outreach API routes."""

from fastapi import APIRouter, Request

from ...outreach_agent import run_outreach
from ...followup_agent import check_replies, send_followups

router = APIRouter()


@router.post("/send")
async def trigger_outreach(request: Request, dry_run: bool = False, batch_size: int = 10):
    client = request.app.state.http_client
    return await run_outreach(client, batch_size=batch_size, dry_run=dry_run)


@router.post("/check-replies")
async def trigger_check_replies(request: Request, dry_run: bool = False):
    client = request.app.state.http_client
    return await check_replies(client, dry_run=dry_run)


@router.post("/followups")
async def trigger_followups(request: Request, dry_run: bool = False):
    client = request.app.state.http_client
    return await send_followups(client, dry_run=dry_run)
