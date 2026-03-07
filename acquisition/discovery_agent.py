"""PRD-022: Prospect discovery agent.

Discovers new prospects via Market Research API (port 3106),
scores them with Claude, and seeds them into crm_contacts.
"""

import logging
import time
from datetime import datetime, timezone

import httpx

from .config import (
    ANTHROPIC_API_KEY,
    MARKET_RESEARCH_PORT,
    SCORING_MODEL,
    ARCHIVE_COOLDOWN_DAYS,
    NicheConfig,
)
from .daily_caps import check_cap
from .db.queries import (
    check_contact_exists,
    get_active_niches,
    log_discovery_run,
    upsert_contact,
    log_funnel_event,
)
from .state_machine import CooldownViolationError

logger = logging.getLogger(__name__)

MARKET_RESEARCH_URL = f"http://localhost:{MARKET_RESEARCH_PORT}"


async def run_discovery(
    client: httpx.AsyncClient,
    niche: dict,
    platform: str,
    *,
    max_results: int = 50,
    dry_run: bool = False,
) -> dict:
    """Run a single discovery cycle for a niche on a platform.

    Returns a summary dict with contacts_found, contacts_new, contacts_skipped.
    """
    start = time.monotonic()
    niche_id = niche["niche_id"]
    keywords = niche.get("keywords", [])
    errors: list[str] = []
    contacts_found = 0
    contacts_new = 0
    contacts_skipped = 0

    logger.info(f"[discovery] niche={niche_id} platform={platform} keywords={keywords}")

    for keyword in keywords[:5]:
        try:
            results = await _search_platform(client, platform, keyword, max_results)
            contacts_found += len(results)

            for prospect in results:
                platform_id = prospect.get("platform_id") or prospect.get("username")
                if not platform_id:
                    contacts_skipped += 1
                    continue

                existing = await check_contact_exists(client, platform, platform_id)
                if existing:
                    if existing.get("pipeline_stage") == "archived":
                        archived_at = existing.get("archived_at")
                        if archived_at:
                            contacts_skipped += 1
                            continue
                    else:
                        contacts_skipped += 1
                        continue

                if dry_run:
                    contacts_new += 1
                    logger.info(f"[dry-run] Would seed: {platform_id}")
                    continue

                icp_score = await _score_prospect(client, prospect, niche)

                contact_data = {
                    "platform": platform,
                    "platform_id": platform_id,
                    "name": prospect.get("name", ""),
                    "username": prospect.get("username", ""),
                    "bio": prospect.get("bio", ""),
                    "followers": prospect.get("followers", 0),
                    "pipeline_stage": "new",
                    "icp_score": icp_score,
                    "niche_id": niche_id,
                    "source": "discovery_agent",
                    "metadata": prospect.get("metadata", {}),
                }
                await upsert_contact(client, contact_data)
                await log_funnel_event(
                    client,
                    contact_id="pending",
                    from_stage="none",
                    to_stage="new",
                    triggered_by="discovery_agent",
                    metadata={"niche_id": niche_id, "platform": platform, "keyword": keyword},
                )
                contacts_new += 1

        except Exception as e:
            logger.error(f"[discovery] Error searching {platform}/{keyword}: {e}")
            errors.append(str(e))

    duration_ms = int((time.monotonic() - start) * 1000)

    if not dry_run:
        await log_discovery_run(
            client,
            niche_id=niche_id,
            platform=platform,
            search_query=", ".join(keywords[:5]),
            contacts_found=contacts_found,
            contacts_new=contacts_new,
            contacts_skipped=contacts_skipped,
            duration_ms=duration_ms,
            error="; ".join(errors) if errors else None,
        )

    return {
        "niche_id": niche_id,
        "platform": platform,
        "contacts_found": contacts_found,
        "contacts_new": contacts_new,
        "contacts_skipped": contacts_skipped,
        "duration_ms": duration_ms,
        "errors": errors,
    }


async def _search_platform(
    client: httpx.AsyncClient,
    platform: str,
    keyword: str,
    max_results: int,
) -> list[dict]:
    """Search for prospects via Market Research API."""
    resp = await client.post(
        f"{MARKET_RESEARCH_URL}/api/research/{platform}/search",
        json={"query": keyword, "limit": max_results},
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", data.get("profiles", []))


async def _score_prospect(
    client: httpx.AsyncClient,
    prospect: dict,
    niche: dict,
) -> float:
    """Score a prospect against ICP criteria using Claude."""
    icp_criteria = niche.get("icp_criteria", {})

    prompt = f"""Score this prospect from 0-100 on how well they match the Ideal Customer Profile.

ICP Criteria:
{icp_criteria}

Prospect:
- Name: {prospect.get('name', 'Unknown')}
- Bio: {prospect.get('bio', 'N/A')}
- Followers: {prospect.get('followers', 0)}
- Platform: {prospect.get('platform', 'unknown')}

Return ONLY a number from 0-100. No explanation."""

    try:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": SCORING_MODEL,
                "max_tokens": 10,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        text = resp.json()["content"][0]["text"].strip()
        score = float(text)
        return min(max(score, 0), 100)
    except Exception as e:
        logger.warning(f"Claude scoring failed, using heuristic: {e}")
        return _heuristic_score(prospect, icp_criteria)


def _heuristic_score(prospect: dict, icp_criteria: dict) -> float:
    """Fallback scoring when Claude is unavailable."""
    score = 50.0
    bio = (prospect.get("bio") or "").lower()
    followers = prospect.get("followers", 0)

    min_followers = icp_criteria.get("min_followers", 1000)
    max_followers = icp_criteria.get("max_followers", 100000)
    if min_followers <= followers <= max_followers:
        score += 15
    elif followers < min_followers:
        score -= 20
    elif followers > max_followers:
        score -= 10

    business_signals = icp_criteria.get("business_signals", [])
    for signal in business_signals:
        if signal.lower() in bio:
            score += 5

    topics = icp_criteria.get("content_topics", [])
    for topic in topics:
        if topic.lower() in bio:
            score += 3

    return min(max(score, 0), 100)
