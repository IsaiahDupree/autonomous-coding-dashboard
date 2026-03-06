# PRD — Cloud Actions & Observers for Autonomous Revenue

**Goal**: $5K+/month via autonomous ads, organic content, outreach, and GTM.  
**Stack**: AdLite · MetricsLite · MPLite · PublishLite · ContentLite · GenLite · ResearchLite · CRMLite · WorkflowEngine · ACTP Worker · Safari Automation · Meta MCP

---

## Business Goal Pillars

| # | Pillar | KPI | Target |
|---|--------|-----|--------|
| 1 | **Paid Acquisition** (Meta Ads) | ROAS, CPA | ROAS > 3x, CPA < $50 |
| 2 | **Organic Reach** (content) | Followers, engagement rate | +1K followers/month |
| 3 | **CRM Funnel** (outreach → close) | Leads/week, conversion rate | 10 inbound, 5-10 closes/month |
| 4 | **GTM Engine** (automated lead gen) | Qualified leads entering CRM | 50+ qualified/week |

---

## Pillar 1 — Paid Acquisition (Meta Ads)

### Observers

| Observer | Trigger | Where |
|----------|---------|-------|
| **Meta Webhook** `ad_delivery` | Ad starts/stops delivering | Meta webhook endpoint → AdLite |
| **Meta Webhook** `lead_gen` | Lead form submission fires | Conversions API → CRMLite |
| **Meta Insights Poller** | Every 4h cron — check ROAS/CPM/CPA/frequency | AdLite `/api/cron/poll-metrics` |
| **Budget Alert Observer** | Daily spend hits 80% of cap | Meta Webhook `funding_source_events` → alert |
| **Creative Fatigue Observer** | Frequency > 3.5 on any ad set | MetricsLite scoring cron |
| **Meta mTLS Cert Watchdog** | Cert expiry < 30 days (deadline: Mar 31, 2026) | Supabase cron / alert |

### Actions Triggered

| Condition | Action | Service |
|-----------|--------|---------|
| ROAS < 1.5 for 3 consecutive polls | Pause ad set | Meta MCP `update_adset(status=PAUSED)` |
| ROAS > 4.0 + CPA < $30 | Clone winner → new ad set +30% budget | Meta MCP `duplicate_adset` (paid) |
| Frequency > 3.5 on ad set | Generate new creative variant → swap | GenLite → Meta MCP `create_ad_creative` |
| Lead form submission | Create CRM contact + score + enter nurture | CRMLite `crm.create_contact` + WorkflowEngine |
| Conversion pixel fires | Log to Conversions API (v25.0 enhanced) | AdLite Conversions API endpoint |
| New viewer metric data available (v25.0) | Migrate reporting to `page_total_media_view_unique` | MetricsLite migration job |

---

## Pillar 2 — Organic Reach

### Observers

| Observer | Trigger | Where |
|----------|---------|-------|
| **Post Check-back 1h** | 1h after publish → collect early metrics | universal_feedback_engine `run_checkbacks` |
| **Post Check-back 4h/24h** | Secondary + final performance reads | cron_definitions `feedback_loop_checkbacks` |
| **Viral Threshold Observer** | Engagement score > 2x niche average | MetricsLite `scoring_winners` cron (8h) |
| **Follower Delta Observer** | Weekly follower count delta from platform | ResearchLite weekly cron |
| **Hashtag Trend Observer** | Trending topics in target niches | ResearchLite `collect-hashtags` cron |
| **Twitter Playbook Staleness** | Playbook age > 7 days | WorkflowEngine `twitter_playbook_refresh` (Sun 4AM) |

### Actions Triggered

| Condition | Action | Service |
|-----------|--------|---------|
| Post engagement_score > 2x avg | Boost as Meta ad (dark post) | AdLite → Meta MCP `create_campaign` |
| Post classified as `viral` | Generate 3 similar posts from same framework | ContentLite `generate/from-blueprint` |
| Post classified as `flop` | Mark framework negative weight, avoid | universal_feedback_engine strategy update |
| Trending hashtag intersects niche | Inject into next content batch | ResearchLite → ContentLite pipeline |
| Weekly followers < +50 | Escalate to more aggressive outreach | CRMLite + Safari DM campaign trigger |
| Twitter playbook stale | Re-run `twitter-research-to-publish` workflow | WorkflowEngine start execution |

---

## Pillar 3 — CRM Funnel

### Observers

| Observer | Trigger | Where |
|----------|---------|-------|
| **Supabase Realtime** on `crm_contacts.stage` | Contact advances pipeline stage | CRMLite → WorkflowEngine |
| **Score Threshold Observer** | Contact score crosses 50, 70, 85 | prospect_funnel_scorer.py cron (8h) |
| **Email Reply Observer** | Instantly.ai reply webhook | CRMLite inbound webhook |
| **LinkedIn Reply Observer** | Safari automation detects DM reply | crm_dm_sync (every 30min) |
| **RevenueCat Subscription** | New subscription / churn event | CRMLite `/api/revcat/webhook` |
| **Offer Read Receipt** | Email opened >3x without reply | Instantly webhook → CRMLite flag |
| **Decision Stage Timer** | Contact in Decision stage > 48h no action | Supabase scheduled function |

### Actions Triggered

| Condition | Action | Service |
|-----------|--------|---------|
| Score crosses 50 | Move to Consideration + enqueue LinkedIn DM | strategic_outreach + Safari DM |
| Score crosses 70 | Generate personalized offer email | crm_brain `generate` → Instantly enroll |
| Score crosses 85 | Escalate to manual review + Telegram alert | CRMLite agent.save_health_snapshot + alert |
| Email replied | Advance stage → schedule follow-up | CRMLite `crm.advance_pipeline` |
| RevenueCat subscription fires | Tag contact as `customer`, stop outreach | CRMLite `crm.add_tag(customer)` |
| Decision stage > 48h stale | Send urgency follow-up + offer discount | CRMLite `crm.log_interaction` + Instantly |

---

## Pillar 4 — GTM Engine

### Observers

| Observer | Trigger | Where |
|----------|---------|-------|
| **LinkedIn Giveaway Scanner** | New comments on giveaway posts | PhantomBuster cron → gtm-engineering-agents |
| **Podcast RSS Watcher** | New episode published in target shows | Rafonic scraper cron |
| **ICP Growth Signal Scanner** | LinkedIn company headcount +20%/quarter | PhantomBuster + Clay enrichment |
| **Facebook Ad Library Scanner** | Competitor launches new ad campaign | Research market cron (facebook biweekly) |
| **Upwork Signal Observer** | New job post matching ICP keywords | Upwork API poll |
| **Business Signal Engine** | Gmail leads, inbound form fills | business_signal_engine.py `--run` (daily) |

### Actions Triggered

| Condition | Action | Service |
|-----------|--------|---------|
| LinkedIn comment contains keyword | Auto-DM Notion resource URL | gtm-engineering-agents `linkedin-giveaway` |
| New podcast episode detected | Enroll host in cold email via Instantly | gtm-engineering-agents `podcast-cold-email` |
| ICP company hits growth signals | PhantomBuster scrape → Clay → Instantly enroll | gtm-engineering-agents `linkedin-icp-crawler` |
| Competitor ad runs > 14 days | Analyze creative → generate counter-variation | ResearchLite → GenLite pipeline |
| Upwork job matches ICP | Generate proposal + submit | gtm-engineering-agents workflow |
| Gmail lead arrives | Score + route → CRMLite + Instantly sequence | business_signal_engine |

---

## Cross-Pillar Orchestration

### Master Workflow (WorkflowEngine)

```
research → score_frameworks → generate_content → review → schedule → publish
                                     ↓
                              if viral → boost_as_ad
                                     ↓
                              leads enter CRM → score → outreach → close
```

### Missing Cloud Infrastructure (Gaps)

| Gap | What's Needed | Priority |
|-----|---------------|----------|
| Meta Webhooks endpoint | `POST /api/webhooks/meta` in AdLite accepting ad/lead events | 🔴 High |
| Supabase Realtime subscription | `crm_contacts.stage` change → WorkflowEngine trigger | 🔴 High |
| Meta v25.0 viewer metrics migration | Update all `page_impressions_*` → `page_total_media_view_unique` | 🔴 High (breaks June 2026) |
| mTLS cert update | Download `meta-outbound-api-ca-2025-12.pem` + update trust store | 🔴 Critical (deadline Mar 31, 2026) |
| Instantly reply webhook | Wire Instantly inbound webhooks → CRMLite stage advance | 🟡 Medium |
| Viral boost pipeline | `engagement_score > threshold` → Meta MCP `create_campaign` | 🟡 Medium |
| Upwork observer | Upwork API poll → gtm-engineering-agents proposal pipeline | 🟡 Medium |
| Budget reallocation cron | Cross-campaign budget optimizer using MetricsLite winners | 🟡 Medium |
| Telegram alert channel | Escalation path for score=85 contacts + Meta alerts | 🟠 Medium |

---

## Recommended Build Order

1. **Meta Webhook endpoint** in AdLite — receives real-time ad + lead events (highest leverage)
2. **mTLS cert** — critical deadline March 31, 2026 or webhooks die
3. **Supabase Realtime → WorkflowEngine bridge** — ties CRM events to automated workflows
4. **Meta v25.0 metrics migration** — deadline June 2026, migrate now before it breaks
5. **Viral boost pipeline** — content_performance → Meta ad creation (unlocks organic-to-paid flywheel)
6. **Instantly reply webhook** — close the outreach loop automatically
7. **Upwork observer** — passive lead gen channel

---

## Existing Crons (Already Running)

| Cron | Schedule | Pillar |
|------|----------|--------|
| `agent_heartbeat` | Every 30min | Infra |
| `crm_dm_sync` | Every 30min | CRM |
| `metrics_refresh` | Every 5min | Paid/Organic |
| `mplite_queue_poll` | Every 15s | Organic |
| `feedback_loop_checkbacks` | Every 4h | Organic |
| `universal_feedback_cycle` | Every 6h | Organic |
| `facebook_research_biweekly` | Fri 3AM | GTM/Paid |
| `twitter_daily_generation` | Daily 5AM | Organic |
| `feedback_loop_strategy` | Daily 6AM | Organic |
| `scoring_winners` | Every 8h | CRM/Paid |
| `nightly_consolidation` | 3AM | Memory |
| `morning_briefing` | 8AM | Infra |
