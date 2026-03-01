# PRD-115: Revenue & Analytics Domain Agent (Native Tool Calling)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-115-features.json
- **Depends On**: PRD-111 (NativeToolAgent base), PRD-110 (consistency dashboard data)
- **Priority**: P1 — closes the feedback loop: measures progress toward $50K cumulative

## Context

This agent is the **revenue and analytics brain** for EverReach OS. It extends `NativeToolAgent` and owns all measurement and optimization: Stripe MRR, Apple App Store revenue, YouTube analytics, follower velocity, AI cost tracking, goal gap analysis, and weekly report generation. When revenue is off-track, it signals the Orchestrator (PRD-100) to re-prioritize.

Business targets:
- $5K+/month from March 2026, $50K cumulative in 3 months
- Revenue breakdown: EverReach ($2K) + SaaS ($1.5K) + Services ($2K) + Upwork ($4K) = $9.5K Month 1
- AI cost ceiling: $400/month max (currently tracked via Anthropic billing)
- Audience: 1M followers per platform, 100K views/video consistently

Current data available:
- YouTube: @isaiah_dupree, 2810 subs, 171,781 total views, 25 rows in youtube_video_stats
- Gmail: 16 emails classified, intent_score tracked
- YouTube niche resonance: email_marketing/entertainment avg 241 views (top)

## Domain System Prompt

```
You are the revenue and analytics brain for EverReach OS. Your mission:
1. Track all revenue streams (Stripe, Apple App Store, Upwork, services retainers)
2. Compare actual vs. targets every day: $5K/month goal, $50K cumulative
3. Monitor audience growth (followers/day, views/video, 1M target per platform)
4. Track AI costs vs. $400/month ceiling — alert if projected to exceed
5. Identify the biggest gap between current trajectory and goals
6. Generate weekly executive report every Sunday 20:00
7. Signal the Cognitive Orchestrator when goals are off-track

Revenue targets (Month 1 = March 2026):
- EverReach Pro (Apple): $2K (100 users × $19.99)
- ClientPortal (Stripe): $1.5K (30 users × $49)
- Services retainer: $2K (1 client × $2K)
- Upwork: $4K (2 contracts × $2K)
Total: $9.5K Month 1

Audience targets:
- 1M followers on: TikTok, Instagram, YouTube, Twitter, Threads
- Current YouTube: 2810 subscribers (ETA to 1M depends on daily gain)
- 100K+ average views per video consistently

Cost ceiling:
- AI (Anthropic): $400/month max
- Use claude-haiku-4-5 for all analytics calls (cheapest)
- Alert if 30-day projected cost > $350 (buffer)

Report every Sunday at 20:00 via Telegram.
MetricsLite: https://metricslite-ea58t3a9r-isaiahduprees-projects.vercel.app
ACTPDash: https://actpdash-1ktx5ctqk-isaiahduprees-projects.vercel.app
```

## Architecture

```
RevenueAnalyticsDomainAgent (revenue_agent.py)
    extends NativeToolAgent (PRD-111)
    tools (26):
        ├── get_stripe_mrr              — Stripe API: current MRR
        ├── get_stripe_new_customers    — Stripe API: new subs this month
        ├── get_stripe_churn            — Stripe API: churned this month
        ├── get_apple_revenue           — App Store Connect API
        ├── get_upwork_earnings         — actp_deal_log WHERE type=upwork closed
        ├── get_services_revenue        — actp_deal_log WHERE type=retainer closed
        ├── get_total_monthly_revenue   — aggregate all streams for current month
        ├── get_revenue_vs_target       — actual vs $9.5K target, gap amount
        ├── get_cumulative_revenue      — total all time vs $50K goal
        ├── get_youtube_analytics       — youtube_video_stats 25 rows summary
        ├── get_follower_counts         — actp_follower_snapshots latest per platform
        ├── get_follower_velocity       — actp_follower_snapshots daily gain
        ├── get_eta_to_1m               — compute ETA days at current daily gain
        ├── get_avg_views_per_video     — actp_post_checkbacks rolling 30-post avg
        ├── get_views_trend             — actp_post_checkbacks 30-day trend
        ├── get_ai_cost_today           — anthropic_cost_log: today's spend
        ├── get_ai_cost_month           — anthropic_cost_log: month-to-date
        ├── get_projected_ai_cost       — extrapolate daily avg to month end
        ├── get_content_volume_today    — actp_gen_jobs completed today
        ├── get_gate_quality_stats      — actp_gate_stats pass rate + avg score
        ├── get_top_performing_niches   — actp_niche_performance top by views
        ├── get_goal_gap_analysis       — compare all KPIs vs targets, identify top 3 gaps
        ├── create_goal_gap_task        — INSERT actp_agent_tasks for orchestrator to address gap
        ├── generate_weekly_report_md   — compile full markdown report
        ├── send_telegram_report        — POST to Telegram bot with report text
        └── save_weekly_snapshot        — INSERT into actp_weekly_snapshots
```

## Task

### Tool Implementations
1. `tool_get_stripe_mrr()` — Stripe API list subscriptions, sum MRR: `/v1/subscriptions?status=active`
2. `tool_get_stripe_new_customers(month)` — Stripe API customers created this month
3. `tool_get_stripe_churn(month)` — Stripe API canceled subscriptions this month
4. `tool_get_apple_revenue(month)` — App Store Connect API: sales_reports endpoint for monthly revenue
5. `tool_get_upwork_earnings(month)` — SELECT SUM(deal_value) FROM actp_deal_log WHERE type='upwork' AND month=X
6. `tool_get_services_revenue(month)` — SELECT SUM(deal_value) FROM actp_deal_log WHERE type='retainer' AND month=X
7. `tool_get_total_monthly_revenue(month)` — sum all 4 streams, return breakdown dict
8. `tool_get_revenue_vs_target(month)` — return {actual, target: 9500, gap, pct_of_target}
9. `tool_get_cumulative_revenue()` — SELECT SUM(deal_value) FROM actp_deal_log all time vs $50K
10. `tool_get_youtube_analytics(days=30)` — SELECT from youtube_video_stats: avg views, avg watch time, top videos
11. `tool_get_follower_counts()` — SELECT platform, follower_count FROM actp_follower_snapshots latest
12. `tool_get_follower_velocity(platform, days=7)` — avg daily gain from actp_follower_snapshots
13. `tool_get_eta_to_1m(platform)` — (1000000 - current_followers) / avg_daily_gain = days
14. `tool_get_avg_views_per_video(platform, last_n=30)` — avg from actp_post_checkbacks
15. `tool_get_views_trend(platform, days=30)` — time series from actp_post_checkbacks daily avg
16. `tool_get_ai_cost_today()` — SELECT SUM(cost_usd) FROM anthropic_cost_log WHERE date=today
17. `tool_get_ai_cost_month()` — SELECT SUM(cost_usd) FROM anthropic_cost_log WHERE month=current
18. `tool_get_projected_ai_cost()` — (cost_month_to_date / days_elapsed) × days_in_month
19. `tool_get_content_volume_today()` — SELECT COUNT(*) FROM actp_gen_jobs WHERE status='complete' AND date=today
20. `tool_get_gate_quality_stats()` — SELECT from actp_gate_stats: today's pass rate, avg score, trend
21. `tool_get_top_performing_niches(days=7, limit=5)` — SELECT from actp_niche_performance top by avg views
22. `tool_get_goal_gap_analysis()` — compute all KPIs vs targets, return list of gaps sorted by severity
23. `tool_create_goal_gap_task(gap_type, description, priority)` — INSERT actp_agent_tasks for orchestrator to address
24. `tool_generate_weekly_report_md()` — compile markdown with all platform cards, revenue, quality, niches
25. `tool_send_telegram_report(report_md)` — POST to Telegram bot using TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
26. `tool_save_weekly_snapshot(report_data)` — INSERT into actp_weekly_snapshots

### Anthropic Cost Tracking
27. `AnthropicCostTracker.record_call(model, input_tokens, output_tokens, cost_usd)` — log every API call
28. `AnthropicCostTracker.get_cost_by_model(month)` — breakdown by model: opus vs sonnet vs haiku
29. Migration: `anthropic_cost_log` — id, model, input_tokens, output_tokens, cost_usd, agent_id, called_at
30. Patch `NativeToolAgent._call_claude()` to record every Anthropic API call cost to DB

### App Store Connect Integration
31. `AppStoreConnectClient.get_monthly_sales(year, month)` — Apple Sales Report API
32. `AppStoreConnectClient.get_subscription_revenue(year, month)` — in-app subscription revenue
33. `AppStoreConnectClient.list_apps()` — all 21 Rork apps on App Store
34. Config: `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_PRIVATE_KEY_PATH` env vars

### Agent Orchestration
35. `RevenueAnalyticsDomainAgent.__init__()` — super().__init__() + register all 26 tools
36. `RevenueAnalyticsDomainAgent.get_system_prompt()` — domain prompt with targets, thresholds, ceiling
37. `RevenueAnalyticsDomainAgent.run_daily_check()` — preset goal: "Check all KPIs vs targets, identify top 3 gaps, create tasks for orchestrator to address each"
38. `RevenueAnalyticsDomainAgent.run_weekly_report()` — preset goal: "Generate comprehensive weekly report, send to Telegram, save snapshot"
39. `RevenueAnalyticsDomainAgent.run_cost_audit()` — preset goal: "Check AI cost projection, if > $350 identify which agent is most expensive, create cost reduction task"

### Self-Healing
40. If Stripe API unavailable: use cached last-known MRR, flag as stale in report
41. If Telegram fails: save report to actp_weekly_snapshots, retry next hour
42. If AI cost projects > $400: immediately create high-priority task for orchestrator to throttle agent runs

### Cron Integration
43. APScheduler: `run_daily_check()` daily at 08:00 (after 06:00 content generation)
44. APScheduler: `run_weekly_report()` weekly Sunday at 20:00
45. APScheduler: `run_cost_audit()` daily at 23:00

### Supabase Tables
46. Migration: `actp_weekly_snapshots` — id, week_start, report_md text, revenue_total, follower_youtube, follower_tiktok, follower_instagram, follower_twitter, follower_threads, avg_views_per_video, gate_pass_rate, ai_cost_usd, created_at
47. Seed `actp_weekly_snapshots` with baseline: YouTube 2810 subs, all others 0, revenue $0

### Health Routes
48. `GET /api/agents/revenue/status` — current MRR, target, gap, AI cost this month, projected
49. `GET /api/agents/revenue/kpis` — all KPIs vs targets in one response
50. `GET /api/agents/revenue/report/latest` — latest weekly snapshot markdown
51. `POST /api/agents/revenue/report/send` — manually trigger weekly report

### Tests
52. `test_revenue_gap_analysis_identifies_top_3()` — seed partial data, verify 3 gaps returned sorted by severity
53. `test_projected_ai_cost_alerts_at_350()` — seed $300 in 20 days, verify alert task created
54. `test_eta_to_1m_youtube_calculation()` — 2810 followers, 100/day gain → verify ETA = (1000000-2810)/100 days
55. `test_weekly_report_contains_all_5_platforms()` — verify report markdown has TikTok/IG/YT/Twitter/Threads sections
56. `test_cost_tracker_patches_claude_calls()` — verify every _call_claude() inserts to anthropic_cost_log
57. `test_goal_gap_creates_orchestrator_task()` — verify actp_agent_tasks row inserted for gap

## Key Files
- `revenue_agent.py` (new)
- `native_tool_agent.py` (from PRD-111)
- `app_store_connect_client.py` (new — Apple ASC API)
- `anthropic_cost_tracker.py` (new — patch base class)
- `worker.py` — start RevenueAnalyticsDomainAgent daemon

## Environment Variables
- `ENABLE_REVENUE_AGENT=true`
- `STRIPE_SECRET_KEY` (existing)
- `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_PRIVATE_KEY_PATH`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `METRICSLITE_URL=https://metricslite-ea58t3a9r-isaiahduprees-projects.vercel.app`
