# PRD-012: Autonomous Revenue Engine

## Priority: P1 (HIGH — monetization layer)
## Target: actp-worker, EverReach, ClientPortal, Stripe, RevenueCat
## Status: PLANNED

---

## Problem Statement

The ACTP system can generate and publish content, but there is **no automated revenue collection or optimization**. Revenue APIs (Stripe, RevenueCat, Meta Ads, YouTube) are configured with API keys but not actively queried or acted upon. The $5K+/month revenue target requires:

1. **App Store revenue** from EverReach Pro ($19.99/mo subscriptions via RevenueCat)
2. **SaaS revenue** from ClientPortal ($49/mo via Stripe)
3. **Ad revenue** from YouTube/TikTok monetization
4. **Service revenue** from Upwork contracts + content automation clients
5. **Ad spend optimization** — graduate organic winners into paid campaigns

None of these revenue streams are being monitored, optimized, or grown autonomously.

## What Exists Today

| Revenue Channel | API Keys | Data Collection | Optimization | Status |
|----------------|----------|-----------------|--------------|--------|
| RevenueCat (Apple) | ✅ Configured | ❌ Not queried | ❌ None | Idle |
| Stripe | ✅ Live key | ❌ Not queried | ❌ None | Idle |
| YouTube API | ✅ Configured | ❌ Not queried | ❌ None | Idle |
| Meta/Facebook API | ✅ Configured | ❌ Not queried | ❌ None | Idle |
| Instagram API | ✅ Configured | ❌ Not queried | ❌ None | Idle |
| Twitter API | ✅ Configured | ✅ Via Safari | ✅ Feedback loop | Active |
| Upwork | ✅ Safari client | ❌ Not scanning | ❌ None | Idle |
| LinkedIn | ✅ Safari client | ❌ Not prospecting | ❌ None | Idle |

## Requirements

### R1: Revenue Dashboard Data Plane (MUST HAVE)
- `system.daily_revenue` topic — pulls from all revenue sources daily
- RevenueCat: active subscribers, MRR, churn rate, trial conversions
- Stripe: active subscriptions, MRR, recent charges, refunds
- YouTube: estimated earnings, watch time, subscriber count
- Store daily snapshots in `actp_revenue_snapshots`
- Telegram daily summary at 8AM: "Revenue: $X MRR, Y subscribers, Z new"

### R2: RevenueCat Integration (MUST HAVE)
- Pull subscriber data via RevenueCat REST API
- Track: active subs, expired, trial, billing issues
- Webhook receiver for real-time subscription events
- Map RevenueCat subscribers → CRM contacts
- Alert on churn spikes (>10% above baseline)

### R3: Stripe Integration (MUST HAVE)
- Pull subscription data via Stripe API
- Track: active subs, MRR, net revenue, refund rate
- Webhook receiver for payment events
- Auto-create CRM contacts for new customers
- Dunning management: alert on failed payments

### R4: YouTube Analytics Integration (SHOULD HAVE)
- Pull channel analytics via YouTube Data API v3
- Track: views, watch time, subscribers, estimated earnings
- Per-video performance (top 10 by views/engagement)
- Content strategy feedback: which video types perform best

### R5: Ad Spend Optimization (SHOULD HAVE)
- Graduate organic winners (engagement score ≥8.0) into paid campaigns
- Meta Ads: create lookalike audiences from top engagers
- Budget rules: max $50/day, pause if CPA > $10
- Track ROAS (Return on Ad Spend) per campaign
- Auto-pause underperformers after 48hr

### R6: Upwork Revenue Pipeline (SHOULD HAVE)
- Auto-scan for matching contracts every 2 hours
- AI-generated proposals via Claude
- Track: proposals sent, interviews, contracts won, revenue
- Target: 2 contracts/month at $2K+ each

### R7: Daily Revenue Automation Cron
```
08:00  revenue.daily_snapshot     → pull all revenue sources
08:05  revenue.telegram_summary   → send daily Telegram report
08:10  revcat.check_subscribers   → check for churn/trials
08:15  stripe.check_payments      → check for failed payments
09:00  upwork.scan                → find new matching contracts
12:00  ads.check_performance      → check running ad campaigns
18:00  revenue.weekly_trend       → weekly trend analysis (Sundays)
```

## Implementation Plan

### Phase 1: Revenue Data Collection (Week 1)
1. Add `revcat_client.py` — async httpx client for RevenueCat REST API
2. Add `stripe_client.py` — async httpx client for Stripe API
3. Add `youtube_analytics_client.py` — YouTube Data API v3
4. Create `actp_revenue_snapshots` Supabase table
5. Implement `system.daily_revenue` topic in service_registry

### Phase 2: Telegram Revenue Reports (Week 1)
1. Daily 8AM cron sends revenue summary via Telegram
2. Format: MRR, subscriber count, new subs, churned, growth %
3. Weekly trend chart (text-based spark line)
4. Alert on anomalies: revenue drop >10%, churn spike

### Phase 3: Webhook Receivers (Week 2)
1. RevenueCat webhook: `/webhooks/revcat` on health server
2. Stripe webhook: `/webhooks/stripe` on health server
3. Auto-create CRM contacts on new subscription
4. Auto-log interactions on payment events

### Phase 4: Ad Optimization (Week 3)
1. Winner graduation: organic score ≥8.0 → create Meta ad
2. AdLite integration for campaign management
3. Budget rules and auto-pause logic
4. ROAS tracking and reporting

## Success Criteria

| Metric | Target |
|--------|--------|
| Revenue sources monitored | ≥4 (RevCat, Stripe, YouTube, Meta) |
| Daily Telegram report | Sent by 8:05 AM |
| Revenue data freshness | <24 hours |
| Alert latency (churn/payment fail) | <1 hour |
| Ad ROAS tracking | Active for graduated winners |
| Monthly revenue visibility | Complete, real-time |

## Files to Create/Modify

### New Files
- `actp-worker/revcat_client.py` — RevenueCat API client
- `actp-worker/stripe_client.py` — Stripe API client  
- `actp-worker/youtube_analytics_client.py` — YouTube analytics
- `actp-worker/revenue_reporter.py` — daily/weekly revenue reports

### Modified Files
- `actp-worker/service_registry.py` — revenue.* topics
- `actp-worker/health_server.py` — webhook receivers
- `actp-worker/cron_definitions.py` — revenue crons
- `actp-worker/data_plane.py` — revenue data methods
- `actp-worker/heartbeat_agent.py` — revenue health checks

### Supabase Tables
- `actp_revenue_snapshots` — daily revenue data per source
- `actp_revenue_alerts` — anomaly alerts and resolutions
