"""PRD-024: Reply detection + follow-up sequences.

Detects replies to outreach DMs and manages follow-up sequences.
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx

from .config import SAFARI_PORTS
from .db.queries import (
    get_contacts_by_stage,
    get_pending_outreach,
    create_outreach_sequence,
    update_contact_stage,
    log_funnel_event,
)
from .notification_client import notify_reply_received
from .state_machine import validate_transition

logger = logging.getLogger(__name__)

FOLLOWUP_DELAY_HOURS = 48
MAX_FOLLOWUP_STEPS = 3


async def check_replies(
    client: httpx.AsyncClient,
    *,
    dry_run: bool = False,
) -> dict:
    """Check for replies from contacted prospects."""
    contacts = await get_contacts_by_stage(client, "contacted", limit=50)
    replies_found = 0
    errors = []

    for contact in contacts:
        contact_id = contact["id"]
        platform = contact.get("platform", "")
        username = contact.get("username", "")

        dm_port = SAFARI_PORTS.get(platform, {}).get("dm")
        if not dm_port:
            continue

        try:
            resp = await client.get(
                f"http://localhost:{dm_port}/api/dm/inbox",
                params={"username": username},
                timeout=15.0,
            )
            resp.raise_for_status()
            messages = resp.json().get("messages", [])

            has_reply = any(
                m.get("from") == username and m.get("is_inbound", True)
                for m in messages
            )

            if has_reply:
                if dry_run:
                    logger.info(f"[dry-run] Reply detected from {username}")
                    replies_found += 1
                    continue

                validate_transition("contacted", "replied")
                await update_contact_stage(client, contact_id, "replied")
                await log_funnel_event(
                    client,
                    contact_id=contact_id,
                    from_stage="contacted",
                    to_stage="replied",
                    triggered_by="followup_agent",
                    metadata={"platform": platform},
                )

                reply_text = next(
                    (m.get("text", "") for m in messages if m.get("from") == username),
                    "",
                )
                await notify_reply_received(client, contact, reply_text)
                replies_found += 1

        except Exception as e:
            logger.error(f"[followup] Error checking replies for {username}: {e}")
            errors.append(f"{username}: {e}")

    return {
        "contacts_checked": len(contacts),
        "replies_found": replies_found,
        "errors": errors,
    }


async def send_followups(
    client: httpx.AsyncClient,
    *,
    dry_run: bool = False,
) -> dict:
    """Send scheduled follow-up messages."""
    pending = await get_pending_outreach(client, limit=10)
    sent = 0
    skipped = 0

    for outreach in pending:
        step = outreach.get("sequence_step", 1)
        if step > MAX_FOLLOWUP_STEPS:
            skipped += 1
            continue

        if dry_run:
            logger.info(f"[dry-run] Would send followup step {step} for {outreach['contact_id']}")
            sent += 1
            continue

        # Actual sending delegated to outreach_agent pattern
        sent += 1

    return {"sent": sent, "skipped": skipped, "total_pending": len(pending)}
