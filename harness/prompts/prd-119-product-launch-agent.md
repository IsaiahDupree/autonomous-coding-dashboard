# PRD-119: Product Launch Agent

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-119-features.json
- **Depends On**: PRD-111 (NativeToolAgent base), PRD-116 (Worker Daemon)
- **Priority**: P0 — handles 21 Rork app submissions + $3.5K/month SaaS revenue

## Context

The revenue targets require:
- **EverReach Pro** — Apple App Store, $19.99/mo → 100 users = $2K/month
- **ClientPortal** — Stripe, $49/mo → 30 users = $1.5K/month
- **21 Rork Expo apps** — submitted to Apple App Store across all categories

None of these are handled by existing agents. The Acquisition Agent (PRD-114) handles B2B outreach, but app store submissions, Stripe subscription management, and product user growth require a dedicated **Product Launch Agent** with deep knowledge of:
- App Store Connect API (TestFlight, metadata, review submission, phased release)
- Expo EAS Build + Submit (21 Rork apps CI/CD pipeline)
- Stripe API (subscription monitoring, upgrade campaigns, churn reduction)
- Product metrics (user counts, MRR per product, review scores)

This agent is the **revenue engine** for the SaaS + App Store vertical.

## Architecture

```
ProductLaunchAgent (extends NativeToolAgent, PRD-111)
    ├── AppStoreManager     — 26 tools for App Store Connect API
    ├── ExpoBuilder         — EAS build + submit for 21 Rork apps
    ├── StripeManager       — subscription monitoring + campaigns
    └── ProductMetrics      — user counts, MRR, review scores, churn

Tools registered: 28 total
System prompt: product growth specialist focused on $3.5K/month SaaS + App Store revenue
Preset goals: daily_product_check, submit_next_rork_app, run_stripe_campaign
Crons: daily 07:00, app submission queue check every 4hr, weekly Stripe review Sunday
```

## Task

### App Store Connect Tools (AppStoreConnectClient)
1. `tool_list_apps()` — GET /v1/apps, return all app records (name, bundleId, sku, appStoreVersions)
2. `tool_get_app_status(bundle_id)` — GET /v1/apps?filter[bundleId]=X, return {name, state, version, last_submission_date}
3. `tool_create_app_version(bundle_id, version, release_notes)` — POST /v1/appStoreVersions with NEW_VERSION_NOT_YET_SUBMITTED
4. `tool_submit_for_review(bundle_id, version)` — POST /v1/appStoreVersionSubmissions, triggers App Review
5. `tool_get_review_status(bundle_id)` — GET review status: WAITING_FOR_REVIEW / IN_REVIEW / APPROVED / REJECTED
6. `tool_upload_screenshot(bundle_id, screenshot_path, device, locale)` — POST screenshot set via App Store Connect API
7. `tool_set_app_metadata(bundle_id, name, subtitle, description, keywords, support_url)` — PATCH /v1/appInfoLocalizations
8. `tool_enable_phased_release(bundle_id, version)` — POST /v1/appStoreVersionPhasedReleases with ACTIVE
9. `tool_get_download_stats(bundle_id, days=30)` — GET Sales Reports API, return {downloads, proceeds, updates}
10. `tool_get_review_queue()` — SELECT from actp_app_submissions WHERE status NOT IN ('approved', 'rejected') ORDER BY submitted_at ASC

### Expo EAS Build Tools
11. `tool_trigger_eas_build(app_dir, platform='ios')` — subprocess: `eas build --platform ios --non-interactive`, return build_id
12. `tool_get_build_status(build_id)` — GET https://api.expo.dev/v2/builds/{build_id}, return status + artifact_url
13. `tool_submit_to_app_store(build_id, app_dir)` — subprocess: `eas submit --platform ios --id {build_id} --non-interactive`
14. `tool_get_pending_builds()` — SELECT from actp_app_submissions WHERE status='building' AND created_at > now()-4hr
15. `tool_get_rork_apps_queue()` — SELECT from actp_app_submissions WHERE status='queued' ORDER BY priority ASC LIMIT 5

### Stripe Tools
16. `tool_get_stripe_subscriptions(product_id)` — Stripe API /v1/subscriptions?price={price_id}&status=active, return count + MRR
17. `tool_get_subscription_breakdown()` — return {everreach_pro: {users, mrr}, client_portal: {users, mrr}, total_mrr}
18. `tool_get_churned_subscribers(days=30)` — Stripe /v1/subscriptions?status=canceled&canceled_at[gte]=X, return list
19. `tool_get_trial_conversions(days=30)` — subscriptions where trial_end < now() AND status=active, calc conversion rate
20. `tool_create_promo_coupon(percent_off, duration, code)` — Stripe POST /v1/coupons for upgrade campaign
21. `tool_get_upcoming_renewals(days=7)` — subscriptions with current_period_end < now()+7d (retention risk list)
22. `tool_get_payment_failures()` — Stripe /v1/charges?status=failed in last 7d, return {count, mrr_at_risk}

### Product Metrics Tools
23. `tool_get_product_goal_status()` — compare EverReach users vs 100 target, ClientPortal vs 30 target, return gap
24. `tool_get_app_store_ratings(bundle_id)` — GET /v1/apps/{id}/customerReviews, return avg rating + review count
25. `tool_save_product_snapshot(snapshot_data)` — INSERT into actp_product_snapshots daily state
26. `tool_get_rork_submission_progress()` — SELECT COUNT(*) by status FROM actp_app_submissions, return {queued, building, in_review, approved, rejected}
27. `tool_get_revenue_by_product(month)` — aggregate Stripe + App Store by product for month
28. `tool_flag_churn_risk(subscription_id, reason)` — INSERT into actp_churn_risks for acquisition agent to re-engage

### Agent Orchestration
29. `ProductLaunchAgent.__init__()` — super().__init__('product-agent', model, system_prompt) + register all 28 tools
30. `ProductLaunchAgent.get_system_prompt()` — product specialist: EverReach Pro pricing ($19.99), ClientPortal ($49), 21 Rork app slate, App Review rules (no spam keywords), Stripe best practices
31. `ProductLaunchAgent.run_daily_check()` — preset goal: 'Check EverReach Pro and ClientPortal user counts vs targets, flag churn risks, check any in-review apps for status updates'
32. `ProductLaunchAgent.submit_next_rork_app()` — preset goal: 'Get next queued Rork app, trigger EAS build, submit to App Store if build succeeds'
33. `ProductLaunchAgent.run_stripe_retention_campaign()` — preset goal: 'Find upcoming renewals + payment failures, create targeted retention coupon for at-risk subscribers'
34. `ProductLaunchAgent.run_weekly_product_review()` — preset goal: 'Full product metrics: all app stats, Stripe breakdown, goal gaps, create acquisition tasks for any product < 50% of user target'

### Self-Healing
35. EAS build failure handling: if build exits non-zero, log to actp_app_submissions status='build_failed', retry once after 1hr
36. App Review REJECTED handling: parse rejection reason, create HIGH priority task for AcquisitionDomainAgent to review metadata
37. Stripe API 401/403: log to actp_agent_runs with error detail, pause Stripe tools 30min, continue with App Store tools

### Cron Schedule
38. APScheduler: `run_daily_check()` daily at 07:00
39. APScheduler: `submit_next_rork_app()` every 4hr (checks queue, only acts if apps queued)
40. APScheduler: `run_stripe_retention_campaign()` weekly Monday 09:00
41. APScheduler: `run_weekly_product_review()` weekly Sunday 19:00

### Supabase Migrations
42. Migration: `actp_app_submissions` — id, bundle_id text, app_name text, app_dir text, eas_build_id text, status text (queued/building/build_failed/submitted/in_review/approved/rejected), priority int, submitted_at, review_result text, created_at
43. Migration: `actp_product_snapshots` — id, product text, snapshot_date date, user_count int, mrr numeric, churn_count int, new_subs int, avg_rating float, created_at
44. Migration: `actp_churn_risks` — id, subscription_id text, product text, reason text, contacted bool default false, agent_run_id FK, created_at
45. Seed: INSERT 21 Rork app rows into actp_app_submissions with status='queued', priority 1-21 (in order from repo-queue.json P26-P46)

### Health Routes
46. `GET /api/agents/product/status` — user counts vs targets, MRR per product, pending app submissions, in-review count
47. `GET /api/agents/product/apps` — all actp_app_submissions with status breakdown
48. `GET /api/agents/product/stripe` — subscription breakdown, churn risks, upcoming renewals
49. `POST /api/agents/product/submit-next` — manually trigger submit_next_rork_app()

### Tests
50. `test_get_subscription_breakdown_sums_correctly()` — mock Stripe returning 2 EverReach + 3 ClientPortal subs, verify MRR calculation
51. `test_submit_rork_app_fires_eas_build()` — mock actp_app_submissions with 1 queued app, verify eas build command called
52. `test_churn_risk_flagged_on_payment_failure()` — mock Stripe payment failure, verify actp_churn_risks row inserted
53. `test_review_rejected_creates_high_priority_task()` — mock App Store review = REJECTED, verify actp_agent_tasks row with priority=high
54. `test_daily_check_creates_gap_task_when_under_50pct()` — 10 EverReach users (10% of 100 target), verify acquisition task created

## Environment Variables
- `APPLE_KEY_ID` — App Store Connect API key ID
- `APPLE_ISSUER_ID` — App Store Connect issuer ID
- `APPLE_PRIVATE_KEY_PATH` — path to .p8 private key file
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_EVERREACH_PRICE_ID` — price ID for EverReach Pro $19.99/mo
- `STRIPE_CLIENTPORTAL_PRICE_ID` — price ID for ClientPortal $49/mo
- `EXPO_TOKEN` — EAS CLI authentication token
- `ENABLE_PRODUCT_AGENT=true`
