# PRD-020: Chat Gateway & Multi-Channel Routing

**Status:** Draft  
**Priority:** P1  
**Created:** 2026-02-25  
**Target:** `actp-worker` (new `chat_gateway.py`, `identity_graph.py`, `message_normalizer.py`, `chat_router.py`, `delivery_adapter.py`)

---

## 1. Problem Statement

The system currently has a single chat interface: Telegram via `telegram_command_bot.py` + `telegram_ai_engine.py`. Every channel integration (Slack, Discord, SMS, web) would require duplicating the routing logic, security model, conversation memory, and delivery formatting that already exist for Telegram. There is no canonical internal event shape, no cross-channel identity, and no systematic way to test routing accuracy or run A/B experiments on agent behaviour.

**Goal:** Event-driven chat gateway with canonical message events + deterministic/LLM hybrid routing + two-phase ack/follow-up + replayable event log for testing and A/B.

---

## 2. Code Audit — What Exists Today

### ✅ Fully covered in current code

| Component | File | Notes |
|-----------|------|-------|
| Telegram channel adapter (ingress) | `telegram_command_bot.py` | Long-poll loop, slash commands, message dispatch |
| Security classification (ADMIN/EXTERNAL) | `telegram_command_bot.py:37-47` | User ID allowlist, external sanitization |
| 2-phase ACK (`on_receipt` + `on_progress`) | `telegram_ai_engine.py:1683-1695` | Receipt fires before Claude, progress per tool round |
| Rules Router (deterministic) | `telegram_command_bot.py:52-150` | 150+ regex patterns → ACTP topic |
| LLM/Classifier Router | `telegram_ai_engine.py:1799-1809` | Claude CLI intent → TOOL_CALL |
| Multi-tool chaining (up to 5 rounds) | `telegram_ai_engine.py:1817-1930` | Web search → fetch_url → dispatch chains |
| Self-correction (unknown topic) | `telegram_ai_engine.py:1866-1891` | Re-asks Claude with suggestions |
| Approval gate (Guardrails) | `approval_gate.py` | Paid ads, bulk DMs, code deploy |
| Tool/service registry | `service_registry.py` | 194 topics across 31 services |
| Conversation memory (per-user) | `telegram_ai_engine.py:48-134` | Sliding window + Supabase persistence |
| Audit logging | `telegram_command_bot.py:211-226` | Every command → `actp_agent_audit_log` |
| Inbound webhook receiver (Safari) | `health_server.py:142-208` | Events → handler dispatch |
| Rate limiting | `health_server.py:36-89` | 60 req/min per IP, localhost exempt |
| `WORKER_SECRET` auth | `health_server.py:293-303` | Bearer token on all POST endpoints |
| Job model (received → started → running → completed) | `telegram_ai_engine.py:1630-1658` | `actp_jobs` table |
| Delivery adapter (send, typing indicator) | `telegram_command_bot.py:167-194` | `sendMessage`, `sendChatAction` |

### ❌ Gaps — required by this PRD

| Component | Gap | Section |
|-----------|-----|---------|
| Slack / Discord / SMS / web channel adapters | No ingress beyond Telegram | §4.1 |
| Canonical `ChatMessageEvent` shape | No normalized internal format | §4.2 |
| Webhook signature verification (Slack/Discord/Twilio) | Only Safari has a handler; no sig verify | §4.1 |
| Deduper / idempotency store | Duplicate webhook retries processed twice | §4.2 |
| Identity Graph (`canonical_user_id`) | No cross-platform user identity | §4.3 |
| Conversation Registry (`thread_id`) | Telegram-only; no cross-channel thread continuity | §4.3 |
| Router config as data (not hardcode) | `INTENT_MAP` is hardcoded Python | §4.4 |
| Fallback Router (clarify / human queue) | No "I didn't understand, can you clarify?" path | §4.4 |
| Routing metrics + A/B Experiment Service | No variant assignment, no routing accuracy tracking | §4.5 |
| Message Composer (platform-specific formatting) | Slack mrkdwn / Discord embeds / SMS plain not handled | §4.6 |
| Delivery rate limiter + backoff (per platform) | No per-platform rate limit on egress | §4.6 |
| 3s ACK deadline enforcement for Slack/Discord | No timer, no defer-then-followup pattern | §4.1 |
| Dead-letter queue for failed deliveries | No DLQ; failed sends are silently dropped | §4.6 |
| Replay harness for router testing | No event log replay | §4.7 |
| Golden conversation test fixtures | No baseline conversation snapshots | §4.7 |

---

## 3. Architecture

### End-to-End Flow

```
Channel Adapter (Ingress)
  → Verify signature
  → ACK immediately (<3s for Slack/Discord)
  → Normalize → ChatMessageEvent
  → Dedupe check (idempotency key)
  → Enqueue to chat_event_queue

Chat Router
  → Identity Graph: resolve canonical_user_id
  → Conversation Registry: resolve thread_id
  → Rules Router (deterministic, cheap)
  → LLM Router (flexible, costs tokens)
  → Guardrails / Approval Gate
  → Fallback Router if no confident route

Agent Worker (existing)
  → dispatch ACTP topic(s) via service_registry
  → multi-tool chaining (up to 5 rounds)
  → emits progress heartbeats

Delivery Adapter (Egress)
  → Message Composer (platform formatting)
  → Send reply to correct channel/thread
  → Rate limit + retry with backoff
  → DLQ on persistent failure
```

---

## 4. Gap Specifications

### §4.1 Channel Adapters + Signature Verification

**New file:** `chat_gateway.py`

#### Inbound adapters

| Platform | Endpoint | Verification | ACK deadline |
|----------|----------|-------------|-------------|
| Telegram | existing long-poll | Bot token | none (polling) |
| Slack | `POST /webhooks/slack` | `X-Slack-Signature` + `X-Slack-Request-Timestamp` HMAC-SHA256 | 3s |
| Discord | `POST /webhooks/discord` | `X-Signature-Ed25519` + `X-Signature-Timestamp` Ed25519 | 3s |
| Twilio SMS | `POST /webhooks/twilio` | `X-Twilio-Signature` HMAC-SHA1 | ~15s (no hard limit) |
| Web chat | `POST /webhooks/web` | `WORKER_SECRET` Bearer | none |

**Signature verification logic (per platform):**

```python
# Slack
import hmac, hashlib, time
def verify_slack(body: bytes, timestamp: str, sig: str, secret: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False   # replay attack window
    base = f"v0:{timestamp}:{body.decode()}"
    expected = "v0=" + hmac.new(secret.encode(), base.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)

# Discord
from nacl.signing import VerifyKey
def verify_discord(body: bytes, timestamp: str, sig: str, pub_key: str) -> bool:
    vk = VerifyKey(bytes.fromhex(pub_key))
    vk.verify((timestamp.encode() + body), bytes.fromhex(sig))  # raises if invalid

# Twilio
import hmac, hashlib, base64
def verify_twilio(url: str, params: dict, sig: str, secret: str) -> bool:
    s = url + "".join(f"{k}{v}" for k, v in sorted(params.items()))
    computed = base64.b64encode(hmac.new(secret.encode(), s.encode(), hashlib.sha1).digest()).decode()
    return hmac.compare_digest(computed, sig)
```

**2-phase response for Slack/Discord (ACK deadline enforcement):**
```python
async def handle_slack(request):
    # Phase 1: ACK within 3s
    asyncio.create_task(_process_slack_async(await request.json()))
    return web.json_response({"ok": True})   # ← returns immediately

async def _process_slack_async(body):
    event = normalize_slack(body)
    await enqueue(event)          # worker picks up and processes
    # follow-up posted to response_url or via chat.postMessage
```

**New routes added to `health_server.py`:**
```python
app.router.add_post("/webhooks/slack",   handle_slack_webhook)
app.router.add_post("/webhooks/discord", handle_discord_webhook)
app.router.add_post("/webhooks/twilio",  handle_twilio_webhook)
app.router.add_post("/webhooks/web",     handle_web_webhook)
```

---

### §4.2 Canonical `ChatMessageEvent` + Deduper

**New file:** `message_normalizer.py`

**Canonical shape:**
```python
@dataclass
class ChatMessageEvent:
    event_type: str          # "chat.message.received"
    source: str              # "telegram" | "slack" | "discord" | "twilio" | "web"
    message_id: str          # platform-native ID (idempotency key)
    thread_id: str           # resolved by Conversation Registry
    canonical_user_id: str   # resolved by Identity Graph
    channel_context: dict    # {"workspace_id": "...", "channel_id": "..."}
    text: str
    attachments: list[dict]  # [{"type": "image|file", "url": "..."}]
    received_at: str         # ISO-8601
    reply_deadline_ms: int   # 3000 for Slack/Discord, 0 for async-only
    raw_payload: dict        # original platform payload (for debug/replay)
    idempotency_key: str     # f"{source}:{message_id}"
```

**Normalizers per platform:**
```python
def normalize_telegram(update: dict) -> ChatMessageEvent: ...
def normalize_slack(event: dict) -> ChatMessageEvent: ...
def normalize_discord(interaction: dict) -> ChatMessageEvent: ...
def normalize_twilio(form: dict) -> ChatMessageEvent: ...
def normalize_web(body: dict) -> ChatMessageEvent: ...
```

**Deduper (idempotency store):**
```python
# In-process LRU (last 10K keys, 1hr TTL) + Supabase fallback
_seen: dict[str, float] = {}  # idempotency_key -> received_at epoch

def is_duplicate(key: str) -> bool:
    if key in _seen:
        return True
    _seen[key] = time.time()
    _evict_old()
    return False
```

**Supabase table:**
```sql
actp_chat_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  source          TEXT NOT NULL,
  canonical_user_id TEXT,
  thread_id       TEXT,
  text            TEXT,
  raw_payload     JSONB,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'queued'  -- queued | processing | done | failed
)
```

This table **is the replayable event log** (§4.7).

---

### §4.3 Identity Graph + Conversation Registry

**New file:** `identity_graph.py`

**Identity Graph — map any platform identity → `canonical_user_id`:**
```python
async def resolve_user(source: str, platform_id: str) -> str:
    """
    Telegram user 123 → canonical_user_id
    Slack user U012ABC → same canonical_user_id if same person
    Returns existing canonical_user_id or creates new one.
    """
```

```sql
actp_identity_graph (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_user_id TEXT NOT NULL,
  source           TEXT NOT NULL,   -- "telegram" | "slack" | "discord" | "twilio"
  platform_id      TEXT NOT NULL,   -- e.g. Telegram user_id, Slack user ID
  platform_username TEXT,
  linked_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, platform_id)
)
```

**Conversation Registry — map channel thread → `thread_id`:**
```python
async def resolve_thread(source: str, channel_context: dict) -> str:
    """
    Slack: channel_id + thread_ts → thread_id
    Discord: guild_id + channel_id + interaction_id → thread_id
    Telegram: chat_id → thread_id
    Twilio: from_number → thread_id (time-windowed session)
    """
```

```sql
actp_conversation_threads (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT UNIQUE NOT NULL,
  source    TEXT NOT NULL,
  channel_context JSONB NOT NULL,  -- {"channel_id": "...", "thread_ts": "..."}
  canonical_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
)
```

**Permission/Workspace context:** extend `classify_message()` in `telegram_command_bot.py` to accept `canonical_user_id` and check `actp_identity_graph.source` for workspace-level permissions.

---

### §4.4 Router Config as Data + Fallback Router

**Modify:** `service_registry.py` (add `actp_router_rules` table)  
**New file:** `chat_router.py`

**Router stack (unchanged logic, now config-driven):**
```
1. Rules Router   — DB table: actp_router_rules (pattern, topic, priority, active)
2. LLM Router     — Claude CLI TOOL_CALL (existing telegram_ai_engine._call_claude)
3. Guardrails     — approval_gate.py (existing)
4. Fallback       — clarify or handoff
```

**`actp_router_rules` table (replaces hardcoded `INTENT_MAP`):**
```sql
actp_router_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern     TEXT NOT NULL,    -- regex
  topic       TEXT NOT NULL,    -- ACTP topic e.g. "system.heartbeat"
  params      JSONB DEFAULT '{}',
  hint        TEXT,             -- progress message
  priority    INT DEFAULT 100,  -- lower = checked first
  active      BOOL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

Seed with all 150 existing `INTENT_MAP` entries on first run. `match_intent()` reads from DB (cached 5min) instead of the hardcoded list. `self_upgrade.add_topic` action already exists in `telegram_ai_engine.py` — wire it to write to this table.

**Fallback Router:**
```python
async def fallback_route(event: ChatMessageEvent) -> str:
    """
    Called when Rules Router + LLM Router both yield no confident route.
    Options:
      1. Low-confidence LLM → clarification question
      2. Repeated failure → human escalation queue
    """
    if event.source in ("slack", "discord"):
        return "clarify"    # ask user to rephrase
    return "escalate"       # → actp_approval_queue with type=human_escalation
```

**Router output contract:**
```python
@dataclass
class RouterDecision:
    agent_id: str           # "openqualls" (only agent today)
    topic: str              # ACTP topic to dispatch
    params: dict
    memory_scope: str       # "thread" | "user" | "global"
    response_mode: str      # "instant" | "two_phase" | "streaming"
    safety_policy: str      # "standard" | "high_risk" | "admin_only"
    budget_usd: float       # max spend for this request (from credit_governor)
    experiment_variant: str # from Experiment Service (§4.5)
    route_source: str       # "rules" | "llm" | "fallback"
```

---

### §4.5 Experiment / A/B Service

**New table + minimal service in `chat_router.py`:**

```sql
actp_router_experiments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  variant_a    JSONB NOT NULL,   -- router config for A
  variant_b    JSONB NOT NULL,   -- router config for B
  traffic_pct  INT DEFAULT 50,   -- % of users assigned to B
  active       BOOL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
)
actp_router_experiment_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID REFERENCES actp_router_experiments,
  canonical_user_id TEXT,
  variant         TEXT,           -- "A" | "B"
  event_id        UUID REFERENCES actp_chat_events,
  -- Outcome metrics
  time_to_first_ack_ms  INT,
  time_to_final_ms      INT,
  tool_call_count       INT,
  cost_usd              FLOAT,
  route_source          TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
)
```

**Assignment logic (sticky per user):**
```python
def assign_variant(canonical_user_id: str, experiment_id: str, traffic_pct: int) -> str:
    # Deterministic: hash(user_id + experiment_id) % 100 < traffic_pct → "B"
    h = int(hashlib.md5(f"{canonical_user_id}:{experiment_id}".encode()).hexdigest(), 16)
    return "B" if (h % 100) < traffic_pct else "A"
```

**Metrics measured per request:**
- `time_to_first_ack_ms` — receipt callback fired
- `time_to_final_ms` — completed job
- `tool_call_count` — rounds in chaining loop
- `cost_usd` — from `actp_credit_usage` (PRD-019 §4.2)
- `route_source` — rules / llm / fallback

---

### §4.6 Message Composer + Delivery Adapter with DLQ

**New file:** `delivery_adapter.py`

**Message Composer — platform-specific formatting:**
```python
def compose(text: str, source: str, thread_ctx: dict) -> dict:
    if source == "slack":
        return {"text": _to_slack_mrkdwn(text), "thread_ts": thread_ctx.get("thread_ts")}
    if source == "discord":
        return {"content": text[:2000], "flags": 64}   # ephemeral
    if source == "twilio":
        return {"Body": text[:1600]}   # SMS limit
    if source == "telegram":
        return {"text": text[:4000], "parse_mode": "Markdown"}
    return {"text": text}  # web / fallback

def _to_slack_mrkdwn(text: str) -> str:
    """Convert markdown → Slack mrkdwn: **bold** → *bold*, `code` stays, etc."""
    text = re.sub(r'\*\*(.+?)\*\*', r'*\1*', text)
    text = re.sub(r'#{1,3}\s(.+)', r'*\1*', text)
    return text[:3000]
```

**Chunking / pagination:**
```python
def chunk(text: str, source: str) -> list[str]:
    limits = {"telegram": 4000, "slack": 3000, "discord": 2000, "twilio": 1600}
    limit = limits.get(source, 2000)
    if len(text) <= limit:
        return [text]
    # Split at last newline before limit
    chunks = []
    while text:
        if len(text) <= limit:
            chunks.append(text); break
        split = text[:limit].rfind("\n")
        split = split if split > limit // 2 else limit
        chunks.append(text[:split])
        text = text[split:].lstrip()
    return chunks
```

**Delivery with retry + backoff:**
```python
async def deliver(event: ChatMessageEvent, reply: str, max_retries: int = 3) -> bool:
    chunks = chunk(reply, event.source)
    for attempt in range(max_retries):
        try:
            for c in chunks:
                payload = compose(c, event.source, event.channel_context)
                await _send_to_platform(event.source, payload, event.channel_context)
            return True
        except RateLimitError:
            await asyncio.sleep(2 ** attempt)   # exponential backoff
        except Exception as e:
            logger.warning(f"[delivery] attempt {attempt+1} failed: {e}")
    # All retries failed → DLQ
    await _dlq_insert(event, reply)
    return False
```

**Dead-letter queue:**
```sql
actp_delivery_dlq (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES actp_chat_events,
  source          TEXT,
  canonical_user_id TEXT,
  reply_text      TEXT,
  error           TEXT,
  attempts        INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
)
```

DLQ items alert via Telegram to admin + can be retried manually via `system.dlq_retry` topic.

---

### §4.7 Testing Architecture

#### A) Contract tests — Channel Adapter signature verification

**New file:** `tests/test_chat_gateway.py`

```python
# Slack signature verification — known fixture
def test_slack_signature_valid():
    body = b'{"event": {"type": "message", "text": "hello"}}'
    ts = "1531420618"
    secret = "8f742231b10e8888abcd99yyyzzz85a5"
    # expected sig computed from Slack docs example
    sig = "v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503"
    assert verify_slack(body, ts, sig, secret)

def test_slack_signature_replay_rejected():
    # ts > 5min old → reject
    assert not verify_slack(body, "1000000000", sig, secret)

def test_discord_signature_valid(): ...
def test_twilio_signature_valid(): ...
def test_normalize_slack_shape(): ...   # canonical event has all required fields
def test_dedup_blocks_duplicate(): ...  # same idempotency_key → second call skipped
```

#### B) Router tests — offline replay harness

**New file:** `tests/test_chat_router.py`

```python
# Feed recorded canonical events, assert routing decision
ROUTER_FIXTURES = [
    {"text": "show revenue",         "expected_topic": "system.daily_revenue",  "route": "rules"},
    {"text": "what's trending today", "expected_topic": "research.list_results", "route": "rules"},
    {"text": "build me a feature",    "expected_topic": "delegate_coding_task",  "route": "llm"},
    {"text": "xzqwerty blorf",        "expected_topic": None,                    "route": "fallback"},
]

def test_router_accuracy():
    for f in ROUTER_FIXTURES:
        decision = route(make_event(f["text"]))
        assert decision.topic == f["expected_topic"]
        assert decision.route_source == f["route"]
```

#### C) Golden conversation tests

**New file:** `tests/test_golden_conversations.py`

```python
GOLDEN_CONVERSATIONS = [
    {
        "id": "gc-001",
        "turns": [
            {"user": "check health",  "must_contain": ["healthy", "services"]},
            {"user": "show revenue",  "must_contain": ["MRR", "$"]},
        ]
    },
    {
        "id": "gc-002",
        "turns": [
            {"user": "search the web for latest anthropic models",
             "must_contain": ["claude", "anthropic"],
             "tool_calls": ["web_search"]},
        ]
    },
]
```

Run against mock tools (unit) and real tools (integration, gated by `RUN_E2E=1`).

#### D) Time-based ACK tests

```python
def test_slack_ack_within_3s():
    """Slack handler must return HTTP 200 within 3s even for slow LLM calls."""
    start = time.time()
    resp = client.post("/webhooks/slack", json=slow_slack_event)
    assert resp.status_code == 200
    assert time.time() - start < 3.0

def test_discord_defer_then_followup():
    """Discord interaction: immediate 202 defer, then follow-up within 15min."""
    ...
```

#### E) Chaos tests

```python
def test_duplicate_webhook_delivery():
    """Same message_id delivered twice → only processed once."""

def test_tool_timeout_completes_gracefully():
    """Tool times out after 25s → graceful error reply, job marked failed."""

def test_dlq_on_delivery_failure():
    """Delivery fails 3× → item in actp_delivery_dlq."""

def test_partial_outage_llm_rate_limited():
    """LLM 429 → fallback router → clarification question sent."""
```

---

## 5. New Tables Summary

| Table | Purpose |
|-------|---------|
| `actp_chat_events` | Canonical event log + idempotency store + replay harness |
| `actp_identity_graph` | Platform identity → canonical_user_id mapping |
| `actp_conversation_threads` | Channel thread → thread_id mapping |
| `actp_router_rules` | Config-driven rules router (replaces hardcoded INTENT_MAP) |
| `actp_router_experiments` | A/B experiment definitions |
| `actp_router_experiment_events` | Per-request routing metrics + variant assignment |
| `actp_delivery_dlq` | Failed delivery retry queue |

---

## 6. New Files Summary

| File | Purpose |
|------|---------|
| `chat_gateway.py` | Channel adapters (Slack/Discord/Twilio/web), signature verify, ACK, enqueue |
| `message_normalizer.py` | Platform payload → `ChatMessageEvent`, deduper |
| `identity_graph.py` | `resolve_user()`, `resolve_thread()`, identity CRUD |
| `chat_router.py` | Router stack (rules → LLM → guardrails → fallback), experiment service |
| `delivery_adapter.py` | Message Composer, chunking, retry+backoff, DLQ insert |
| `tests/test_chat_gateway.py` | Contract tests: signature verify, normalization, dedup |
| `tests/test_chat_router.py` | Offline router replay harness |
| `tests/test_golden_conversations.py` | Golden conversation baselines |

### Modified files

| File | Change |
|------|--------|
| `health_server.py` | Add `/webhooks/slack`, `/webhooks/discord`, `/webhooks/twilio`, `/webhooks/web` routes |
| `telegram_command_bot.py` | `match_intent()` reads from `actp_router_rules` DB table (5min cache) instead of hardcoded list |
| `telegram_ai_engine.py` | Accept `ChatMessageEvent` as input (not just raw `user_message` str); pass `thread_id` to conversation memory |
| `service_registry.py` | Add `system.dlq_retry`, `system.router_rules_list`, `system.router_rules_upsert` topics |

---

## 7. Build Priority

**Phase 1 (foundation — enables multi-channel without breaking Telegram):**
1. `message_normalizer.py` — `ChatMessageEvent` + Telegram normalizer (wraps existing flow)
2. `identity_graph.py` + tables — `canonical_user_id` assigned to all existing Telegram users
3. `chat_gateway.py` — signature verify + new webhook routes in `health_server.py`
4. `actp_router_rules` table seeded from `INTENT_MAP`; `match_intent()` reads DB

**Phase 2 (new channels):**
5. Slack adapter + Discord adapter (most valuable after Telegram)
6. `delivery_adapter.py` — Message Composer + DLQ
7. Contract tests + time-based ACK tests

**Phase 3 (intelligence + experimentation):**
8. `chat_router.py` — full router stack with `RouterDecision` contract
9. Experiment / A/B service + metrics
10. Golden conversation tests + chaos tests
11. Twilio SMS adapter
