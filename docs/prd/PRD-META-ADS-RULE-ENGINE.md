# PRD: Meta Ads Rule Engine
**Status**: Planned  
**Priority**: High  
**Owner**: ACTP Worker  
**Supabase Project**: ivhfuhxorppptyuofbgq

---

## Problem

Meta Ads require constant human monitoring to pause losers and scale winners. Manual checks
lag behind real performance, wasting budget on underperforming ads. The MCP has full API
coverage (`get_insights`, `update_ad`, `update_adset`) — this PRD defines how to use it
programmatically on a schedule with data-driven thresholds tied to our actual offers.

---

## Strategic Threshold Derivation

### Offer 001 — AI Automation Audit + Build ($2,500 fixed-price)

- **ICP**: SaaS founders $500K–$5M ARR — B2B Meta audience
- **Funnel model**: Click → Lead (3–5%) → Close (5–10%) → Click-to-close ~0.15–0.5%
- **Target CPA**: ≤ $500 (20% of offer value, 80% margin)
- **B2B Meta benchmarks**: CPC $5–15, CPL $30–80, close rate ~8%
- **Break-even**: $500 spend → 1 close at $2,500 = 5× ROAS

| Metric | Pause (Loser) | Hold | Scale (Winner) |
|--------|---------------|------|----------------|
| CTR | < 0.5% | 0.5–1.2% | > 1.2% |
| CPC | > $12.00 | $5–$12 | < $5.00 |
| ROAS | < 1.5 | 1.5–3.0 | > 3.0 |
| CPA | > $600 | $200–$600 | < $200 |

### Offer 002 — Social Growth System ($500/month retainer)

- **ICP**: Creators and SMB operators — broader Meta audience
- **LTV model**: $500 × 6 avg months = $3,000 LTV
- **Target CPA**: ≤ $200 (6.7% of LTV)
- **Consumer-adjacent benchmarks**: CTR 1–3%, CPC $2–6

| Metric | Pause (Loser) | Hold | Scale (Winner) |
|--------|---------------|------|----------------|
| CTR | < 1.0% | 1.0–2.5% | > 2.5% |
| CPC | > $5.00 | $2–$5 | < $2.00 |
| ROAS | < 2.0 | 2.0–4.0 | > 4.0 |
| CPA | > $300 | $100–$300 | < $100 |

### Data Sufficiency Gates (prevent premature pausing)

- **Impressions**: Minimum 1,000 before evaluating CTR
- **Clicks**: Minimum 50 before evaluating CPC
- **Spend**: Minimum $20 before evaluating ROAS/CPA
- **Age**: Minimum 48h for new ads (learning phase)

---

## Rule Engine Logic

```python
# Pseudo-code for the rule engine
for ad in get_insights(level="ad", date_preset="last_7d"):
    if not passes_sufficiency_gate(ad):
        continue  # too early to judge

    thresholds = get_thresholds_for_offer(ad.campaign_id)
    decision = score_ad(ad, thresholds)

    if decision == "PAUSE":
        update_ad(ad.ad_id, status="PAUSED")
        log_decision(ad, "PAUSED", reason)

    elif decision == "SCALE" and ad.status == "ACTIVE":
        new_budget = min(current_budget * 1.20, original_budget * 2.0)
        update_adset(ad.adset_id, daily_budget=new_budget)
        log_decision(ad, "SCALED", f"budget +20% to ${new_budget}")

    elif decision == "REACTIVATE" and ad.status == "PAUSED":
        if ad.roas > thresholds.roas_floor:
            update_ad(ad.ad_id, status="ACTIVE")
            log_decision(ad, "REACTIVATED", reason)
```

---

## Granularity Strategy

1. **Ad level** — primary control: pause individual creatives that underperform
2. **Ad set level** — secondary: pause entire audience/budget group if all ads are losers; scale budget on winners
3. **Campaign level** — manual only: never auto-pause entire campaigns (require approval gate)

---

## Execution Frequency

| Condition | Frequency |
|-----------|-----------|
| Account daily spend < $50 | Daily at 08:00 UTC |
| Account daily spend $50–$200 | Every 6 hours |
| Account daily spend > $200 | Hourly |
| Spend milestone ($50 increments) | Triggered |

---

## Data to Store

### `actp_meta_thresholds`
Per offer/campaign configuration. Editable without code changes.

### `actp_meta_performance_snapshots`
Raw `get_insights` output saved every run per ad/adset/campaign.
Fields: `ad_id`, `adset_id`, `campaign_id`, `ctr`, `cpc`, `cpa`, `roas`, `spend`,
`impressions`, `clicks`, `conversions`, `snapshot_date`, `date_preset`.

### `actp_meta_decisions`
Audit log of every rule engine decision.
Fields: `entity_id`, `entity_level` (ad/adset/campaign), `action` (PAUSE/SCALE/REACTIVATE/HOLD),
`reason`, `old_status`, `new_status`, `old_budget`, `new_budget`, `decided_at`.

---

## MCP Tools Used

| Step | Tool | Args |
|------|------|------|
| Pull performance | `get_insights` | `account_id`, `level=ad`, `date_preset=last_7d` |
| List all ads | `get_ads` | `account_id` |
| Pause loser | `update_ad` | `ad_id`, `status=PAUSED` |
| Activate winner | `update_ad` | `ad_id`, `status=ACTIVE` |
| Scale budget | `update_adset` | `adset_id`, `daily_budget=N` |
| Pause adset | `update_adset` | `adset_id`, `status=PAUSED` |

Meta account: `act_2005521593177778`  
Page ID: `239537119252811`  
IG Business Account: `17841472205103640`

---

## ACTP Integration

- **Service**: `meta_ads` (new)  
- **Topics**: `pull_insights`, `score_ads`, `apply_rules`, `scale_winners`, `pause_losers`, `run_cycle`, `status`
- **File**: `actp-worker/meta_ads_engine.py`
- **Executor**: `MetaAdsExecutor` in `workflow_executors.py`
- **Cron**: `meta_ads_optimization` — daily 08:00 UTC + spend-triggered
- **Approval gate**: Scale decisions auto-apply; campaign-level pauses require approval

---

## Implementation Checklist

- [ ] Apply Supabase migration (3 tables)
- [ ] Write `meta_ads_engine.py` with `MetaAdsRuleEngine` class
- [ ] Add `MetaAdsExecutor` to `workflow_executors.py`
- [ ] Add `meta_ads_optimization` cron to `cron_definitions.py`
- [ ] Add `meta_ads.*` routes to `service_registry.py`
- [ ] Add `ENABLE_META_ADS_AUTOMATION`, `META_ADS_ACCOUNT_ID` to `config.py`
- [ ] Seed `actp_meta_thresholds` with offer-001 and offer-002 rows
- [ ] First dry-run: pull real insights, log decisions, no API mutations
- [ ] Second run: enable live mutations after dry-run review
