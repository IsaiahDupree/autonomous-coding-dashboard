"""Human notification client — push + email + Telegram."""

import logging
from typing import Any

import httpx

from .config import SUPABASE_URL, get_supabase_headers
from .db.queries import log_notification

logger = logging.getLogger(__name__)

TELEGRAM_BOT_URL = "http://localhost:3434/api/telegram/send"


async def notify_human(
    client: httpx.AsyncClient,
    notification_type: str,
    body: str,
    *,
    contact_id: str | None = None,
    subject: str | None = None,
    channel: str = "telegram",
) -> bool:
    """Send a notification to the human operator and log it.

    Channels: telegram (default), push, email.
    Returns True if notification was delivered.
    """
    try:
        delivered = False

        if channel == "telegram":
            delivered = await _send_telegram(client, body)
        elif channel == "push":
            delivered = await _send_push(client, subject or notification_type, body)
        elif channel == "email":
            delivered = await _send_email(client, subject or notification_type, body)
        else:
            logger.warning(f"Unknown notification channel: {channel}")

        await log_notification(
            client,
            contact_id=contact_id,
            notification_type=notification_type,
            channel=channel,
            body=body,
            subject=subject,
        )

        return delivered

    except Exception as e:
        logger.error(f"Failed to send {channel} notification: {e}")
        return False


async def _send_telegram(client: httpx.AsyncClient, message: str) -> bool:
    try:
        resp = await client.post(
            TELEGRAM_BOT_URL,
            json={"message": message},
            timeout=10.0,
        )
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


async def _send_push(client: httpx.AsyncClient, title: str, body: str) -> bool:
    try:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/send_push_notification",
            headers=get_supabase_headers(),
            json={"title": title, "body": body},
            timeout=10.0,
        )
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False


async def _send_email(client: httpx.AsyncClient, subject: str, body: str) -> bool:
    try:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/send_email",
            headers=get_supabase_headers(),
            json={"subject": subject, "body": body},
            timeout=10.0,
        )
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


async def notify_call_booked(
    client: httpx.AsyncClient,
    contact: dict,
) -> bool:
    """High-priority notification: a prospect booked a call."""
    name = contact.get("name", "Unknown")
    platform = contact.get("platform", "unknown")
    body = (
        f"Call booked! {name} ({platform}) moved to call_booked stage. "
        f"Check CRM for details."
    )
    return await notify_human(
        client,
        notification_type="call_booked",
        body=body,
        contact_id=contact.get("id"),
        subject=f"Call Booked: {name}",
        channel="telegram",
    )


async def notify_reply_received(
    client: httpx.AsyncClient,
    contact: dict,
    reply_preview: str,
) -> bool:
    """Notification: a prospect replied to outreach."""
    name = contact.get("name", "Unknown")
    platform = contact.get("platform", "unknown")
    body = (
        f"Reply from {name} ({platform}): \"{reply_preview[:200]}\". "
        f"Review and respond."
    )
    return await notify_human(
        client,
        notification_type="reply_received",
        body=body,
        contact_id=contact.get("id"),
        subject=f"Reply: {name}",
        channel="telegram",
    )
