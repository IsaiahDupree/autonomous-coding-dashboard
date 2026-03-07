"""Typed SQL query functions for the Acquisition Agent."""

from datetime import date, datetime, timezone
from typing import Any, Optional

import httpx

from ..config import SUPABASE_URL, get_supabase_headers


async def _request(
    client: httpx.AsyncClient,
    method: str,
    table: str,
    *,
    params: dict | None = None,
    json: dict | list | None = None,
) -> list[dict]:
    resp = await client.request(
        method,
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=get_supabase_headers(),
        params=params or {},
        json=json,
    )
    resp.raise_for_status()
    if resp.status_code == 204:
        return []
    return resp.json()


# --- crm_contacts ---

async def get_contacts_by_stage(
    client: httpx.AsyncClient,
    stage: str,
    limit: int = 100,
) -> list[dict]:
    return await _request(client, "GET", "crm_contacts", params={
        "pipeline_stage": f"eq.{stage}",
        "select": "*",
        "limit": str(limit),
        "order": "created_at.asc",
    })


async def update_contact_stage(
    client: httpx.AsyncClient,
    contact_id: str,
    new_stage: str,
    triggered_by: str = "automation",
) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    update_data: dict[str, Any] = {
        "pipeline_stage": new_stage,
        "updated_at": now,
    }
    if new_stage == "archived":
        update_data["archived_at"] = now

    result = await _request(client, "PATCH", "crm_contacts", params={
        "id": f"eq.{contact_id}",
    }, json=update_data)
    return result


async def check_contact_exists(
    client: httpx.AsyncClient,
    platform: str,
    platform_id: str,
) -> dict | None:
    rows = await _request(client, "GET", "crm_contacts", params={
        "platform": f"eq.{platform}",
        "platform_id": f"eq.{platform_id}",
        "select": "id,pipeline_stage,archived_at",
        "limit": "1",
    })
    return rows[0] if rows else None


async def upsert_contact(
    client: httpx.AsyncClient,
    contact_data: dict,
) -> list[dict]:
    headers = get_supabase_headers()
    headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/crm_contacts",
        headers=headers,
        json=contact_data,
    )
    resp.raise_for_status()
    return resp.json()


# --- acq_funnel_events ---

async def log_funnel_event(
    client: httpx.AsyncClient,
    contact_id: str,
    from_stage: str,
    to_stage: str,
    triggered_by: str = "automation",
    metadata: dict | None = None,
) -> list[dict]:
    return await _request(client, "POST", "acq_funnel_events", json={
        "contact_id": contact_id,
        "from_stage": from_stage,
        "to_stage": to_stage,
        "triggered_by": triggered_by,
        "metadata": metadata or {},
    })


# --- acq_discovery_runs ---

async def log_discovery_run(
    client: httpx.AsyncClient,
    niche_id: str,
    platform: str,
    search_query: str,
    contacts_found: int,
    contacts_new: int,
    contacts_skipped: int,
    duration_ms: int,
    error: str | None = None,
) -> list[dict]:
    return await _request(client, "POST", "acq_discovery_runs", json={
        "niche_id": niche_id,
        "platform": platform,
        "search_query": search_query,
        "contacts_found": contacts_found,
        "contacts_new": contacts_new,
        "contacts_skipped": contacts_skipped,
        "duration_ms": duration_ms,
        "error": error,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })


# --- acq_warmup_schedules ---

async def get_pending_warmups(
    client: httpx.AsyncClient,
    limit: int = 20,
) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return await _request(client, "GET", "acq_warmup_schedules", params={
        "status": "eq.pending",
        "scheduled_at": f"lte.{now}",
        "select": "*",
        "limit": str(limit),
        "order": "scheduled_at.asc",
    })


async def create_warmup_schedule(
    client: httpx.AsyncClient,
    contact_id: str,
    platform: str,
    post_url: str,
    comment_text: str,
    scheduled_at: str,
) -> list[dict]:
    return await _request(client, "POST", "acq_warmup_schedules", json={
        "contact_id": contact_id,
        "platform": platform,
        "post_url": post_url,
        "comment_text": comment_text,
        "scheduled_at": scheduled_at,
    })


async def mark_warmup_sent(
    client: httpx.AsyncClient,
    warmup_id: str,
) -> list[dict]:
    return await _request(client, "PATCH", "acq_warmup_schedules", params={
        "id": f"eq.{warmup_id}",
    }, json={
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })


async def mark_warmup_failed(
    client: httpx.AsyncClient,
    warmup_id: str,
    error: str,
) -> list[dict]:
    return await _request(client, "PATCH", "acq_warmup_schedules", params={
        "id": f"eq.{warmup_id}",
    }, json={
        "status": "failed",
        "error": error,
        "attempt_count": "attempt_count + 1",  # Note: needs RPC for atomic increment
    })


# --- acq_outreach_sequences ---

async def get_pending_outreach(
    client: httpx.AsyncClient,
    limit: int = 10,
) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return await _request(client, "GET", "acq_outreach_sequences", params={
        "status": "eq.pending",
        "scheduled_at": f"lte.{now}",
        "select": "*",
        "limit": str(limit),
        "order": "scheduled_at.asc",
    })


async def create_outreach_sequence(
    client: httpx.AsyncClient,
    contact_id: str,
    platform: str,
    sequence_step: int,
    message_text: str,
    variant_id: str | None = None,
    scheduled_at: str | None = None,
) -> list[dict]:
    data: dict[str, Any] = {
        "contact_id": contact_id,
        "platform": platform,
        "sequence_step": sequence_step,
        "message_text": message_text,
    }
    if variant_id:
        data["variant_id"] = variant_id
    if scheduled_at:
        data["scheduled_at"] = scheduled_at
    return await _request(client, "POST", "acq_outreach_sequences", json=data)


async def mark_outreach_sent(
    client: httpx.AsyncClient,
    outreach_id: str,
) -> list[dict]:
    return await _request(client, "PATCH", "acq_outreach_sequences", params={
        "id": f"eq.{outreach_id}",
    }, json={
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })


# --- acq_niche_configs ---

async def get_active_niches(
    client: httpx.AsyncClient,
) -> list[dict]:
    return await _request(client, "GET", "acq_niche_configs", params={
        "enabled": "eq.true",
        "select": "*",
    })


async def upsert_niche_config(
    client: httpx.AsyncClient,
    config: dict,
) -> list[dict]:
    headers = get_supabase_headers()
    headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/acq_niche_configs",
        headers=headers,
        json=config,
    )
    resp.raise_for_status()
    return resp.json()


# --- acq_message_variants ---

async def get_active_variants(
    client: httpx.AsyncClient,
    niche_id: str,
    platform: str,
    sequence_step: int = 1,
) -> list[dict]:
    return await _request(client, "GET", "acq_message_variants", params={
        "niche_id": f"eq.{niche_id}",
        "platform": f"eq.{platform}",
        "sequence_step": f"eq.{sequence_step}",
        "active": "eq.true",
        "select": "*",
    })


async def increment_variant_sent(
    client: httpx.AsyncClient,
    variant_id: str,
) -> list[dict]:
    return await _request(client, "PATCH", "acq_message_variants", params={
        "id": f"eq.{variant_id}",
    }, json={
        "times_sent": "times_sent + 1",  # Note: needs RPC for atomic increment
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })


# --- acq_daily_caps ---

async def get_daily_cap(
    client: httpx.AsyncClient,
    platform: str,
    action: str,
    cap_date: date | None = None,
) -> dict | None:
    d = (cap_date or date.today()).isoformat()
    rows = await _request(client, "GET", "acq_daily_caps", params={
        "platform": f"eq.{platform}",
        "action": f"eq.{action}",
        "cap_date": f"eq.{d}",
        "select": "*",
        "limit": "1",
    })
    return rows[0] if rows else None


# --- acq_weekly_reports ---

async def save_weekly_report(
    client: httpx.AsyncClient,
    week_start: date,
    week_end: date,
    report_data: dict,
    funnel_summary: dict,
    platform_breakdown: dict,
    recommendations: list[str] | None = None,
) -> list[dict]:
    return await _request(client, "POST", "acq_weekly_reports", json={
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "report_data": report_data,
        "funnel_summary": funnel_summary,
        "platform_breakdown": platform_breakdown,
        "recommendations": recommendations or [],
    })


# --- acq_human_notifications ---

async def log_notification(
    client: httpx.AsyncClient,
    contact_id: str | None,
    notification_type: str,
    channel: str,
    body: str,
    subject: str | None = None,
) -> list[dict]:
    data: dict[str, Any] = {
        "notification_type": notification_type,
        "channel": channel,
        "body": body,
    }
    if contact_id:
        data["contact_id"] = contact_id
    if subject:
        data["subject"] = subject
    return await _request(client, "POST", "acq_human_notifications", json=data)
