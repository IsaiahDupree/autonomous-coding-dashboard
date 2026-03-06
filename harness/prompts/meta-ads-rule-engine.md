# Meta Ads Rule Engine — ACD Build Prompt

## Mission
Build `meta_ads_engine.py` in the actp-worker repo. This engine uses the Meta Ads MCP
(pipeboard-co meta-ads-mcp) to programmatically pull ad performance, score against
offer-specific thresholds stored in Supabase, and execute pause/scale/reactivate decisions
without any browser automation required.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## Output Files
- `meta_ads_engine.py` — rule engine (main)
- `tests/test_meta_ads_engine.py` — unit tests

---

## Config Requirements (add to `config.py`)

```python
META_ADS_ACCOUNT_ID    = os.getenv("META_ADS_ACCOUNT_ID", "act_2005521593177778")
META_ADS_PAGE_ID       = os.getenv("META_ADS_PAGE_ID", "239537119252811")
META_ADS_IG_ACCOUNT_ID = os.getenv("META_ADS_IG_ACCOUNT_ID", "17841472205103640")
ENABLE_META_ADS_AUTO   = os.getenv("ENABLE_META_ADS_AUTO", "false").lower() == "true"
META_ADS_DRY_RUN       = os.getenv("META_ADS_DRY_RUN", "true").lower() == "true"
META_ADS_DAILY_SPEND_THRESHOLD_HOURLY = float(os.getenv("META_ADS_DAILY_SPEND_THRESHOLD_HOURLY", "100"))
```

---

## Supabase Tables (already migrated — project: ivhfuhxorppptyuofbgq)

- `actp_meta_thresholds` — per-offer threshold config (seeded with offer-001, offer-002, default)
- `actp_meta_performance_snapshots` — raw insights per run
- `actp_meta_decisions` — audit log of every rule action

---

## Full Implementation

```python
# meta_ads_engine.py
"""
Meta Ads Rule Engine
Uses Meta Ads MCP (via subprocess/httpx) to pull insights and apply pause/scale rules.
Reads thresholds from actp_meta_thresholds in Supabase.
All decisions logged to actp_meta_decisions.
"""

import os
import uuid
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import httpx

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class AdInsight:
    ad_id: str
    ad_name: str
    adset_id: str
    adset_name: str
    campaign_id: str
    campaign_name: str
    status: str
    impressions: int
    clicks: int
    spend: float
    ctr: float           # e.g. 0.012 = 1.2%
    cpc: float
    cpm: float
    conversions: float
    revenue: float
    roas: float          # 0.0 if no conversions
    cpa: float           # 0.0 if no conversions
    raw: dict = field(default_factory=dict)


@dataclass
class Thresholds:
    offer_id: str
    label: str
    ctr_floor: float
    cpc_ceiling: float
    roas_floor: float
    cpa_ceiling: float
    scale_roas_trigger: float
    scale_budget_pct: float
    scale_budget_max_mult: float
    min_impressions: int
    min_clicks: int
    min_spend_usd: float
    min_age_hours: int


@dataclass
class Decision:
    entity_level: str      # 'ad' | 'adset' | 'campaign'
    entity_id: str
    entity_name: str
    campaign_id: str
    offer_id: str
    action: str            # 'PAUSE' | 'SCALE' | 'REACTIVATE' | 'HOLD' | 'SKIP_INSUFFICIENT_DATA'
    reason: str
    old_status: str
    new_status: Optional[str]
    old_budget: Optional[float]
    new_budget: Optional[float]
    snapshot_id: Optional[str] = None


# ---------------------------------------------------------------------------
# MetaAdsClient — thin wrapper around Meta Ads MCP HTTP bridge
# ---------------------------------------------------------------------------

class MetaAdsClient:
    """
    Calls the Meta Ads MCP tools via the local MCP HTTP bridge (port 3110).
    If the bridge is unavailable, falls back to direct Meta Graph API via httpx.
    """

    MCP_BASE = "http://localhost:3110"
    GRAPH_BASE = "https://graph.facebook.com/v19.0"

    def __init__(self, account_id: str, access_token: str):
        self.account_id = account_id
        self.access_token = access_token
        self._http = httpx.AsyncClient(timeout=60)

    async def get_insights(
        self,
        level: str = "ad",
        date_preset: str = "last_7d",
        fields: Optional[list] = None,
    ) -> list[dict]:
        """Pull performance insights at ad/adset/campaign level."""
        default_fields = [
            "ad_id", "ad_name", "adset_id", "adset_name",
            "campaign_id", "campaign_name", "status",
            "impressions", "clicks", "spend", "ctr", "cpc", "cpm",
            "actions", "action_values", "purchase_roas",
        ]
        f = fields or default_fields
        params = {
            "account_id": self.account_id,
            "level": level,
            "date_preset": date_preset,
            "fields": ",".join(f),
            "access_token": self.access_token,
        }
        url = f"{self.GRAPH_BASE}/{self.account_id}/insights"
        resp = await self._http.get(url, params=params)
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def get_ads(self) -> list[dict]:
        """List all ads with current status."""
        params = {
            "fields": "id,name,status,adset_id,campaign_id,created_time",
            "access_token": self.access_token,
            "limit": 500,
        }
        url = f"{self.GRAPH_BASE}/{self.account_id}/ads"
        resp = await self._http.get(url, params=params)
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def update_ad(self, ad_id: str, status: str) -> dict:
        """Pause or activate an ad."""
        url = f"{self.GRAPH_BASE}/{ad_id}"
        resp = await self._http.post(
            url,
            data={"status": status, "access_token": self.access_token},
        )
        resp.raise_for_status()
        return resp.json()

    async def update_adset(
        self,
        adset_id: str,
        status: Optional[str] = None,
        daily_budget: Optional[int] = None,  # in account currency cents
    ) -> dict:
        """Pause/activate adset or update its daily budget."""
        url = f"{self.GRAPH_BASE}/{adset_id}"
        data = {"access_token": self.access_token}
        if status:
            data["status"] = status
        if daily_budget is not None:
            data["daily_budget"] = str(daily_budget)
        resp = await self._http.post(url, data=data)
        resp.raise_for_status()
        return resp.json()

    async def get_adset(self, adset_id: str) -> dict:
        """Get current adset config including daily_budget."""
        params = {
            "fields": "id,name,status,daily_budget,lifetime_budget,campaign_id",
            "access_token": self.access_token,
        }
        url = f"{self.GRAPH_BASE}/{adset_id}"
        resp = await self._http.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    async def close(self):
        await self._http.aclose()


# ---------------------------------------------------------------------------
# Helper: parse raw insight dict → AdInsight
# ---------------------------------------------------------------------------

def _parse_insight(raw: dict) -> AdInsight:
    impressions = int(raw.get("impressions", 0))
    clicks = int(raw.get("clicks", 0))
    spend = float(raw.get("spend", 0))
    ctr_raw = raw.get("ctr")
    ctr = float(ctr_raw) / 100 if ctr_raw else (clicks / impressions if impressions else 0.0)
    cpc = float(raw.get("cpc", 0)) if raw.get("cpc") else (spend / clicks if clicks else 0.0)
    cpm = float(raw.get("cpm", 0)) if raw.get("cpm") else 0.0

    # Conversions and revenue from actions/action_values
    conversions = 0.0
    revenue = 0.0
    for action in raw.get("actions", []):
        if action.get("action_type") in ("purchase", "offsite_conversion.fb_pixel_purchase"):
            conversions += float(action.get("value", 0))
    for av in raw.get("action_values", []):
        if av.get("action_type") in ("purchase", "offsite_conversion.fb_pixel_purchase"):
            revenue += float(av.get("value", 0))
    # Also check purchase_roas field
    roas_raw = raw.get("purchase_roas", [])
    roas = float(roas_raw[0]["value"]) if roas_raw else (revenue / spend if spend > 0 else 0.0)
    cpa = spend / conversions if conversions > 0 else 0.0

    return AdInsight(
        ad_id=raw.get("ad_id", ""),
        ad_name=raw.get("ad_name", ""),
        adset_id=raw.get("adset_id", ""),
        adset_name=raw.get("adset_name", ""),
        campaign_id=raw.get("campaign_id", ""),
        campaign_name=raw.get("campaign_name", ""),
        status=raw.get("status", "UNKNOWN"),
        impressions=impressions,
        clicks=clicks,
        spend=spend,
        ctr=ctr,
        cpc=cpc,
        cpm=cpm,
        conversions=conversions,
        revenue=revenue,
        roas=roas,
        cpa=cpa,
        raw=raw,
    )


# ---------------------------------------------------------------------------
# MetaAdsRuleEngine
# ---------------------------------------------------------------------------

class MetaAdsRuleEngine:

    def __init__(self, data_plane, meta_client: MetaAdsClient, dry_run: bool = True):
        self.dp = data_plane
        self.client = meta_client
        self.dry_run = dry_run

    async def get_thresholds(self, campaign_id: str, offer_id: str = "default") -> Thresholds:
        """Look up thresholds: campaign-specific → offer-level → default."""
        rows = await self.dp.supabase_select(
            "actp_meta_thresholds",
            filters={"active": True},
            order_by="offer_id",
        )
        # Priority: campaign-specific > offer-level > default
        by_campaign = {r["campaign_id"]: r for r in rows if r.get("campaign_id")}
        by_offer = {r["offer_id"]: r for r in rows if not r.get("campaign_id")}

        row = (
            by_campaign.get(campaign_id)
            or by_offer.get(offer_id)
            or by_offer.get("default")
        )
        if not row:
            raise ValueError("No thresholds found — seed actp_meta_thresholds first")

        return Thresholds(
            offer_id=row["offer_id"],
            label=row["label"],
            ctr_floor=float(row["ctr_floor"]),
            cpc_ceiling=float(row["cpc_ceiling"]),
            roas_floor=float(row["roas_floor"]),
            cpa_ceiling=float(row["cpa_ceiling"]),
            scale_roas_trigger=float(row["scale_roas_trigger"]),
            scale_budget_pct=float(row["scale_budget_pct"]),
            scale_budget_max_mult=float(row["scale_budget_max_mult"]),
            min_impressions=int(row["min_impressions"]),
            min_clicks=int(row["min_clicks"]),
            min_spend_usd=float(row["min_spend_usd"]),
            min_age_hours=int(row["min_age_hours"]),
        )

    def _passes_sufficiency_gate(self, ad: AdInsight, t: Thresholds) -> tuple[bool, str]:
        """Return (passes, reason). Must pass all gates before scoring."""
        if ad.impressions < t.min_impressions:
            return False, f"impressions {ad.impressions} < min {t.min_impressions}"
        if ad.spend < t.min_spend_usd:
            return False, f"spend ${ad.spend:.2f} < min ${t.min_spend_usd:.2f}"
        return True, "ok"

    def _score_ad(self, ad: AdInsight, t: Thresholds) -> tuple[str, str]:
        """
        Returns (action, reason).
        action: PAUSE | SCALE | REACTIVATE | HOLD
        """
        reasons = []
        loser_flags = 0
        winner_flags = 0

        # CTR
        if ad.impressions >= t.min_impressions:
            if ad.ctr < t.ctr_floor:
                loser_flags += 1
                reasons.append(f"CTR {ad.ctr*100:.2f}% < floor {t.ctr_floor*100:.2f}%")
            elif ad.ctr > t.ctr_floor * 2.5:
                winner_flags += 1

        # CPC (needs enough clicks)
        if ad.clicks >= t.min_clicks:
            if ad.cpc > t.cpc_ceiling:
                loser_flags += 1
                reasons.append(f"CPC ${ad.cpc:.2f} > ceiling ${t.cpc_ceiling:.2f}")
            elif ad.cpc < t.cpc_ceiling * 0.5:
                winner_flags += 1

        # ROAS/CPA (only if conversions data available)
        if ad.conversions > 0:
            if ad.roas < t.roas_floor:
                loser_flags += 1
                reasons.append(f"ROAS {ad.roas:.2f} < floor {t.roas_floor:.2f}")
            elif ad.roas > t.scale_roas_trigger:
                winner_flags += 2  # double-weight ROAS for scale decision
                reasons.append(f"ROAS {ad.roas:.2f} > scale trigger {t.scale_roas_trigger:.2f}")
            if ad.cpa > t.cpa_ceiling:
                loser_flags += 1
                reasons.append(f"CPA ${ad.cpa:.2f} > ceiling ${t.cpa_ceiling:.2f}")

        # Decision
        if loser_flags >= 2:
            return "PAUSE", "; ".join(reasons)
        if loser_flags == 1 and ad.spend > t.min_spend_usd * 3:
            # Only pause on single flag if meaningful spend
            return "PAUSE", "; ".join(reasons)
        if winner_flags >= 3 and ad.status == "ACTIVE":
            return "SCALE", "; ".join(reasons) or "All metrics above thresholds"
        if winner_flags >= 2 and ad.status == "PAUSED" and ad.roas > t.roas_floor:
            return "REACTIVATE", f"ROAS {ad.roas:.2f} recovered above floor {t.roas_floor:.2f}"

        return "HOLD", "Within acceptable range"

    async def _save_snapshot(
        self, run_id: str, ad: AdInsight
    ) -> str:
        row = {
            "run_id": run_id,
            "entity_level": "ad",
            "entity_id": ad.ad_id,
            "ad_name": ad.ad_name,
            "adset_id": ad.adset_id,
            "adset_name": ad.adset_name,
            "campaign_id": ad.campaign_id,
            "campaign_name": ad.campaign_name,
            "status": ad.status,
            "impressions": ad.impressions,
            "clicks": ad.clicks,
            "spend": str(ad.spend),
            "ctr": str(ad.ctr),
            "cpc": str(ad.cpc),
            "cpm": str(ad.cpm),
            "conversions": str(ad.conversions),
            "revenue": str(ad.revenue),
            "roas": str(ad.roas),
            "cpa": str(ad.cpa),
            "date_preset": "last_7d",
            "raw_json": ad.raw,
        }
        result = await self.dp.supabase_insert("actp_meta_performance_snapshots", row)
        return result[0]["id"] if result else None

    async def _log_decision(
        self, run_id: str, d: Decision
    ) -> None:
        row = {
            "run_id": run_id,
            "snapshot_id": d.snapshot_id,
            "entity_level": d.entity_level,
            "entity_id": d.entity_id,
            "entity_name": d.entity_name,
            "campaign_id": d.campaign_id,
            "offer_id": d.offer_id,
            "action": d.action,
            "reason": d.reason,
            "old_status": d.old_status,
            "new_status": d.new_status,
            "old_budget": str(d.old_budget) if d.old_budget is not None else None,
            "new_budget": str(d.new_budget) if d.new_budget is not None else None,
            "dry_run": self.dry_run,
        }
        await self.dp.supabase_insert("actp_meta_decisions", row)

    async def run_cycle(
        self,
        date_preset: str = "last_7d",
        campaign_offer_map: Optional[dict] = None,
    ) -> dict:
        """
        Main entry point. Pull insights → score → apply rules → log.
        campaign_offer_map: {campaign_id: offer_id} for threshold lookup.
        Returns summary dict.
        """
        run_id = str(uuid.uuid4())
        log.info(f"[MetaAds] Starting run {run_id} | dry_run={self.dry_run}")

        raw_insights = await self.client.get_insights(level="ad", date_preset=date_preset)
        ads = [_parse_insight(r) for r in raw_insights]

        summary = {"run_id": run_id, "total": len(ads), "PAUSE": 0, "SCALE": 0,
                   "REACTIVATE": 0, "HOLD": 0, "SKIP_INSUFFICIENT_DATA": 0, "errors": []}

        for ad in ads:
            try:
                offer_id = (campaign_offer_map or {}).get(ad.campaign_id, "default")
                t = await self.get_thresholds(ad.campaign_id, offer_id)

                snapshot_id = await self._save_snapshot(run_id, ad)

                passes, gate_reason = self._passes_sufficiency_gate(ad, t)
                if not passes:
                    d = Decision(
                        entity_level="ad", entity_id=ad.ad_id, entity_name=ad.ad_name,
                        campaign_id=ad.campaign_id, offer_id=offer_id,
                        action="SKIP_INSUFFICIENT_DATA", reason=gate_reason,
                        old_status=ad.status, new_status=None,
                        old_budget=None, new_budget=None, snapshot_id=snapshot_id,
                    )
                    await self._log_decision(run_id, d)
                    summary["SKIP_INSUFFICIENT_DATA"] += 1
                    continue

                action, reason = self._score_ad(ad, t)
                d = Decision(
                    entity_level="ad", entity_id=ad.ad_id, entity_name=ad.ad_name,
                    campaign_id=ad.campaign_id, offer_id=offer_id,
                    action=action, reason=reason,
                    old_status=ad.status, new_status=None,
                    old_budget=None, new_budget=None, snapshot_id=snapshot_id,
                )

                if not self.dry_run:
                    if action == "PAUSE" and ad.status == "ACTIVE":
                        await self.client.update_ad(ad.ad_id, "PAUSED")
                        d.new_status = "PAUSED"
                    elif action == "REACTIVATE" and ad.status == "PAUSED":
                        await self.client.update_ad(ad.ad_id, "ACTIVE")
                        d.new_status = "ACTIVE"
                    elif action == "SCALE" and ad.status == "ACTIVE":
                        adset = await self.client.get_adset(ad.adset_id)
                        current_budget = int(adset.get("daily_budget", 0))
                        bump = int(current_budget * (1 + t.scale_budget_pct))
                        cap = int(current_budget * t.scale_budget_max_mult)
                        new_budget = min(bump, cap)
                        if new_budget > current_budget:
                            await self.client.update_adset(ad.adset_id, daily_budget=new_budget)
                            d.old_budget = current_budget / 100  # cents → dollars
                            d.new_budget = new_budget / 100

                await self._log_decision(run_id, d)
                summary[action] = summary.get(action, 0) + 1
                log.info(f"[MetaAds] {action} | {ad.ad_name} | {reason}")

            except Exception as e:
                log.error(f"[MetaAds] Error processing ad {ad.ad_id}: {e}")
                summary["errors"].append({"ad_id": ad.ad_id, "error": str(e)})

        log.info(f"[MetaAds] Run {run_id} complete: {summary}")
        return summary
```

---

## MetaAdsExecutor (add to `workflow_executors.py`)

```python
class MetaAdsExecutor:
    """
    task_type: meta_ads
    actions: status | pull_insights | run_cycle | dry_run | pause_ad | scale_adset
    """
    task_type = "meta_ads"

    def __init__(self, data_plane, config):
        self.dp = data_plane
        self.config = config

    async def execute(self, task: dict) -> dict:
        from meta_ads_engine import MetaAdsClient, MetaAdsRuleEngine

        action = task.get("action", "status")
        account_id = self.config.META_ADS_ACCOUNT_ID
        token = os.getenv("META_ACCESS_TOKEN", "")

        if not token:
            return {"error": "META_ACCESS_TOKEN not set"}

        client = MetaAdsClient(account_id, token)
        dry_run = task.get("dry_run", self.config.META_ADS_DRY_RUN)
        engine = MetaAdsRuleEngine(self.dp, client, dry_run=dry_run)

        try:
            if action == "status":
                rows = await self.dp.supabase_select(
                    "actp_meta_decisions",
                    filters={},
                    order_by="decided_at",
                    limit=20,
                )
                return {"recent_decisions": rows}

            elif action in ("run_cycle", "dry_run"):
                if action == "dry_run":
                    engine.dry_run = True
                campaign_offer_map = task.get("campaign_offer_map", {})
                return await engine.run_cycle(
                    date_preset=task.get("date_preset", "last_7d"),
                    campaign_offer_map=campaign_offer_map,
                )

            elif action == "pull_insights":
                raw = await client.get_insights(
                    level=task.get("level", "ad"),
                    date_preset=task.get("date_preset", "last_7d"),
                )
                return {"insights": raw, "count": len(raw)}

            elif action == "pause_ad":
                ad_id = task["ad_id"]
                result = await client.update_ad(ad_id, "PAUSED")
                return {"paused": True, "ad_id": ad_id, "result": result}

            elif action == "scale_adset":
                adset_id = task["adset_id"]
                new_budget_cents = int(task["new_budget_usd"] * 100)
                result = await client.update_adset(adset_id, daily_budget=new_budget_cents)
                return {"scaled": True, "adset_id": adset_id, "result": result}

            else:
                return {"error": f"Unknown action: {action}"}

        finally:
            await client.close()
```

---

## Cron Entry (add to `cron_definitions.py`)

```python
CronJob(
    name="meta_ads_optimization",
    task_type="meta_ads",
    action="run_cycle",
    schedule="0 8 * * *",        # daily 08:00 UTC
    enabled=ENABLE_META_ADS_AUTO,
    params={
        "date_preset": "last_7d",
        "dry_run": META_ADS_DRY_RUN,
        "campaign_offer_map": {
            # populate once campaigns are created in Meta Ads Manager
            # "campaign_id_001": "offer-001",
            # "campaign_id_002": "offer-002",
        }
    },
),
```

---

## Tests Required

```python
test_parse_insight_computes_roas_from_purchase_roas_field()
test_parse_insight_computes_roas_from_action_values_when_no_purchase_roas()
test_sufficiency_gate_blocks_low_impressions()
test_sufficiency_gate_blocks_low_spend()
test_score_ad_pauses_on_two_loser_flags()
test_score_ad_holds_with_single_loser_flag_and_low_spend()
test_score_ad_scales_when_roas_above_trigger()
test_score_ad_reactivates_paused_ad_when_roas_recovers()
test_run_cycle_dry_run_logs_no_api_mutations()
test_get_thresholds_falls_back_to_default()
```

---

## First Run Checklist

1. Set `META_ACCESS_TOKEN` env var
2. Set `META_ADS_DRY_RUN=true`
3. Run `python3 -c "from meta_ads_engine import *; asyncio.run(engine.run_cycle())"`
4. Review `actp_meta_decisions` table — all rows should have `dry_run=true`, `api_success=null`
5. Verify `actp_meta_performance_snapshots` has real data for all active ads
6. Map `campaign_id → offer_id` in cron params
7. Set `META_ADS_DRY_RUN=false` only after dry-run review
