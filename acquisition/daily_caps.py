"""Per-platform daily action caps with Supabase persistence."""

from datetime import date, datetime, timezone

import httpx

from .config import DEFAULT_DAILY_CAPS, SUPABASE_URL, get_supabase_headers


async def get_daily_count(
    client: httpx.AsyncClient,
    platform: str,
    action: str,
    day: date | None = None,
) -> int:
    """Get current count for a platform/action on a given day."""
    day = day or date.today()
    resp = await client.get(
        f"{SUPABASE_URL}/rest/v1/acq_daily_caps",
        headers=get_supabase_headers(),
        params={
            "platform": f"eq.{platform}",
            "action": f"eq.{action}",
            "cap_date": f"eq.{day.isoformat()}",
            "select": "current_count",
        },
    )
    resp.raise_for_status()
    rows = resp.json()
    if rows:
        return rows[0]["current_count"]
    return 0


async def check_cap(
    client: httpx.AsyncClient,
    platform: str,
    action: str,
) -> tuple[bool, int, int]:
    """Check if daily cap allows another action.

    Returns (allowed, current_count, daily_limit).
    """
    today = date.today()
    current = await get_daily_count(client, platform, action, today)
    limit = DEFAULT_DAILY_CAPS.get(platform, {}).get(action, 0)
    return current < limit, current, limit


async def increment_cap(
    client: httpx.AsyncClient,
    platform: str,
    action: str,
) -> int:
    """Increment the daily counter. Creates row if it doesn't exist.

    Returns the new count.
    """
    today = date.today()
    current = await get_daily_count(client, platform, action, today)

    if current == 0:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/acq_daily_caps",
            headers=get_supabase_headers(),
            json={
                "platform": platform,
                "action": action,
                "cap_date": today.isoformat(),
                "daily_limit": DEFAULT_DAILY_CAPS.get(platform, {}).get(action, 0),
                "current_count": 1,
            },
        )
        resp.raise_for_status()
        return 1

    new_count = current + 1
    resp = await client.patch(
        f"{SUPABASE_URL}/rest/v1/acq_daily_caps",
        headers=get_supabase_headers(),
        params={
            "platform": f"eq.{platform}",
            "action": f"eq.{action}",
            "cap_date": f"eq.{today.isoformat()}",
        },
        json={
            "current_count": new_count,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    resp.raise_for_status()
    return new_count
