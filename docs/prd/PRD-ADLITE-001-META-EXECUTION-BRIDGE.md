# PRD-ADLITE-001: Meta Ads Rule Engine → AdLite Execution Bridge

## Overview
Wire `meta_ads_engine.py` in `actp-worker` to delegate all Meta ad mutations (pause, scale, kill, reactivate) to AdLite's action queue (`actp_ad_actions`) instead of calling Meta directly via MCP. AdLite's cron (`/api/cron/process-actions`, every 5 min) becomes the single execution layer for all Meta API mutations.

## Working Directories
- `actp-worker`: `/Users/isaiahdupree/Documents/Software/actp-worker/`
- `adlite`: `/Users/isaiahdupree/Documents/Software/adlite/`

## Problem Statement
Currently:
- `meta_ads_engine.py` does NOT exist in actp-worker (only a harness prompt at `harness/prompts/meta-ads-rule-engine.md`)
- `actp_meta_decisions` table exists (per memory) but the engine that populates it is not implemented
- AdLite has a fully working Meta Graph API client and action queue, but nothing feeds it from the rule engine
- The two systems are disconnected: actp-worker has thresholds + decision logic; AdLite has execution

## Goal
Build `meta_ads_engine.py` in actp-worker that:
1. Pulls ad insights via AdLite's `/api/status` or directly via `httpx` to Meta Graph API
2. Scores ads against thresholds in `actp_meta_thresholds` (already seeded in Supabase)
3. Writes decisions to `actp_meta_decisions`
4. For every actionable decision (PAUSE, SCALE, REACTIVATE), inserts a row into `actp_ad_actions` via a POST to AdLite's `/api/actions` endpoint
5. AdLite picks up the action within 5 minutes and executes against Meta Graph API

## Architecture

```
actp-worker/meta_ads_engine.py
    ↓  pull insights (Meta Graph API via httpx)
    ↓  score vs actp_meta_thresholds
    ↓  write decision → actp_meta_decisions
    ↓  POST /api/actions to AdLite  (if decision != HOLD)
         ↓
    AdLite /api/cron/process-actions (every 5 min)
         ↓
    lib/actions.ts → executeMetaAction()
         ↓
    Meta Graph API (pause / scale / resume)
         ↓
    actp_ad_actions.status = 'completed'
         ↓
    actp_ad_deployments updated
```

## Files to Create / Modify

### New: `actp-worker/meta_ads_engine.py`

Full implementation:

```python
"""
Meta Ads Rule Engine
Pulls ad insights, scores against Supabase thresholds,
delegates mutations to AdLite via actp_ad_actions queue.
"""

import os
import uuid
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

import httpx

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY         = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
META_ACCESS_TOKEN    = os.getenv("META_ADS_ACCESS_TOKEN", os.getenv("META_ACCESS_TOKEN", ""))
META_ACCOUNT_ID      = os.getenv("META_ADS_ACCOUNT_ID", "act_2005521593177778")
ADLITE_URL           = os.getenv("ADLITE_URL", "")           # e.g. https://adlite-xxx.vercel.app
ADLITE_MASTER_KEY    = os.getenv("ADLITE_MASTER_KEY", "")
ENABLE_META_ADS_AUTO = os.getenv("ENABLE_META_ADS_AUTO", "false").lower() == "true"
META_ADS_DRY_RUN     = os.getenv("META_ADS_DRY_RUN", "true").lower() == "true"

META_API_BASE = "https://graph.facebook.com/v21.0"

# Sufficiency gates — don't score before these minimums
MIN_IMPRESSIONS = 1000
MIN_SPEND_USD   = 20.0
MIN_AGE_HOURS   = 48


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class AdInsight:
    ad_id: str
    ad_name: str
    adset_id: str
    campaign_id: str
    status: str
    impressions: int
    clicks: int
    spend: float
    ctr: float
    cpc: float
    roas: float
    cpa: float
    conversions: int
    age_hours: float = 0.0


@dataclass
class Threshold:
    offer_id: str
    ctr_min: float = 0.005
    cpc_max: float = 12.0
    roas_min: float = 1.5
    cpa_max: float = 600.0
    scale_roas_min: float = 3.0
    scale_factor: float = 1.2
    max_multiplier: float = 2.0
    impressions_min: int = 1000
    spend_min: float = 20.0
    age_hours_min: float = 48.0


@dataclass
class Decision:
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ad_id: str = ""
    adset_id: str = ""
    campaign_id: str = ""
    action: str = "HOLD"          # PAUSE | SCALE | REACTIVATE | HOLD
    reason: str = ""
    metrics: Dict[str, Any] = field(default_factory=dict)
    threshold_used: str = "default"
    dry_run: bool = True
    adlite_action_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------
async def _sb_get(client: httpx.AsyncClient, table: str, params: dict) -> list:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    r = await client.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


async def _sb_insert(client: httpx.AsyncClient, table: str, payload: dict) -> dict:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    r = await client.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=payload, timeout=15)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if isinstance(rows, list) and rows else {}


# ---------------------------------------------------------------------------
# Meta Graph API helpers
# ---------------------------------------------------------------------------
async def _meta_get(client: httpx.AsyncClient, path: str, params: dict = {}) -> dict:
    params["access_token"] = META_ACCESS_TOKEN
    r = await client.get(f"{META_API_BASE}{path}", params=params, timeout=20)
    r.raise_for_status()
    return r.json()


async def get_account_insights(client: httpx.AsyncClient, date_preset: str = "last_7d") -> List[AdInsight]:
    fields = "ad_id,adset_id,campaign_id,ad_name,impressions,clicks,spend,ctr,cpc,reach,actions,action_values"
    data = await _meta_get(client, f"/{META_ACCOUNT_ID}/insights", {
        "level": "ad",
        "date_preset": date_preset,
        "fields": fields,
        "limit": "500",
    })
    rows = data.get("data", [])
    insights = []
    for row in rows:
        impressions = int(row.get("impressions", 0) or 0)
        clicks      = int(row.get("clicks", 0) or 0)
        spend       = float(row.get("spend", 0) or 0)
        ctr         = float(row.get("ctr", 0) or 0) / 100  # Meta returns percent string
        cpc         = float(row.get("cpc", 0) or 0)

        actions_list = row.get("actions", []) or []
        conversions = sum(
            float(a.get("value", 0) or 0)
            for a in actions_list
            if a.get("action_type") in ("purchase", "lead", "complete_registration")
        )

        av_list = row.get("action_values", []) or []
        revenue = sum(
            float(a.get("value", 0) or 0)
            for a in av_list
            if a.get("action_type") == "purchase"
        )

        roas = revenue / spend if spend > 0 and revenue > 0 else 0.0
        cpa  = spend / conversions if conversions > 0 else 0.0

        insights.append(AdInsight(
            ad_id=str(row.get("ad_id", "")),
            ad_name=str(row.get("ad_name", "")),
            adset_id=str(row.get("adset_id", "")),
            campaign_id=str(row.get("campaign_id", "")),
            status="ACTIVE",
            impressions=impressions,
            clicks=clicks,
            spend=spend,
            ctr=ctr,
            cpc=cpc,
            roas=roas,
            cpa=cpa,
            conversions=int(conversions),
        ))
    return insights


# ---------------------------------------------------------------------------
# Threshold loading
# ---------------------------------------------------------------------------
async def load_thresholds(client: httpx.AsyncClient) -> Dict[str, Threshold]:
    rows = await _sb_get(client, "actp_meta_thresholds", {"select": "*"})
    thresholds = {}
    for row in rows:
        thresholds[row["offer_id"]] = Threshold(
            offer_id=row["offer_id"],
            ctr_min=float(row.get("ctr_min", 0.005)),
            cpc_max=float(row.get("cpc_max", 12.0)),
            roas_min=float(row.get("roas_min", 1.5)),
            cpa_max=float(row.get("cpa_max", 600.0)),
            scale_roas_min=float(row.get("scale_roas_min", 3.0)),
            scale_factor=float(row.get("scale_factor", 1.2)),
            max_multiplier=float(row.get("max_multiplier", 2.0)),
            impressions_min=int(row.get("impressions_min", 1000)),
            spend_min=float(row.get("spend_min", 20.0)),
            age_hours_min=float(row.get("age_hours_min", 48.0)),
        )
    return thresholds


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def _passes_gate(insight: AdInsight, threshold: Threshold) -> bool:
    if insight.impressions < threshold.impressions_min:
        return False
    if insight.spend < threshold.spend_min:
        return False
    if insight.age_hours < threshold.age_hours_min:
        return False
    return True


def score_ad(insight: AdInsight, threshold: Threshold) -> Decision:
    d = Decision(ad_id=insight.ad_id, adset_id=insight.adset_id,
                 campaign_id=insight.campaign_id, threshold_used=threshold.offer_id,
                 dry_run=META_ADS_DRY_RUN,
                 metrics={
                     "impressions": insight.impressions,
                     "clicks": insight.clicks,
                     "spend": insight.spend,
                     "ctr": insight.ctr,
                     "cpc": insight.cpc,
                     "roas": insight.roas,
                     "cpa": insight.cpa,
                     "conversions": insight.conversions,
                 })

    if not _passes_gate(insight, threshold):
        d.action = "HOLD"
        d.reason = "insufficient_data"
        return d

    # Loser check → PAUSE
    is_loser = False
    reasons = []
    if insight.ctr < threshold.ctr_min:
        is_loser = True
        reasons.append(f"ctr {insight.ctr:.3%} < min {threshold.ctr_min:.3%}")
    if insight.clicks > 10 and insight.cpc > threshold.cpc_max:
        is_loser = True
        reasons.append(f"cpc ${insight.cpc:.2f} > max ${threshold.cpc_max:.2f}")
    if insight.cpa > 0 and insight.cpa > threshold.cpa_max:
        is_loser = True
        reasons.append(f"cpa ${insight.cpa:.2f} > max ${threshold.cpa_max:.2f}")
    if insight.roas > 0 and insight.roas < threshold.roas_min:
        is_loser = True
        reasons.append(f"roas {insight.roas:.2f} < min {threshold.roas_min:.2f}")

    if is_loser:
        d.action = "PAUSE"
        d.reason = "; ".join(reasons)
        return d

    # Winner check → SCALE
    is_winner = (
        insight.ctr >= threshold.ctr_min
        and (insight.clicks <= 10 or insight.cpc <= threshold.cpc_max)
        and insight.roas >= threshold.scale_roas_min
    )
    if is_winner:
        d.action = "SCALE"
        d.reason = f"roas {insight.roas:.2f} >= scale threshold {threshold.scale_roas_min:.2f}"
        return d

    d.action = "HOLD"
    d.reason = "within_thresholds"
    return d


# ---------------------------------------------------------------------------
# AdLite action queue
# ---------------------------------------------------------------------------
async def queue_adlite_action(client: httpx.AsyncClient, decision: Decision,
                               new_budget_cents: Optional[int] = None) -> Optional[str]:
    if not ADLITE_URL or not ADLITE_MASTER_KEY:
        log.warning("ADLITE_URL or ADLITE_MASTER_KEY not set — cannot queue action")
        return None

    action_type_map = {"PAUSE": "pause", "SCALE": "scale_budget", "REACTIVATE": "resume"}
    action_type = action_type_map.get(decision.action)
    if not action_type:
        return None

    params: Dict[str, Any] = {"reason": decision.reason, **decision.metrics}
    if action_type == "pause":
        params["ad_id"] = decision.ad_id
    elif action_type == "scale_budget":
        params["ad_set_id"] = decision.adset_id
        params["new_daily_budget_cents"] = new_budget_cents or 0
    elif action_type == "resume":
        params["ad_id"] = decision.ad_id

    payload = {
        "platform": "meta",
        "action_type": action_type,
        "creative_id": decision.ad_id,    # rule-engine originated — ad_id used as creative_id
        "campaign_id": decision.campaign_id,
        "params": params,
    }

    headers = {
        "Authorization": f"Bearer {ADLITE_MASTER_KEY}",
        "Content-Type": "application/json",
    }

    r = await client.post(f"{ADLITE_URL}/api/actions", headers=headers, json=payload, timeout=15)
    r.raise_for_status()
    result = r.json()
    return result.get("data", {}).get("action", {}).get("id")


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------
async def run_engine(dry_run: Optional[bool] = None) -> Dict[str, Any]:
    if dry_run is not None:
        global META_ADS_DRY_RUN
        META_ADS_DRY_RUN = dry_run

    results = {"insights": 0, "held": 0, "paused": 0, "scaled": 0, "errors": []}

    async with httpx.AsyncClient() as client:
        thresholds = await load_thresholds(client)
        default_t  = thresholds.get("default", Threshold(offer_id="default"))

        insights = await get_account_insights(client)
        results["insights"] = len(insights)

        for insight in insights:
            try:
                t = next(
                    (v for k, v in thresholds.items() if k != "default" and k in insight.campaign_id),
                    default_t
                )
                decision = score_ad(insight, t)

                # Persist decision
                await _sb_insert(client, "actp_meta_performance_snapshots", {
                    "ad_id": insight.ad_id,
                    "adset_id": insight.adset_id,
                    "campaign_id": insight.campaign_id,
                    "impressions": insight.impressions,
                    "clicks": insight.clicks,
                    "spend": insight.spend,
                    "ctr": insight.ctr,
                    "cpc": insight.cpc,
                    "roas": insight.roas,
                    "cpa": insight.cpa,
                    "conversions": insight.conversions,
                })

                row = {
                    "id": decision.decision_id,
                    "ad_id": decision.ad_id,
                    "adset_id": decision.adset_id,
                    "campaign_id": decision.campaign_id,
                    "action": decision.action,
                    "reason": decision.reason,
                    "metrics": decision.metrics,
                    "threshold_used": decision.threshold_used,
                    "dry_run": decision.dry_run,
                }

                if decision.action == "HOLD":
                    results["held"] += 1
                    row["adlite_action_id"] = None
                    await _sb_insert(client, "actp_meta_decisions", row)
                    continue

                # Queue in AdLite
                adlite_action_id = None
                if not META_ADS_DRY_RUN:
                    adlite_action_id = await queue_adlite_action(client, decision)

                row["adlite_action_id"] = adlite_action_id
                await _sb_insert(client, "actp_meta_decisions", row)

                if decision.action == "PAUSE":
                    results["paused"] += 1
                elif decision.action == "SCALE":
                    results["scaled"] += 1

            except Exception as e:
                log.error(f"Error processing ad {insight.ad_id}: {e}")
                results["errors"].append({"ad_id": insight.ad_id, "error": str(e)})

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse, json
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Meta Ads Rule Engine")
    parser.add_argument("--run", action="store_true", help="Run engine (live mode if ENABLE_META_ADS_AUTO=true)")
    parser.add_argument("--dry-run", action="store_true", help="Force dry-run (no mutations)")
    parser.add_argument("--decisions", action="store_true", help="Show recent decisions from Supabase")
    args = parser.parse_args()

    if args.run or args.dry_run:
        result = asyncio.run(run_engine(dry_run=args.dry_run or META_ADS_DRY_RUN))
        print(json.dumps(result, indent=2))
    elif args.decisions:
        async def show():
            async with httpx.AsyncClient() as c:
                rows = await _sb_get(c, "actp_meta_decisions", {
                    "select": "*",
                    "order": "created_at.desc",
                    "limit": "20",
                })
                print(json.dumps(rows, indent=2))
        asyncio.run(show())
    else:
        parser.print_help()
```

---

## Supabase Schema

### `actp_meta_thresholds` (already exists)
Fields expected: `offer_id`, `ctr_min`, `cpc_max`, `roas_min`, `cpa_max`, `scale_roas_min`, `scale_factor`, `max_multiplier`, `impressions_min`, `spend_min`, `age_hours_min`

### `actp_meta_performance_snapshots` (already exists)
Fields expected: `ad_id`, `adset_id`, `campaign_id`, `impressions`, `clicks`, `spend`, `ctr`, `cpc`, `roas`, `cpa`, `conversions`, `created_at`

### `actp_meta_decisions` (already exists)
Fields expected: `id`, `ad_id`, `adset_id`, `campaign_id`, `action`, `reason`, `metrics`, `threshold_used`, `dry_run`, `adlite_action_id`, `created_at`

Run this if the `adlite_action_id` column is missing:
```sql
ALTER TABLE actp_meta_decisions
  ADD COLUMN IF NOT EXISTS adlite_action_id text,
  ADD COLUMN IF NOT EXISTS dry_run boolean DEFAULT true;
```

---

## AdLite: Relax `creative_id` Requirement

The current `POST /api/actions` requires `creative_id` (hard-coded validation). Rule-engine–originated actions don't have a creative — they originate from a scored ad. Modify `app/api/actions/route.ts`:

**File:** `/Users/isaiahdupree/Documents/Software/adlite/app/api/actions/route.ts`

Change line 52 from:
```ts
if (!body.creative_id) return err('creative_id is required', 'validation_error', 400)
```
To:
```ts
// creative_id optional — rule-engine actions use ad_id in params instead
```

And in the insert block, make `creative_id` optional:
```ts
creative_id: body.creative_id ?? null,
```

---

## Config additions for `actp-worker/config.py`

```python
ADLITE_URL           = os.getenv("ADLITE_URL", "")
ADLITE_MASTER_KEY    = os.getenv("ADLITE_MASTER_KEY", "")
ENABLE_META_ADS_AUTO = os.getenv("ENABLE_META_ADS_AUTO", "false").lower() == "true"
META_ADS_DRY_RUN     = os.getenv("META_ADS_DRY_RUN", "true").lower() == "true"
```

---

## .env additions for `actp-worker/.env`

```
ADLITE_URL=https://<adlite-vercel-url>
ADLITE_MASTER_KEY=<from AdLite Vercel env>
ENABLE_META_ADS_AUTO=false
META_ADS_DRY_RUN=true
```

---

## cron_definitions.py addition

```python
{
    "name": "meta_ads_optimization",
    "description": "Run Meta ads rule engine — score + queue AdLite actions",
    "schedule": "0 8,14,20 * * *",
    "task_type": "meta_ads_rule_engine",
    "enabled": False,   # enable after first dry-run review
    "opt_in": True,
},
```

---

## Tests to Write: `tests/test_meta_ads_engine.py`

```python
"""Tests for meta_ads_engine.py"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from meta_ads_engine import score_ad, AdInsight, Threshold, Decision

DEFAULT_T = Threshold(offer_id="default")


def make_insight(**kwargs) -> AdInsight:
    base = dict(
        ad_id="ad_123", ad_name="Test Ad", adset_id="as_456", campaign_id="c_789",
        status="ACTIVE", impressions=2000, clicks=40, spend=50.0,
        ctr=0.02, cpc=1.25, roas=2.5, cpa=25.0, conversions=2, age_hours=72,
    )
    base.update(kwargs)
    return AdInsight(**base)


def test_hold_insufficient_data():
    i = make_insight(impressions=100, spend=5.0)
    d = score_ad(i, DEFAULT_T)
    assert d.action == "HOLD"
    assert d.reason == "insufficient_data"


def test_pause_low_ctr():
    i = make_insight(ctr=0.001)
    d = score_ad(i, DEFAULT_T)
    assert d.action == "PAUSE"
    assert "ctr" in d.reason


def test_pause_high_cpc():
    i = make_insight(cpc=20.0, clicks=50)
    d = score_ad(i, DEFAULT_T)
    assert d.action == "PAUSE"


def test_scale_winner():
    i = make_insight(ctr=0.025, cpc=1.0, roas=4.0)
    d = score_ad(i, DEFAULT_T)
    assert d.action == "SCALE"


def test_hold_within_thresholds():
    i = make_insight(ctr=0.01, cpc=5.0, roas=2.0)
    d = score_ad(i, DEFAULT_T)
    assert d.action == "HOLD"
    assert d.reason == "within_thresholds"


def test_dry_run_flag():
    i = make_insight(ctr=0.001)
    d = score_ad(i, DEFAULT_T)
    assert d.dry_run is True
```

---

## Acceptance Criteria

- [ ] `meta_ads_engine.py` exists in `actp-worker/` with `run_engine()` and CLI
- [ ] `python3 meta_ads_engine.py --dry-run` runs without error and prints JSON result
- [ ] Decisions appear in `actp_meta_decisions` after dry run (no AdLite actions queued)
- [ ] With `META_ADS_DRY_RUN=false` and valid `ADLITE_URL`/`ADLITE_MASTER_KEY`, PAUSE/SCALE decisions create rows in `actp_ad_actions` via AdLite API
- [ ] `actp_ad_actions` rows are picked up by AdLite `/api/cron/process-actions` within 5 minutes
- [ ] `creative_id` is optional in AdLite `/api/actions` POST route
- [ ] All 6 unit tests pass: `pytest tests/test_meta_ads_engine.py -v`
- [ ] `actp_meta_decisions.adlite_action_id` is populated with the AdLite action UUID after live run

---

## Run Order

```bash
# 1. Dry run — review decisions only
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 meta_ads_engine.py --dry-run

# 2. Review actp_meta_decisions in Supabase
python3 meta_ads_engine.py --decisions

# 3. Enable live (after reviewing dry-run output)
META_ADS_DRY_RUN=false python3 meta_ads_engine.py --run
```
