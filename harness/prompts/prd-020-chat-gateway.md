# PRD-020: Chat Gateway & Multi-Channel Routing (ClawBot)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-020-CHAT-GATEWAY-ROUTING.md
- **Priority**: P1

## Context

The OpenQualls bot currently only handles Telegram. Every new channel (Slack, Discord, SMS, web) would require duplicating routing logic, security model, and delivery formatting. There is no canonical internal event shape and no cross-channel identity.

### Current Architecture
- `telegram_command_bot.py` — Telegram long-poll, 150+ regex intent patterns, command dispatch
- `telegram_ai_engine.py` — Claude CLI-based AI engine, tool calling, conversation history
- `health_server.py` — HTTP API (port 8765), inbound webhook receiver for Safari events
- `approval_gate.py` — approval queue for risky actions
- `service_registry.py` — 194 topics across 31 services

### What Needs to Be Built
New file: `chat_gateway.py` (canonical event normalization, channel adapters, identity graph, deduper)
New file: `identity_graph.py` (cross-platform canonical_user_id resolution)
New file: `message_normalizer.py` (platform → ChatMessageEvent)
New file: `chat_router.py` (rules router → LLM router → fallback router pipeline)
New file: `delivery_adapter.py` (platform-specific message formatting and rate-limited delivery)

### Canonical Event Shape (ChatMessageEvent)
```python
@dataclass
class ChatMessageEvent:
    event_id: str          # idempotency key
    channel: str           # telegram|slack|discord|twilio|web
    canonical_user_id: str # resolved from identity_graph
    thread_id: str         # conversation thread per user+channel
    text: str
    attachments: list
    received_at: datetime
    raw: dict              # original platform payload
```

## Task

Implement the Chat Gateway as described in PRD-020:

1. **Create chat_gateway.py** — ChatMessageEvent dataclass, main gateway entry point
2. **Slack adapter** — POST /webhooks/slack, HMAC-SHA256 signature verification with 5-min replay window
3. **Slack 2-phase ACK** — return `{ok: true}` within 3s, process async, post reply via chat.postMessage
4. **Discord adapter** — POST /webhooks/discord, Ed25519 signature verification (install `PyNaCl`)
5. **Discord 2-phase ACK** — return DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, follow-up via editOriginalInteractionResponse
6. **Twilio SMS adapter** — POST /webhooks/twilio, HMAC-SHA1 signature verification
7. **Web chat adapter** — POST /webhooks/web, WORKER_SECRET Bearer auth
8. **Deduper** — SQLite idempotency store (event_id, 1h TTL), skip duplicate webhook retries
9. **Create identity_graph.py** — resolve canonical_user_id, upsert to crm_platform_accounts (Supabase)
10. **Create conversation_registry.py** — thread_id per canonical_user_id + channel
11. **Create message_normalizer.py** — each platform format → ChatMessageEvent
12. **Create chat_router.py** — existing rules router + LLM router + fallback (clarifying question)
13. **Create delivery_adapter.py** — Slack mrkdwn, Discord embeds, SMS plain text, Telegram HTML
14. **Per-platform rate limiter** — token bucket, retry with exponential backoff (3 attempts)
15. **Dead-letter queue** — SQLite table for failed delivery outcomes
16. **Add config vars** — SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to config.py
17. **Register new webhook routes** in health_server.py
18. **Unit tests** — sig verification for all 3 platforms, deduper, identity graph upsert, normalizer

## Signature Verification Reference

```python
# Slack
import hmac, hashlib, time
def verify_slack(body: bytes, timestamp: str, sig: str, secret: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False
    base = f"v0:{timestamp}:{body.decode()}"
    expected = "v0=" + hmac.new(secret.encode(), base.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)

# Discord (requires PyNaCl)
from nacl.signing import VerifyKey
def verify_discord(body: bytes, timestamp: str, sig: str, pub_key: str) -> bool:
    vk = VerifyKey(bytes.fromhex(pub_key))
    vk.verify((timestamp.encode() + body), bytes.fromhex(sig))

# Twilio
import hmac, hashlib, base64
def verify_twilio(url: str, params: dict, sig: str, secret: str) -> bool:
    s = url + "".join(f"{k}{v}" for k, v in sorted(params.items()))
    computed = base64.b64encode(hmac.new(secret.encode(), s.encode(), hashlib.sha1).digest()).decode()
    return hmac.compare_digest(computed, sig)
```

## Testing

```bash
# Unit tests
python3 -m pytest tests/ -v -k "gateway or chat or slack or discord"

# Full test suite (must not regress)
python3 -m pytest tests/ -v
```

## Key Files
- `health_server.py` — add POST /webhooks/slack, /webhooks/discord, /webhooks/twilio, /webhooks/web
- `config.py` — add SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- `service_registry.py` — add gateway.channel_status topics

## CRITICAL: Feature Tracking

After completing each task, update `prd-020-features.json` in the project root:

```bash
python3 -c "
import json
with open('prd-020-features.json') as f: data = json.load(f)
for feat in data['features']:
    if feat['id'] == 'GW-001': feat['passes'] = True
with open('prd-020-features.json', 'w') as f: json.dump(data, f, indent=2)
print('Updated GW-001 to passes=true')
"
```

Do this for EVERY feature you complete.

## Git Workflow

```bash
git add -A && git commit -m "feat(prd-020): <description>"
```

## Constraints
- Do NOT break existing Telegram bot functionality
- Do NOT break existing tests (currently 308+)
- Install PyNaCl for Discord Ed25519 verification: `pip install PyNaCl`
- Config vars may not be set yet — gate each adapter with `if config.SLACK_BOT_TOKEN:` style guards
- No mock data — real signature verification required (can use test vectors from platform docs)
- Supabase project: ivhfuhxorppptyuofbgq (crm_platform_accounts for identity graph)
