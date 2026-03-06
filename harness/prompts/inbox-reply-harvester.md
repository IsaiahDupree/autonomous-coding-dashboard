# InboxReplyHarvester — ACD Build Prompt

## Mission
Build `inbox_reply_harvester.py` in actp-worker. This agent polls all 4 DM platform inboxes
every 60 minutes, detects new inbound replies from CRM contacts, and advances their pipeline
stage from `contacted` → `replied`. This closes the most expensive gap in the acquisition
pipeline: replied leads sitting unread with no CRM update.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## Output Files
- `inbox_reply_harvester.py`
- `tests/test_inbox_reply_harvester.py`

---

## Platform Inbox Endpoints (all already running)

```python
INBOX_ENDPOINTS = {
    "instagram": {
        "conversations": "http://localhost:3001/api/messages/conversations",
        "messages":      "http://localhost:3001/api/messages/conversation/{id}",
    },
    "twitter": {
        "conversations": "http://localhost:3003/api/messages/conversations",
        "messages":      "http://localhost:3003/api/messages/conversation/{id}",
    },
    "tiktok": {
        "conversations": "http://localhost:3102/api/messages/conversations",
        "messages":      "http://localhost:3102/api/messages/conversation/{id}",
    },
    "linkedin": {
        "conversations": "http://localhost:3105/api/linkedin/messages/conversations",
        "messages":      "http://localhost:3105/api/linkedin/messages/conversation/{id}",
    },
}
```

---

## Full Implementation

```python
# inbox_reply_harvester.py
"""
InboxReplyHarvester
Polls DM platform inboxes for new inbound replies from CRM contacts.
Advances pipeline stage contacted → replied.
Logs all inbound messages to crm_messages.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import httpx

log = logging.getLogger(__name__)

INBOX_ENDPOINTS = {
    "instagram": {
        "conversations": "http://localhost:3001/api/messages/conversations",
        "messages":      "http://localhost:3001/api/messages/conversation/{id}",
    },
    "twitter": {
        "conversations": "http://localhost:3003/api/messages/conversations",
        "messages":      "http://localhost:3003/api/messages/conversation/{id}",
    },
    "tiktok": {
        "conversations": "http://localhost:3102/api/messages/conversations",
        "messages":      "http://localhost:3102/api/messages/conversation/{id}",
    },
    "linkedin": {
        "conversations": "http://localhost:3105/api/linkedin/messages/conversations",
        "messages":      "http://localhost:3105/api/linkedin/messages/conversation/{id}",
    },
}

PLATFORM_HANDLE_COLUMNS = {
    "instagram": "instagram_handle",
    "twitter":   "twitter_handle",
    "tiktok":    "tiktok_handle",
    "linkedin":  "linkedin_url",
}


@dataclass
class HarvestResult:
    platform: str
    conversations_checked: int
    new_replies_found: int
    pipeline_advances: int
    errors: list


class InboxReplyHarvester:

    def __init__(self, data_plane):
        self.dp = data_plane
        self._http = httpx.AsyncClient(timeout=30)

    async def _get_conversations(self, platform: str) -> list[dict]:
        url = INBOX_ENDPOINTS[platform]["conversations"]
        try:
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("conversations", data.get("data", []))
        except Exception as e:
            log.warning(f"[Harvest] {platform} conversations fetch failed: {e}")
            return []

    async def _get_messages(self, platform: str, conversation_id: str) -> list[dict]:
        url = INBOX_ENDPOINTS[platform]["messages"].format(id=conversation_id)
        try:
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("messages", data.get("data", []))
        except Exception as e:
            log.warning(f"[Harvest] {platform} messages fetch failed ({conversation_id}): {e}")
            return []

    async def _lookup_contact_by_handle(
        self, platform: str, handle: str
    ) -> Optional[dict]:
        """Find CRM contact by platform handle. Returns contact row or None."""
        handle_col = PLATFORM_HANDLE_COLUMNS.get(platform)
        if not handle_col:
            return None
        rows = await self.dp.supabase_select(
            "crm_contacts",
            filters={handle_col: handle},
            limit=1,
        )
        return rows[0] if rows else None

    async def _record_inbound_message(
        self,
        contact_id: str,
        platform: str,
        message_text: str,
        received_at: datetime,
        conversation_id: str,
    ) -> None:
        """Write inbound message to crm_messages."""
        await self.dp.supabase_insert("crm_messages", {
            "contact_id":          contact_id,
            "platform":            platform,
            "message_text":        message_text,
            "message_type":        "dm",
            "is_outbound":         False,
            "sent_by_automation":  False,
            "conversation_id":     conversation_id,
            "sent_at":             received_at.isoformat(),
        })

    async def _advance_pipeline(self, contact: dict, platform: str) -> bool:
        """Advance contact from contacted → replied. Returns True if advanced."""
        if contact.get("pipeline_stage") != "contacted":
            return False
        await self.dp.supabase_update(
            "crm_contacts",
            contact["id"],
            {"pipeline_stage": "replied", "updated_at": datetime.now(timezone.utc).isoformat()},
        )
        await self.dp.supabase_insert("acq_funnel_events", {
            "contact_id":  contact["id"],
            "from_stage":  "contacted",
            "to_stage":    "replied",
            "trigger":     "reply_detected",
            "platform":    platform,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info(f"[Harvest] Pipeline advanced: {contact.get('display_name','?')} → replied ({platform})")
        return True

    async def _stamp_conversation_harvested(self, conversation_id: str) -> None:
        """Update crm_conversations.last_harvested_at."""
        rows = await self.dp.supabase_select(
            "crm_conversations",
            filters={"platform_conversation_id": conversation_id},
            limit=1,
        )
        if rows:
            await self.dp.supabase_update(
                "crm_conversations",
                rows[0]["id"],
                {"last_harvested_at": datetime.now(timezone.utc).isoformat()},
            )

    async def harvest_platform(self, platform: str) -> HarvestResult:
        result = HarvestResult(
            platform=platform,
            conversations_checked=0,
            new_replies_found=0,
            pipeline_advances=0,
            errors=[],
        )

        conversations = await self._get_conversations(platform)
        result.conversations_checked = len(conversations)

        for convo in conversations:
            try:
                # Normalize conversation shape across platforms
                convo_id = (
                    convo.get("id")
                    or convo.get("conversationId")
                    or convo.get("thread_id")
                    or ""
                )
                participants = convo.get("participants", [])
                # Platform-specific handle extraction
                remote_handle = None
                for p in participants:
                    h = (
                        p.get("username")
                        or p.get("handle")
                        or p.get("name")
                    )
                    if h:
                        remote_handle = h
                        break
                if not remote_handle:
                    remote_handle = convo.get("username") or convo.get("handle")

                if not remote_handle or not convo_id:
                    continue

                contact = await self._lookup_contact_by_handle(platform, remote_handle)
                if not contact:
                    continue  # Not a tracked CRM contact

                # Get last harvest time for this conversation
                crm_convos = await self.dp.supabase_select(
                    "crm_conversations",
                    filters={"platform_conversation_id": convo_id},
                    limit=1,
                )
                last_harvested = None
                if crm_convos and crm_convos[0].get("last_harvested_at"):
                    last_harvested = datetime.fromisoformat(crm_convos[0]["last_harvested_at"])

                # Pull messages
                messages = await self._get_messages(platform, convo_id)
                new_replies = [
                    m for m in messages
                    if not (m.get("is_outbound") or m.get("fromMe") or m.get("sent_by_me"))
                    and (
                        last_harvested is None
                        or (
                            m.get("created_at") or m.get("timestamp") or ""
                        ) > last_harvested.isoformat()
                    )
                ]

                for msg in new_replies:
                    text = (
                        msg.get("text")
                        or msg.get("message")
                        or msg.get("content")
                        or ""
                    )
                    ts_raw = msg.get("created_at") or msg.get("timestamp") or ""
                    try:
                        received_at = datetime.fromisoformat(ts_raw) if ts_raw else datetime.now(timezone.utc)
                    except ValueError:
                        received_at = datetime.now(timezone.utc)

                    await self._record_inbound_message(
                        contact_id=contact["id"],
                        platform=platform,
                        message_text=text,
                        received_at=received_at,
                        conversation_id=convo_id,
                    )
                    result.new_replies_found += 1
                    advanced = await self._advance_pipeline(contact, platform)
                    if advanced:
                        result.pipeline_advances += 1

                await self._stamp_conversation_harvested(convo_id)

            except Exception as e:
                log.error(f"[Harvest] Error processing convo {convo.get('id','?')}: {e}")
                result.errors.append(str(e))

        return result

    async def run(self) -> dict:
        """Harvest all platforms. Returns summary dict."""
        platforms = list(INBOX_ENDPOINTS.keys())
        results = await asyncio.gather(
            *[self.harvest_platform(p) for p in platforms],
            return_exceptions=True,
        )
        summary = {
            "total_conversations_checked": 0,
            "total_new_replies": 0,
            "total_pipeline_advances": 0,
            "per_platform": {},
            "errors": [],
        }
        for r in results:
            if isinstance(r, Exception):
                summary["errors"].append(str(r))
                continue
            summary["total_conversations_checked"] += r.conversations_checked
            summary["total_new_replies"]            += r.new_replies_found
            summary["total_pipeline_advances"]      += r.pipeline_advances
            summary["per_platform"][r.platform] = {
                "conversations": r.conversations_checked,
                "replies":       r.new_replies_found,
                "advances":      r.pipeline_advances,
                "errors":        r.errors,
            }
        log.info(f"[Harvest] Run complete: {summary['total_new_replies']} replies, "
                 f"{summary['total_pipeline_advances']} advances")
        return summary

    async def close(self):
        await self._http.aclose()
```

---

## InboxReplyExecutor (add to `workflow_executors.py`)

```python
class InboxReplyExecutor:
    task_type = "inbox_reply"

    def __init__(self, data_plane):
        self.dp = data_plane

    async def execute(self, task: dict) -> dict:
        from inbox_reply_harvester import InboxReplyHarvester
        action = task.get("action", "harvest")
        harvester = InboxReplyHarvester(self.dp)
        try:
            if action == "harvest":
                return await harvester.run()
            elif action == "harvest_platform":
                platform = task.get("platform", "instagram")
                result = await harvester.harvest_platform(platform)
                return {
                    "platform":      result.platform,
                    "conversations": result.conversations_checked,
                    "replies":       result.new_replies_found,
                    "advances":      result.pipeline_advances,
                    "errors":        result.errors,
                }
            elif action == "status":
                rows = await self.dp.supabase_select(
                    "crm_contacts",
                    filters={"pipeline_stage": "replied"},
                    limit=20,
                )
                return {"replied_contacts": len(rows), "recent": rows[:5]}
            else:
                return {"error": f"Unknown action: {action}"}
        finally:
            await harvester.close()
```

---

## Cron Entry (add to `cron_definitions.py`)

```python
CronJob(
    name="inbox_reply_harvest",
    task_type="inbox_reply",
    action="harvest",
    schedule="0 * * * *",   # every hour on the hour
    enabled=True,
    params={},
),
```

---

## Tests Required

```python
test_harvest_finds_new_inbound_message()
test_harvest_skips_outbound_messages()
test_harvest_advances_pipeline_contacted_to_replied()
test_harvest_does_not_double_advance_already_replied()
test_harvest_skips_unknown_handles_not_in_crm()
test_harvest_stamps_last_harvested_at()
test_harvest_ignores_messages_before_last_harvested()
test_run_harvests_all_four_platforms()
test_platform_service_down_does_not_crash_other_platforms()
```
