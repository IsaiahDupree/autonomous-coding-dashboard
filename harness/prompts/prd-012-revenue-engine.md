# PRD-012: Autonomous Revenue Engine

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /docs/prd/PRD-012-AUTONOMOUS-REVENUE-ENGINE.md
- **Priority**: P1 (HIGH)

## Context

Revenue APIs are configured (Stripe, RevenueCat, YouTube, Meta, Instagram) but not actively queried. The bot and ACTP system have no visibility into actual revenue. Target: $5K+/month.

### Revenue Sources
- EverReach Pro: Apple App Store via RevenueCat ($19.99/mo)
- ClientPortal: Stripe ($49/mo)
- YouTube: Monetization via YouTube Data API v3
- Upwork: Contract revenue via Safari Automation
- Ad revenue: Meta Ads via AdLite

### Existing API Keys (in .env)
- REVCAT_API_KEY — RevenueCat REST API
- STRIPE_SECRET_KEY — Stripe API
- YOUTUBE_API_KEY — YouTube Data API v3
- META_ACCESS_TOKEN — Meta/Facebook Graph API

## Task

Build revenue data collection + reporting:

### 1. RevenueCat Client (`revcat_client.py`)
```python
class RevCatClient:
    async def get_subscriber(app_user_id: str) -> dict
    async def get_offerings() -> dict
    async def list_subscribers(limit=100) -> list
    async def get_overview() -> dict  # MRR, active subs, churn
```
- Base URL: https://api.revenuecat.com/v1
- Auth: Bearer REVCAT_API_KEY
- Key metrics: active_subscribers, mrr, trial_count, churn_rate

### 2. Stripe Client (`stripe_client.py`)
```python
class StripeClient:
    async def list_subscriptions(status="active") -> list
    async def get_balance() -> dict
    async def list_charges(limit=10) -> list
    async def get_mrr() -> dict  # Calculate from active subs
```
- Use stripe Python SDK
- Key metrics: active_subs, mrr, net_revenue, failed_payments

### 3. YouTube Analytics Client (`youtube_analytics_client.py`)
```python
class YouTubeAnalyticsClient:
    async def get_channel_stats() -> dict  # views, subs, watch_time
    async def get_top_videos(limit=10) -> list
    async def get_estimated_earnings(days=30) -> dict
```

### 4. Revenue Reporter (`revenue_reporter.py`)
```python
async def daily_revenue_snapshot() -> dict:
    """Pull all sources, store snapshot, return summary."""

async def send_telegram_revenue_report(chat_id: int):
    """Format and send daily revenue summary via Telegram."""
```

### 5. Service Registry Topics
Add to `service_registry.py`:
- `revenue.daily_snapshot` — pull all sources
- `revenue.telegram_report` — send Telegram summary
- `revenue.revcat_overview` — RevenueCat data
- `revenue.stripe_overview` — Stripe data
- `revenue.youtube_stats` — YouTube data

### 6. Crons
Add to `cron_definitions.py`:
- `daily_revenue_snapshot` — 8:00 AM daily
- `revenue_telegram_report` — 8:05 AM daily

### 7. Supabase Table
```sql
CREATE TABLE actp_revenue_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,  -- revcat, stripe, youtube, meta
  metrics jsonb NOT NULL,
  snapshot_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
```

## Testing
```bash
python3 -m pytest tests/ -v -k "revenue"
# Manual test
python3 -c "import asyncio; from revenue_reporter import daily_revenue_snapshot; print(asyncio.run(daily_revenue_snapshot()))"
```

## Constraints
- Handle missing API keys gracefully (skip source, don't crash)
- Cache responses for 1 hour (don't spam APIs)
- Revenue data is sensitive — never log exact amounts at INFO level
- Do NOT break existing tests
