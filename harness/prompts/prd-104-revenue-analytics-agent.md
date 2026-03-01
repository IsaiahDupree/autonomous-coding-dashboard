# PRD-104: Revenue & Analytics Agent

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-104-features.json
- **Priority**: P0 (CRITICAL — tracks + optimizes toward all revenue goals)

## Context

The Revenue & Analytics Agent is the measurement and optimization brain of the autonomous business machine. It continuously pulls revenue data from Stripe and Apple App Store, tracks audience metrics across all 5 platforms, monitors AI cost spend, and feeds actionable signals back to the Cognitive Orchestrator. It also generates daily/weekly business reports and fires alerts when any goal is falling behind pace.

Revenue targets:
- Month 1: $9,500 (EverReach $2K + Upwork $4K + Services $2K + SaaS $1.5K)
- Month 2: $19,000
- Month 3: $26,000 → cumulative $54,500 (hits $50K goal)

Audience targets:
- 1,000,000 followers per platform (TikTok, IG, YouTube, Twitter/X, Threads)
- 100,000+ average views per video

Efficiency:
- AI costs ≤ $400/month (8% cost ratio on $5K revenue)

## Architecture

```
RevenueAnalyticsAgent (revenue_analytics_agent.py)
      ├── StripeTracker       — MRR, new subs, churn, LTV
      ├── AppleTracker        — App Store downloads, revenue, reviews
      ├── AudienceTracker     — followers, views, engagement per platform
      ├── CostMonitor         — AI API spend, batch efficiency tracking
      ├── GoalProgressEngine  — % toward each business goal
      └── ReportGenerator     — daily/weekly reports, Telegram alerts
```

## Task

### Core Module: `revenue_analytics_agent.py`
1. `RevenueAnalyticsAgent.__init__()` — init with Stripe, Apple, Supabase clients
2. `RevenueAnalyticsAgent.run_analytics_cycle()` — pull all metrics, update Supabase, check goals
3. `RevenueAnalyticsAgent.run_as_daemon()` — asyncio loop every 1 hour
4. `RevenueAnalyticsAgent.get_dashboard_snapshot()` — single dict: all key metrics + goal %

### Stripe Tracker
5. `StripeTracker.get_mrr()` — query Stripe subscriptions API, compute MRR
6. `StripeTracker.get_new_subscriptions(since)` — new subs in timeframe
7. `StripeTracker.get_churn(since)` — cancelled subs in timeframe
8. `StripeTracker.get_revenue_by_product()` — breakdown: EverReach vs. ClientPortal
9. `StripeTracker.get_ltv_estimate(product_id)` — avg lifetime value per product
10. `StripeTracker.sync_to_supabase(metrics)` — upsert into actp_revenue_metrics
11. `StripeTracker.project_month_end(current_day, current_revenue)` — linear projection
12. `StripeTracker.alert_if_below_pace(target, current_projected)` — fire alert to orchestrator

### Apple Tracker
13. `AppleTracker.get_app_store_sales(app_id, since)` — App Store Connect API sales report
14. `AppleTracker.get_downloads_by_app()` — breakdown per app (21 Rork apps)
15. `AppleTracker.get_reviews(app_id, min_rating)` — fetch recent reviews for quality signal
16. `AppleTracker.get_revenue(app_id, period)` — IAP + subscription revenue
17. `AppleTracker.sync_to_supabase(metrics)` — upsert into actp_app_store_metrics
18. `AppleTracker.get_top_performing_apps()` — rank apps by revenue + downloads

### Audience Tracker
19. `AudienceTracker.get_followers(platform)` — query latest from actp_platform_metrics
20. `AudienceTracker.get_views_avg(platform, last_n_posts=30)` — rolling avg views
21. `AudienceTracker.get_follower_growth_rate(platform, days=7)` — weekly growth rate
22. `AudienceTracker.compute_days_to_1m(platform)` — ETA to 1M at current rate
23. `AudienceTracker.get_top_posts(platform, metric='views', limit=10)` — best performing content
24. `AudienceTracker.sync_platform_metrics(platform, data)` — store to Supabase
25. `AudienceTracker.get_cross_platform_summary()` — total followers, total views today

### Cost Monitor
26. `CostMonitor.get_ai_spend_this_month()` — sum token costs from actp_ai_cost_log
27. `CostMonitor.get_cost_by_agent(since)` — breakdown: which agent spends most
28. `CostMonitor.get_cost_ratio(revenue, ai_spend)` — AI cost as % of revenue
29. `CostMonitor.alert_if_over_budget(spend, ceiling=400)` — alert if >$400/month
30. `CostMonitor.get_batch_efficiency(agent_id)` — avg pieces generated per API call
31. `CostMonitor.log_api_call(agent_id, model, input_tokens, output_tokens, cost)` — record every call
32. `CostMonitor.get_efficiency_recommendations()` — which agents should batch more

### Goal Progress Engine
33. `GoalProgressEngine.compute_all()` — returns dict of goal_key → pct_complete
34. `GoalProgressEngine.get_revenue_progress()` — current MRR / target MRR %
35. `GoalProgressEngine.get_audience_progress(platform)` — current followers / 1M %
36. `GoalProgressEngine.get_content_progress()` — avg views vs 100K target %
37. `GoalProgressEngine.get_efficiency_progress()` — AI cost vs $400 ceiling %
38. `GoalProgressEngine.get_critical_gaps()` — goals with progress < 25%, sorted by urgency
39. `GoalProgressEngine.recommend_actions(gaps)` — actionable next steps per gap
40. `GoalProgressEngine.get_weekly_velocity()` — goal progress delta last 7 days

### Report Generator
41. `ReportGenerator.generate_daily_report()` — markdown report: revenue, audience, content, costs
42. `ReportGenerator.generate_weekly_report()` — trend analysis, wins, losses, recommendations
43. `ReportGenerator.send_telegram_report(report_md)` — post to Telegram via bot
44. `ReportGenerator.format_goal_card(goal_key)` — single-goal progress card with emoji
45. `ReportGenerator.generate_alert(alert_type, data)` — concise alert message

### Supabase Tables
46. Create migration `actp_revenue_metrics` — id, source(stripe/apple/upwork), product, amount, metric_type, period, recorded_at
47. Create migration `actp_app_store_metrics` — id, app_id, app_name, downloads, revenue, avg_rating, period, recorded_at
48. Create migration `actp_platform_metrics` — id, platform, followers, views_today, avg_views_30d, growth_rate, recorded_at
49. Create migration `actp_ai_cost_log` — id, agent_id, model, input_tokens, output_tokens, cost_usd, called_at
50. Seed current known metrics: 520 CRM contacts, 26.3M views solopreneur niche, Julian Goldie = Decision stage

### Health Server Routes
51. `GET /api/analytics/dashboard` — all metrics + goal progress in one call
52. `GET /api/analytics/revenue` — MRR, projections, goal %
53. `GET /api/analytics/audience` — followers per platform, ETA to 1M
54. `GET /api/analytics/costs` — AI spend, cost ratio, efficiency
55. `GET /api/analytics/report/daily` — generate + return daily report
56. `POST /api/analytics/report/send` — send daily report to Telegram

### Testing
57. `test_stripe_mrr_computation()` — mock Stripe subscriptions, verify MRR calc
58. `test_audience_days_to_1m()` — verify projection math
59. `test_cost_monitor_alert_fires()` — mock spend >$400, verify alert
60. `test_goal_progress_engine_all_goals()` — verify all goal keys return 0.0–1.0

## Key Files
- `revenue_analytics_agent.py` (new)
- `stripe_tracker.py` (new — Stripe API wrapper)
- `apple_tracker.py` (new — App Store Connect API wrapper)
- `audience_tracker.py` (new — platform metrics aggregator)
- `cost_monitor.py` (new — AI spend tracker)
- `health_server.py` (add /api/analytics routes)
- `worker.py` (boot analytics daemon)

## Environment Variables Required
- `STRIPE_SECRET_KEY` — Stripe API key
- `APPLE_APP_STORE_KEY_ID` — App Store Connect key
- `APPLE_ISSUER_ID` — App Store Connect issuer
- `APPLE_PRIVATE_KEY_PATH` — path to .p8 key file
- `TELEGRAM_BOT_TOKEN` — for report delivery (existing)
