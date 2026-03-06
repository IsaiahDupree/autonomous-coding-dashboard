# Self-Improving Loop — Performance Tracking + Auto-Dispatch + Template A/B Testing

## Context

The automation stack sends DMs, discovers prospects, and submits Upwork proposals. But nothing
tracks whether any of it is working. This PRD builds the performance tracking and self-improvement
layer:

1. **PerformanceTracker** — reads results from Supabase, computes rolling metrics
2. **A/B Template Testing** — Thompson Sampling selects the best-performing DM template
3. **Metric Alerts** — detects declining performance and sends Telegram alerts
4. **Auto-ACD Dispatch** — when a component fails consistently, triggers an ACD agent rebuild

**Target repo**: `/Users/isaiahdupree/Documents/Software/actp-worker`
**Language**: Python 3.12
**Style**: async/await with aiohttp where needed, otherwise sync is fine

## Files to Create

```
actp-worker/
  performance_tracker.py     (main tracker — reads metrics, detects decline, alerts)
  template_ab_tester.py      (Thompson Sampling for DM template selection)
  self_heal_dispatcher.py    (triggers ACD dispatch when components consistently fail)
  tests/
    test_performance_tracker.py
    test_template_ab_tester.py
```

## 1. `performance_tracker.py`

### Class: `PerformanceTracker`

```python
class PerformanceTracker:
    def __init__(self, supabase_client, telegram_bot_token=None, telegram_chat_id=None)

    async def compute_metrics(self) -> dict
    async def detect_decline(self, metrics: dict) -> list[dict]  # list of alerts
    async def record_snapshot(self, metrics: dict) -> None
    async def send_alert(self, alert: dict) -> None
    async def run(self) -> dict  # compute + detect + record + alert
```

### `compute_metrics()` — query Supabase:

```python
{
  # DM performance
  'dms_sent_today': int,         # crm_message_queue WHERE status='sent' AND updated_at >= today
  'dms_sent_7d': int,            # last 7 days
  'reply_rate_7d': float,        # % of sent DMs that got replies (crm_contacts.replied_at not null)
  'reply_rate_30d': float,
  'avg_reply_time_hours': float, # avg hours between dm sent and first reply

  # Prospect pipeline
  'prospects_discovered_today': int,   # suggested_actions WHERE created_at >= today
  'prospects_in_funnel': int,          # suggested_actions WHERE status='suggested'
  'prospect_conversion_rate': float,   # contacted/suggested ratio
  'avg_prospect_score': float,         # avg icp_score of suggested_actions

  # Upwork
  'upwork_proposals_sent_7d': int,     # upwork_proposals WHERE status='submitted' last 7d
  'upwork_win_rate': float,            # status='won' / status='submitted'
  'upwork_pending_review': int,        # status='pending'

  # System health
  'instagram_dm_service_up': bool,     # curl localhost:3100/health
  'ig_daemon_alive': bool,             # /tmp/ig_heartbeat age < 60s
  'last_discovery_at': str | None,
  'last_dm_at': str | None,
}
```

### `detect_decline()` — threshold rules:

| Metric | Alert threshold | Severity |
|--------|----------------|----------|
| `reply_rate_7d` | < 0.03 (3%) after 20+ DMs sent | high |
| `prospects_in_funnel` | < 10 | medium |
| `dms_sent_7d` | < 3 (pipeline stalled) | medium |
| `upwork_win_rate` | < 0.05 and > 5 submitted | medium |
| `instagram_dm_service_up` | False | high |
| `ig_daemon_alive` | False | high |
| `avg_prospect_score` | < 40 (bad targeting) | low |

Return list of `{ metric, value, threshold, severity, message, recommend_action }`.

`recommend_action` values:
- `'rebuild_templates'` — DM reply rate too low
- `'rebuild_discovery'` — prospect quality declining
- `'restart_service'` — service health failure
- `'rebuild_upwork_scorer'` — Upwork win rate declining

### `record_snapshot()`:

Insert into `agent_metrics` table (already created by agentlite):
```python
{
  'metric_name': 'performance_snapshot',
  'metric_value': metrics['reply_rate_7d'] * 100,
  'metadata': metrics  # full dict as JSON
}
```

### `send_alert()`:

POST to Telegram if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` set:
```
⚠️ Performance Alert — 2026-03-05 10:30

HIGH: DM reply rate 1.2% (threshold: 3.0%)
→ Recommend: rebuild_templates

MEDIUM: Prospects in funnel: 8 (threshold: 10)
→ Recommend: rebuild_discovery

System health: ✅ OK
```

### Called from `heartbeat_agent.py`:
Add to the heartbeat run loop:
```python
from performance_tracker import PerformanceTracker
tracker = PerformanceTracker(supabase, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
await tracker.run()
```
Call once per heartbeat cycle (every 30 minutes).

---

## 2. `template_ab_tester.py`

### Thompson Sampling for DM template selection

```python
class TemplateABTester:
    def __init__(self, supabase_client)

    async def get_templates(self) -> list[dict]       # from Supabase actp_dm_templates
    async def record_send(self, template_id: str) -> None
    async def record_reply(self, template_id: str) -> None
    async def select_template(self, platform: str, context: dict) -> str  # returns template_id
    async def get_leaderboard(self) -> list[dict]     # ranked by Thompson-sampled score
```

### Supabase table: `actp_dm_templates`

```sql
CREATE TABLE IF NOT EXISTS actp_dm_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,              -- instagram, twitter, tiktok, linkedin
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',        -- ['username', 'niche', 'topic']
  alpha INT NOT NULL DEFAULT 1,        -- Thompson: successes + 1
  beta INT NOT NULL DEFAULT 1,         -- Thompson: failures + 1
  sends INT NOT NULL DEFAULT 0,
  replies INT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',        -- active, paused, retired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Seed 3 starter templates for Instagram if table is empty:

```python
STARTER_TEMPLATES = [
    {
        'name': 'founder_cold_v1',
        'platform': 'instagram',
        'template_text': "Hey {{username}}, love what you're building with {{topic}}. I help {{niche}} founders automate their growth workflows — happy to share what's been working. Worth a quick chat?",
        'variables': ['username', 'topic', 'niche']
    },
    {
        'name': 'builder_direct_v1',
        'platform': 'instagram',
        'template_text': "{{username}} — saw your {{topic}} post. I've been building AI automation systems for founders at your stage. Built something similar for a SaaS client last month. DM me if curious.",
        'variables': ['username', 'topic']
    },
    {
        'name': 'value_first_v1',
        'platform': 'instagram',
        'template_text': "{{username}}, quick idea for your {{topic}} workflow — [specific automation idea]. I implement these for founders. Would this be useful?",
        'variables': ['username', 'topic']
    }
]
```

### `select_template()` — Thompson Sampling:

```python
import random

for template in active_templates:
    # Sample from Beta distribution
    template['thompson_score'] = random.betavariate(template['alpha'], template['beta'])

# Return template with highest sampled score
return max(active_templates, key=lambda t: t['thompson_score'])['id']
```

### `record_send()` / `record_reply()`:

- `record_send`: `UPDATE actp_dm_templates SET sends = sends + 1, beta = beta + 1 WHERE id = ?`
- `record_reply`: `UPDATE actp_dm_templates SET replies = replies + 1, alpha = alpha + 1 WHERE id = ?`
  (Alpha increases on success = reply; Beta increases on send = trial)

---

## 3. `self_heal_dispatcher.py`

### Auto-trigger ACD rebuild when metrics are bad for N consecutive days

```python
class SelfHealDispatcher:
    def __init__(self, supabase_client)

    async def check_and_dispatch(self, alerts: list[dict]) -> list[dict]  # dispatched actions
```

### Logic:

For each alert with `recommend_action`:
1. Check `agent_metrics` table: has this `recommend_action` been triggered in the last 48h? If yes, skip (avoid spam).
2. If not recently triggered:

| recommend_action | What to dispatch |
|-----------------|-----------------|
| `rebuild_templates` | Write new PRD to `harness/prompts/rebuild-dm-templates.md` + launch ACD harness agent |
| `rebuild_discovery` | Write new PRD to `harness/prompts/rebuild-prospect-scoring.md` + launch ACD harness |
| `restart_service` | `curl -X POST http://localhost:3100/api/session/clear` + restart via watchdog |
| `rebuild_upwork_scorer` | Write PRD to `harness/prompts/rebuild-upwork-scorer.md` + launch ACD harness |

### Launching ACD harness:

```python
import subprocess, os

def launch_acd_agent(slug: str, prompt_path: str, feature_list_path: str, target_path: str):
    env = os.environ.copy()
    env.pop('CLAUDECODE', None)  # allow nested Claude Code sessions

    subprocess.Popen(
        ['node',
         '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/run-harness-v2.js',
         f'--path={target_path}',
         f'--project={slug}',
         '--model=claude-sonnet-4-6',
         '--fallback-model=claude-haiku-4-5-20251001',
         '--max-retries=3',
         f'--prompt={prompt_path}',
         f'--feature-list={feature_list_path}',
         '--adaptive-delay', '--force-coding', '--until-complete'],
        stdout=open(f'/tmp/self-heal-{slug}.log', 'w'),
        stderr=subprocess.STDOUT,
        env=env,
        start_new_session=True
    )
```

### Auto-generated PRD for `rebuild_templates`:

```python
PRD_REBUILD_TEMPLATES = """
# Rebuild DM Templates — Self-Healing Dispatch

Performance tracker detected DM reply rate below 3% threshold.
Task: Audit all templates in `actp_dm_templates`, analyze reply rate data,
write 3 new templates optimized for the {icp} audience.
Use Claude API (claude-haiku) to generate variants. Update via Supabase.
Acceptance: 3 new templates with status='active' in actp_dm_templates.
"""
```

Record the dispatch in `agent_metrics`:
```python
await record_metric('self_heal_dispatch', 1, None, {
    'action': recommend_action, 'slug': slug, 'alert': alert
})
```

---

## 4. Test Suite

### `tests/test_performance_tracker.py`

- `test_compute_metrics_returns_all_fields()` — mock Supabase, assert all keys present
- `test_detect_decline_low_reply_rate()` — metrics with reply_rate=0.01 → alert severity=high
- `test_detect_decline_healthy_metrics()` — good metrics → empty alert list
- `test_send_alert_no_telegram()` — no TELEGRAM_BOT_TOKEN → no crash, returns None
- `test_record_snapshot_inserts_row()` — mock Supabase insert, verify called with correct shape

### `tests/test_template_ab_tester.py`

- `test_thompson_sampling_prefers_higher_alpha()` — template with alpha=10/beta=1 wins over alpha=1/beta=1 most of the time
- `test_select_template_returns_valid_id()` — select from seeded templates, returns a UUID
- `test_record_send_increments_beta()` — verify beta increases
- `test_record_reply_increments_alpha()` — verify alpha increases
- `test_get_leaderboard_returns_sorted()` — leaderboard sorted by reply rate desc

Use `unittest.mock.patch` for Supabase calls — these are unit tests.

---

## Acceptance Criteria

- `PerformanceTracker.run()` completes without error when Supabase is reachable
- `detect_decline()` returns at least 1 alert when reply_rate_7d < 0.03 in mocked metrics
- `TemplateABTester.select_template('instagram', {})` returns a valid template_id after seeding
- `SelfHealDispatcher.check_and_dispatch([{'recommend_action': 'restart_service', ...}])` calls `subprocess.Popen` with correct args
- All 10 unit tests pass: `python3 -m pytest tests/test_performance_tracker.py tests/test_template_ab_tester.py -v`
- `heartbeat_agent.py` imports and calls `PerformanceTracker.run()` without crashing
- `actp_dm_templates` table created with 3 starter templates on first run
- No mock Supabase calls in `performance_tracker.py` production code — all real queries

## Rules

- No mock data in production paths — real Supabase queries only
- All env vars from `config.py` pattern (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, etc.)
- Unit tests use `unittest.mock.MagicMock` for Supabase client — real integration tests not required
- `launch_acd_agent()` must unset `CLAUDECODE` env var (critical — prevents nested session block)
- Commit and push to GitHub after all tests pass
- Run `python3 -m pytest tests/ -x -q --timeout=30` to verify
