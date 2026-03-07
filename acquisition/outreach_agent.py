"""PRD-024: DM generation + sending.

Generates personalized DMs via Claude and sends through Safari DM services.
"""

import logging
from datetime import datetime, timezone

import httpx

from .config import ANTHROPIC_API_KEY, DM_GENERATION_MODEL, SAFARI_PORTS
from .daily_caps import check_cap, increment_cap
from .db.queries import (
    create_outreach_sequence,
    get_active_variants,
    get_contacts_by_stage,
    mark_outreach_sent,
    update_contact_stage,
    log_funnel_event,
)
from .state_machine import validate_transition

logger = logging.getLogger(__name__)

DM_SYSTEM_PROMPT = """You are writing a short, casual DM to a creator/founder on social media.
Rules:
- Max 3 sentences
- Reference something specific about their content or bio
- Include a soft CTA (question, not pitch)
- Sound like a real person, not a bot
- No emojis in first message
- No links in first message"""


async def run_outreach(
    client: httpx.AsyncClient,
    *,
    batch_size: int = 10,
    dry_run: bool = False,
) -> dict:
    """Send DMs to contacts in ready_for_dm stage."""
    contacts = await get_contacts_by_stage(client, "ready_for_dm", limit=batch_size)
    sent = 0
    skipped = 0
    errors = []

    for contact in contacts:
        contact_id = contact["id"]
        platform = contact.get("platform", "")
        username = contact.get("username", "")

        if "dm" not in SAFARI_PORTS.get(platform, {}):
            skipped += 1
            continue

        allowed, current, limit = await check_cap(client, platform, "dm")
        if not allowed:
            logger.info(f"[outreach] Daily DM cap reached for {platform} ({current}/{limit})")
            break

        try:
            message = await _generate_dm(client, contact)

            if dry_run:
                logger.info(f"[dry-run] Would DM {username} on {platform}: {message[:80]}...")
                sent += 1
                continue

            dm_port = SAFARI_PORTS[platform]["dm"]
            resp = await client.post(
                f"http://localhost:{dm_port}/api/dm/send",
                json={"recipient": username, "message": message},
                timeout=30.0,
            )
            resp.raise_for_status()

            await create_outreach_sequence(
                client,
                contact_id=contact_id,
                platform=platform,
                sequence_step=1,
                message_text=message,
            )
            await mark_outreach_sent(client, contact_id)

            validate_transition("ready_for_dm", "contacted")
            await update_contact_stage(client, contact_id, "contacted")
            await log_funnel_event(
                client,
                contact_id=contact_id,
                from_stage="ready_for_dm",
                to_stage="contacted",
                triggered_by="outreach_agent",
                metadata={"platform": platform, "message_length": len(message)},
            )
            await increment_cap(client, platform, "dm")
            sent += 1

        except Exception as e:
            logger.error(f"[outreach] Error sending DM to {username}: {e}")
            errors.append(f"{username}: {e}")

    return {
        "total_ready": len(contacts),
        "sent": sent,
        "skipped": skipped,
        "errors": errors,
    }


async def _generate_dm(
    client: httpx.AsyncClient,
    contact: dict,
) -> str:
    """Generate a personalized DM using Claude."""
    name = contact.get("name", "")
    bio = contact.get("bio", "")
    platform = contact.get("platform", "")

    user_prompt = f"""Write a DM to this person:
- Name: {name}
- Platform: {platform}
- Bio: {bio}

Write the DM text only. No quotes, no "Subject:", just the message."""

    try:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": DM_GENERATION_MODEL,
                "max_tokens": 200,
                "system": DM_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"].strip()
    except Exception as e:
        logger.warning(f"Claude DM generation failed, using template: {e}")
        return _template_dm(contact)


def _template_dm(contact: dict) -> str:
    """Fallback template when Claude is unavailable."""
    name = contact.get("name", "").split()[0] if contact.get("name") else "Hey"
    return (
        f"Hi {name}, I came across your profile and really liked what you're building. "
        f"I work on AI automation for service businesses — would love to hear more about "
        f"what you're working on. What's your biggest bottleneck right now?"
    )
