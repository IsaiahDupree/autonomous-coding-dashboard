"""PRD-026: Weekly reports, analytics, insights.

Generates funnel analytics and weekly performance reports.
"""

import logging
from datetime import date, datetime, timedelta, timezone

import httpx

from .config import PIPELINE_STAGES, SUPABASE_URL, get_supabase_headers
from .db.queries import save_weekly_report

logger = logging.getLogger(__name__)


async def get_funnel_snapshot(client: httpx.AsyncClient) -> dict[str, int]:
    """Get current count of contacts in each pipeline stage."""
    counts = {}
    for stage in PIPELINE_STAGES:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/crm_contacts",
            headers={**get_supabase_headers(), "Prefer": "count=exact"},
            params={
                "pipeline_stage": f"eq.{stage}",
                "select": "id",
                "limit": "0",
            },
        )
        resp.raise_for_status()
        count_header = resp.headers.get("content-range", "*/0")
        total = int(count_header.split("/")[-1]) if "/" in count_header else 0
        counts[stage] = total
    return counts


async def get_platform_breakdown(
    client: httpx.AsyncClient,
    since: date,
) -> dict[str, dict]:
    """Get per-platform activity counts since a given date."""
    resp = await client.get(
        f"{SUPABASE_URL}/rest/v1/acq_funnel_events",
        headers=get_supabase_headers(),
        params={
            "created_at": f"gte.{since.isoformat()}",
            "select": "to_stage,metadata",
        },
    )
    resp.raise_for_status()
    events = resp.json()

    breakdown: dict[str, dict[str, int]] = {}
    for event in events:
        platform = event.get("metadata", {}).get("platform", "unknown")
        stage = event.get("to_stage", "unknown")
        if platform not in breakdown:
            breakdown[platform] = {}
        breakdown[platform][stage] = breakdown[platform].get(stage, 0) + 1

    return breakdown


async def generate_weekly_report(
    client: httpx.AsyncClient,
    *,
    dry_run: bool = False,
) -> dict:
    """Generate and save a weekly performance report."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    funnel = await get_funnel_snapshot(client)
    total = sum(funnel.values()) or 1
    funnel_summary = [
        {"stage": stage, "count": count, "percentage": round(count / total * 100, 1)}
        for stage, count in funnel.items()
    ]

    platform_breakdown = await get_platform_breakdown(client, week_start)

    recommendations = _generate_recommendations(funnel, platform_breakdown)

    report_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "funnel_snapshot": funnel,
        "total_contacts": total,
    }

    if not dry_run:
        await save_weekly_report(
            client,
            week_start=week_start,
            week_end=week_end,
            report_data=report_data,
            funnel_summary={"stages": funnel_summary},
            platform_breakdown=platform_breakdown,
            recommendations=recommendations,
        )

    return {
        "week": f"{week_start.isoformat()} to {week_end.isoformat()}",
        "funnel": funnel_summary,
        "platforms": platform_breakdown,
        "recommendations": recommendations,
    }


def _generate_recommendations(
    funnel: dict[str, int],
    platforms: dict[str, dict],
) -> list[str]:
    """Generate actionable recommendations from funnel data."""
    recs = []

    new_count = funnel.get("new", 0)
    qualified = funnel.get("qualified", 0)
    warming = funnel.get("warming", 0)
    contacted = funnel.get("contacted", 0)
    replied = funnel.get("replied", 0)

    if new_count > 100 and qualified < 10:
        recs.append("Low qualification rate — review ICP scoring criteria or lower threshold")

    if qualified > 20 and warming == 0:
        recs.append("Qualified contacts not entering warmup — check warmup scheduler")

    if contacted > 20 and replied == 0:
        recs.append("No replies detected — review DM templates and personalization")

    if not platforms:
        recs.append("No platform activity this week — check Safari service connectivity")

    if not recs:
        recs.append("Pipeline healthy — continue current cadence")

    return recs
