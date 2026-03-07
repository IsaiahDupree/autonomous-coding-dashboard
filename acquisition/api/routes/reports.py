"""Reporting API routes."""

from fastapi import APIRouter, Request

from ...reporting_agent import generate_weekly_report, get_funnel_snapshot

router = APIRouter()


@router.get("/funnel")
async def funnel_snapshot(request: Request):
    client = request.app.state.http_client
    return await get_funnel_snapshot(client)


@router.post("/weekly")
async def trigger_weekly_report(request: Request, dry_run: bool = False):
    client = request.app.state.http_client
    return await generate_weekly_report(client, dry_run=dry_run)
