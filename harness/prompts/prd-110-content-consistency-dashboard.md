# PRD-110: Content Consistency Dashboard

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-110-features.json
- **Priority**: P2 (MEDIUM — visibility into views/video trend over time)

## Context

There is no dashboard or persistent tracking showing views/video trend over time, follower growth velocity, or content consistency. Without this visibility it is impossible to know if the 100K views/video target is improving, plateauing, or declining.

This PRD builds a lightweight data layer and API that powers:
- Rolling average views per post per platform
- Follower growth velocity (gain/day) per platform
- Post consistency score (posts/day vs. target)
- Hook score trend over time (quality improving?)
- Niche performance ranking (which niches drive most views)
- Weekly summary report (sent via Telegram)

## Architecture

```
ConsistencyDashboard (consistency_dashboard.py)
      ├── ViewsTrendTracker    — rolling avg views per post over time
      ├── FollowerVelocity     — daily follower gain × ETA to 1M
      ├── ConsistencyScore     — posts/day vs. 2-3 target
      ├── QualityTrendTracker  — hook scores over time
      └── NichePerformance     — views by niche, winning topics
```

## Task

### Views Trend Tracker
1. `ViewsTrendTracker.record_post_metrics(post_id, platform, views, likes, comments, shares, recorded_at)` — upsert into actp_post_metrics
2. `ViewsTrendTracker.get_rolling_avg_views(platform, last_n_posts=30)` — avg views for last 30 posts on platform
3. `ViewsTrendTracker.get_views_trend(platform, days=30)` — daily avg views as time series list
4. `ViewsTrendTracker.get_top_posts(platform, limit=10, metric='views')` — best performing posts
5. `ViewsTrendTracker.is_improving(platform, window=7)` — bool: last 7-day avg > prior 7-day avg
6. `ViewsTrendTracker.pct_of_target(platform, target=100000)` — current rolling avg / 100K target

### Follower Velocity
7. `FollowerVelocity.record_snapshot(platform, follower_count)` — upsert into actp_follower_snapshots
8. `FollowerVelocity.get_daily_gain(platform, date)` — follower delta vs. previous day
9. `FollowerVelocity.get_7day_avg_gain(platform)` — avg daily gain over last 7 days
10. `FollowerVelocity.compute_eta_to_1m(platform)` — days to 1M at current 7-day avg gain
11. `FollowerVelocity.get_velocity_trend(platform, days=30)` — daily gain as time series list
12. `FollowerVelocity.get_all_platforms_summary()` — dict: platform → {followers, daily_gain, eta_days}

### Consistency Score
13. `ConsistencyScore.get_posts_today(platform)` — count published posts today per platform
14. `ConsistencyScore.get_posts_per_day(platform, days=7)` — daily post count for last 7 days
15. `ConsistencyScore.compute_score(platform, target_per_day=2.5)` — actual/target ratio, 0.0-1.0
16. `ConsistencyScore.get_all_platforms_score()` — dict: platform → consistency score
17. `ConsistencyScore.is_consistent(platform, threshold=0.8)` — True if score >= 80% of target
18. `ConsistencyScore.get_missed_days(platform, days=7)` — days with 0 posts

### Quality Trend Tracker
19. `QualityTrendTracker.record_hook_score(piece_id, platform, niche, score, passed_gate, published_at)` — insert into actp_quality_trend
20. `QualityTrendTracker.get_avg_score_by_week(niche)` — weekly avg hook score time series
21. `QualityTrendTracker.get_pass_rate_trend(days=30)` — daily gate pass rate as time series
22. `QualityTrendTracker.is_quality_improving(window=7)` — bool: last 7-day avg score > prior 7-day avg
23. `QualityTrendTracker.get_best_performing_hooks(limit=10)` — top-scoring published pieces

### Niche Performance
24. `NichePerformance.record_niche_views(post_id, niche, platform, views, published_at)` — upsert into actp_niche_performance
25. `NichePerformance.get_top_niches(platform, days=30, limit=5)` — niches ranked by avg views
26. `NichePerformance.get_niche_trend(niche, platform, days=30)` — weekly views for niche
27. `NichePerformance.get_winning_format_per_niche(niche)` — format (short/story/list) with highest avg views
28. `NichePerformance.recommend_niches_for_next_batch()` — top 3 niches for next content cycle

### Weekly Report
29. `WeeklyReporter.generate_report()` — compile all metrics into markdown report string
30. `WeeklyReporter.format_platform_card(platform)` — followers, daily gain, ETA to 1M, avg views, consistency score
31. `WeeklyReporter.format_top_niches()` — top 3 niches by views this week
32. `WeeklyReporter.format_quality_summary()` — gate pass rate, avg hook score, trending direction
33. `WeeklyReporter.send_telegram(report_md)` — post to Telegram bot (existing telegram_bot integration)
34. `WeeklyReporter.schedule_weekly(day='sunday', hour=20)` — APScheduler: fire weekly summary every Sunday 20:00

### Supabase Tables
35. Migration `actp_post_metrics` — post_id FK, platform, views, likes, comments, shares, recorded_at (dedup on post_id, platform, recorded_at)
36. Migration `actp_follower_snapshots` — platform, follower_count, snapshot_date (dedup on platform, snapshot_date)
37. Migration `actp_quality_trend` — piece_id, platform, niche, score, passed_gate, published_at
38. Migration `actp_niche_performance` — post_id FK, niche, platform, views, published_at
39. Seed follower baseline: YouTube 2810, all others 0 as of 2026-03-01
40. Seed YouTube video stats: pull from youtube_video_stats 25 rows already in DB

### Health Server Routes
41. `GET /api/dashboard/summary` — all platforms: followers, daily gain, ETA, avg views, consistency score
42. `GET /api/dashboard/views-trend/:platform` — 30-day rolling avg views time series
43. `GET /api/dashboard/follower-trend/:platform` — 30-day daily follower gain time series
44. `GET /api/dashboard/niches` — top niches ranked by avg views
45. `GET /api/dashboard/quality` — gate pass rate trend, avg hook score trend
46. `POST /api/dashboard/report/send` — send weekly summary to Telegram

### Tests
47. `test_views_trend_rolling_avg()` — seed 30 posts with known views, verify avg
48. `test_follower_velocity_eta()` — 100 followers/day from 2810, verify ETA = (1000000-2810)/100 days
49. `test_consistency_score_perfect()` — 3 posts/day × 7 days, target 2.5, verify score=1.0 (capped)
50. `test_niche_performance_ranking()` — seed 3 niches, verify top niche returned correctly
51. `test_weekly_report_generates()` — verify report contains all 5 platform cards

## Key Files
- `consistency_dashboard.py` (new)
- `worker.py` (add follower snapshot collection loop + weekly report schedule)
- `health_server.py` (add /api/dashboard routes)

## Testing
```bash
python3 consistency_dashboard.py --summary
python3 consistency_dashboard.py --report  # generate + print weekly report
python3 -m pytest tests/test_consistency_dashboard.py -v
```
