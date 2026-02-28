# PRD-019: Autonomous Revenue Machine — Skill Audit & Gap Specs

**Status:** Draft | **Created:** 2026-02-25 | **Source:** `/skills/autonomous-revenue/SKILL.md`

---

## 1. Audit Matrix

| SKILL.md Component | Coverage | PRD |
|-------------------|----------|-----|
| Safari research pipeline (5 platforms) | ✅ | PRD-003, PRD-008 |
| Blueprint extraction + ResearchLite | ✅ | PRD-003, PRD-017 |
| Twitter 5-niche pipeline | ✅ | PRD-008 |
| ContentLite: blueprint→script, tweet gen | ✅ | PRD-010 |
| Remotion video rendering | ✅ | PRD-004, PRD-010 |
| AI content review gate | ✅ | PRD-005, PRD-011 |
| Universal feedback loop | ✅ | PRD-011 |
| Multi-platform publishing (Blotato, MPLite) | ✅ | PRD-006, PRD-007 |
| Thompson Sampling timing | ✅ | PRD-006 |
| RevenueCat + Stripe + YouTube monitoring | ✅ | PRD-012 |
| Telegram daily revenue report | ✅ | PRD-012 |
| 3-layer memory (Knowledge Graph/Daily/Tacit) | ✅ | PRD-014, PRD-016, PRD-COGNITIVE-ARCH |
| Nightly memory promotion (3AM) | ✅ | PRD-008, PRD-016 |
| Approval gates + audit log | ✅ | PRD-013 |
| ACD harness start/stop/status | ✅ | PRD-010 |
| ACD self-heal delegation | ✅ | PRD-013 |
| **Sora video generation pipeline** | ❌ Gap | §4.1 |
| **Credit efficiency enforcement** (<$400/mo) | ❌ Gap | §4.2 |
| **PostHog integration** (funnel, events, flags) | ❌ Gap | §4.3 |
| **Superwall paywall optimization** | ❌ Gap | §4.4 |
| **Full attribution model** (content→paid) | ❌ Gap | §4.5 |
| **Meta Ads winner graduation** | ❌ Gap | §4.6 |
| **LinkedIn + DM outreach + CRM** | ❌ Gap | §4.7 |
| **Upwork scanning + AI proposals** | ❌ Gap | §4.7 |
| **Email marketing (Resend)** | ❌ Gap | §4.8 |
| **ACD product improvement workflow** | ❌ Gap | §4.9 |
| **App Store optimization pipeline** | ❌ Gap | §4.9 |
| **Full daily autonomous routine spec** | ❌ Gap | §4.10 |
| **500-user funnel phase tracker** | ❌ Gap | §4.11 |

---

## 2. Gap Specifications

### §4.1 Sora Video Pipeline

`sora.generate` / `sora.reprocess` topics exist with no spec.

**Flow:** Prompt → Sora API → watermark removal → Supabase Storage → MediaPoster webhook → Blotato → feedback registration

**Table:** `actp_sora_jobs (id, prompt, style, duration_seconds, status, raw_url, processed_url, cost_usd, created_at)`

**File:** `sora_client.py` | **Phase:** 3

---

### §4.2 Credit Efficiency Enforcement

SKILL.md §10: 8 credit rules documented but not enforced at runtime. Target: <$400/month.

**Tables:**
```sql
actp_credit_usage  (id, task_type, model, input_tokens, output_tokens, cost_usd, run_id, created_at)
actp_credit_budgets (scope PK, limit_usd, alert_threshold_pct, current_spend_usd, reset_at)
```

**Enforced model routing:**
- `draft_generation` → haiku
- `content_review` → haiku  
- `research_synthesis` → sonnet
- `architecture_planning` → opus only
- ACD harness: haiku=tests, sonnet=features, opus=architecture

**Budget rules:** Daily $15 limit. At 80% → Telegram warning. At 100% → suspend non-critical generation crons until reset.

**Cache-first:** Before any `research.*` job, check `actp_market_items.updated_at`. If < 24h old, return cached, skip scrape.

**File:** `credit_governor.py` | **Phase:** 2

---

### §4.3 PostHog Product Analytics Integration

**Topics:** `posthog.funnel`, `posthog.events`, `posthog.insights`, `posthog.feature_flags`, `posthog.funnel_by_source`

**Key queries for revenue loop:**
- Which UTM source drives most paid conversions? → `funnel(steps=[pageview, signup, trial, purchase], breakdown=utm_source)`
- Which paywall variant converts best? → `feature_flags` A/B results
- Trial retention curve → `insights(type=retention, cohort=trial_users)`

**Attribution link:** PostHog `distinct_id` → CRM contact → RevenueCat subscriber

**File:** `posthog_client.py` | **Phase:** 2

---

### §4.4 Superwall Paywall Optimization

**Topics:** `superwall.paywalls`, `superwall.metrics`, `superwall.webhook`, `superwall.ab_test`

**Optimization loop:** `superwall.metrics` → rank by conversion_rate → identify winner (p<0.05) → `delegate_to_acd`: update paywall variant → measure 7-day window → `memory.write_knowledge`

**Table:** `actp_paywall_experiments (id, product, variant_id, impressions, conversions, revenue_usd, conversion_rate, significance, status, created_at)`

**File:** `superwall_client.py` | **Phase:** 2

---

### §4.5 Full Attribution Model

SKILL.md §4 defines 8-step chain and 8 dimensions. No PRD formalizes this.

**Tables:**
```sql
actp_attribution_events (
  id, post_id, event_type,   -- click|signup|trial|purchase|churn
  user_id, crm_contact_id,
  utm_source, utm_medium, utm_campaign,
  platform, content_type, hook_category, niche, framework, offer, paywall_variant,
  revenue_usd, created_at
)
actp_attribution_summary (
  id, dimension, dimension_value,
  clicks, signups, trials, purchases, revenue_usd, cpa_usd, roas,
  updated_at
)
```

**HookLite UTM:** Every published post gets `utm_campaign=post_{id}`. Click → HookLite records it → attribution_events write `event_type=click`.

**File:** `attribution_engine.py` | **Phase:** 2

---

### §4.6 Meta Ads Winner Graduation

SKILL.md §5 Phase 2: graduate organic winners (engagement_score ≥ 8.0) into paid campaigns. PRD-012 covers monitoring only.

**Logic:** `feedback.list_posts` → filter score ≥ 8.0 AND `status=organic_only` → create Meta campaign ($5-10/day, lookalike audience) → auto-pause if CPA > $10 after 48hr or no conversions after $20 spend.

**Table:** `actp_ad_campaigns (id, source_post_id, platform, campaign_id, status, daily_budget_usd, spend_usd, cpa_usd, roas, created_at)`

**Phase:** 2

---

### §4.7 Outreach & CRM Pipeline

SKILL.md §3: 14 DM topics, 11 LinkedIn topics, 6 Upwork topics, 10 CRM topics. No PRD.

**LinkedIn:** `linkedin.prospect` (search+score+connect), `linkedin.campaign` (batch outreach), `linkedin.ai_message` (Claude-generated), `linkedin.stats`

**DM:** `dm.ai_generate`, `dm.send`, `dm.process_outreach` (APPROVAL REQUIRED), `dm.top_contacts`, `dm.score_contact`

**Upwork:** `upwork.search`, `upwork.scan`, `upwork.propose` (Claude AI proposal), `upwork.track`, `upwork.stats`

**Tables:**
```sql
actp_contacts (id, name, platform, handle, email, niche, score, status, source, tags[], first_contact_at, last_interaction_at)
actp_interactions (id, contact_id, type, content, platform, created_at)
actp_outreach_queue (id, contact_id, action, message, platform, status, approval_required, scheduled_at, sent_at)
actp_upwork_jobs (id, job_id UNIQUE, title, budget_usd, status, proposal_text, contract_value_usd, created_at)
```

**Phase 1 targets:** 50 LinkedIn/day, 20 DMs/day, 5 Upwork proposals/day

**Files:** `outreach_engine.py`, `crm_engine.py`, `upwork_engine.py` | **Phase:** 1

---

### §4.8 Email Marketing Integration (Resend)

SKILL.md §2: Resend for transactional + marketing. No PRD.

**Topics:** `email.send`, `email.status`, `email.list`, `email.stats`, `email.webhook`

**Sequences:**
1. Trial onboarding: days 1, 3, 7 → feature highlight → conversion nudge → discount
2. Win-back: day 30 post-churn → personalized offer
3. Weekly digest to warm CRM leads

**Attribution:** Every email link gets UTM → PostHog tracks open/click/signup → `actp_attribution_events` records `event_type=email_click`

**Tables:**
```sql
actp_email_sequences (id, name, trigger, steps JSONB, active, created_at)
actp_email_sends (id, sequence_id, contact_id, step_number, subject, status, sent_at, opened_at, clicked_at)
```

**File:** `email_engine.py` | **Phase:** 2

---

### §4.9 ACD Product Improvement & App Store Optimization

**ACD improvement loop (SKILL.md §9):**
```
posthog.funnel → find biggest drop-off
posthog.events → drill into drop-off behavior
delegate_to_acd: "Fix {step} — users drop at {rate}% because {analysis}"
system.acd_status → poll until done
posthog.funnel → measure delta
memory.write_knowledge → record what improved what metric
```

**Table:** `actp_product_experiments (id, project, hypothesis, acd_task, baseline_conversion, post_conversion, status, result, created_at)`

**App Store priority order (SKILL.md §9):**
1. EverReach Pro ($19.99/mo) — paywall + RevenueCat
2. KindLetters ($9.99/mo) — App Store listing
3. ClientPortal ($49/mo) — Stripe billing flow
4. Top Rork: rork-crm, ig-lead-finder, social-campaigns

**Table:** `actp_aso_experiments (id, app, experiment_type, hypothesis, acd_task, baseline_metric, post_metric, metric_name, status, created_at)`

**File:** `acd_delegation_engine.py` | **Phase:** 2

---

### §4.10 Full Daily Autonomous Routine

SKILL.md §8 defines a complete 17-step daily routine. PRD-011 has a partial list. No complete spec with failure handling exists.

**Morning 06:00–09:00:** heartbeat → revenue snapshot → graph.search (recall) → research (cache-first) → strategy → generate 50 posts → sora videos → publish.auto → linkedin.prospect → upwork.scan → email nurture

**Midday 12:00–13:00:** 4hr checkbacks → dm.process_outreach (APPROVAL) → crm.stats → posthog.funnel → generate_prompt from winners

**Afternoon 15:00–16:00:** second batch generate → publish.auto → social.collect

**Evening 18:00–20:00:** 24hr checkbacks → feedback.analysis → metrics.winners → revenue snapshot → revcat.overview → superwall.metrics → posthog.insights

**Night 20:00–21:00:** memory.write_daily → graph.record_event → generate_prompt → telegram.daily_report → orchestrator.daily_summary

**Overnight 03:00:** memory.promote → graph.sync_vault → system.self_test

**Failure rules:**
- `system.heartbeat` fails → Telegram alert, skip generation steps, continue revenue+memory
- Generation step fails → retry once, skip + log, continue pipeline
- `dm.process_outreach` → never auto-run, always require approval

**File:** `daily_routine.py` | **Cron:** 06:00 local daily | **Phase:** 1

---

### §4.11 500-User Acquisition Funnel Tracker

SKILL.md §5: 3 phases with specific action volumes per phase. No PRD tracks phase or automates transitions.

**Phase detection:**
- Phase 1: `revcat.active_subscribers < 50` → organic only, zero ads
- Phase 2: `50–199` → micro-budget ads $5-10/day, scale winners
- Phase 3: `200+` → automated loops, $50-100/day ads

**Conversion targets:** impression→click 2-5%, click→signup 10-20%, signup→trial 30-50%, trial→paid 10-20%, month-1 retention 80%

**Table:** `actp_funnel_snapshots (id, snapshot_date, paying_users, mrr_usd, phase, impressions, clicks, signups, trials, impression_to_click, click_to_signup, signup_to_trial, trial_to_paid, month1_retention, created_at)`

**Phase transition alert:** Telegram when subscriber count crosses 50 or 200

**File:** `funnel_tracker.py` | **Phase:** 2

---

## 3. New Tables Summary

| Table | Gap | Purpose |
|-------|-----|---------|
| `actp_sora_jobs` | §4.1 | Sora video generation tracking |
| `actp_credit_usage` | §4.2 | Per-task AI spend ledger |
| `actp_credit_budgets` | §4.2 | Daily/monthly budget limits |
| `actp_paywall_experiments` | §4.4 | Superwall A/B tracking |
| `actp_attribution_events` | §4.5 | Full content→revenue attribution chain |
| `actp_attribution_summary` | §4.5 | Aggregated attribution by dimension |
| `actp_ad_campaigns` | §4.6 | Meta Ads graduation tracking |
| `actp_contacts` | §4.7 | CRM contact registry |
| `actp_interactions` | §4.7 | Contact interaction history |
| `actp_outreach_queue` | §4.7 | DM/LinkedIn pending actions |
| `actp_upwork_jobs` | §4.7 | Upwork proposals + contracts |
| `actp_email_sequences` | §4.8 | Email drip sequence definitions |
| `actp_email_sends` | §4.8 | Per-send delivery + engagement |
| `actp_product_experiments` | §4.9 | ACD product improvement tracking |
| `actp_aso_experiments` | §4.9 | App Store optimization tracking |
| `actp_funnel_snapshots` | §4.11 | Daily conversion funnel snapshots |

---

## 4. Build Priority

**Phase 1 (now — revenue-critical):**
- §4.7 Outreach & CRM (`outreach_engine.py`, `crm_engine.py`, `upwork_engine.py`)
- §4.10 Daily Autonomous Routine (`daily_routine.py`)

**Phase 2 (next — optimization):**
- §4.2 Credit Governance (`credit_governor.py`)
- §4.3 PostHog (`posthog_client.py`)
- §4.4 Superwall (`superwall_client.py`)
- §4.5 Attribution Model (`attribution_engine.py`)
- §4.6 Meta Ads Graduation
- §4.8 Email Engine (`email_engine.py`)
- §4.9 ACD delegation workflow
- §4.11 Funnel tracker

**Phase 3:**
- §4.1 Sora pipeline (`sora_client.py`)
