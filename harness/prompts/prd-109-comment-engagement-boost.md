# PRD-109: Comment Engagement Boost (First-30-Min Algorithm Signal)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-109-features.json
- **Priority**: P1 (HIGH — first 30min engagement is the primary algorithm ranking signal)

## Context

Every social platform algorithm (TikTok, Instagram, YouTube, Threads) uses early engagement as its primary signal for content distribution. A post that gets comments, likes, and replies within the first 30 minutes gets pushed to a wider audience. Without this signal, even great content stagnates.

This agent:
1. Monitors newly published posts and tracks their "boost window" (0–30min after publish)
2. Posts a strategically crafted first comment to seed engagement
3. Replies to early comments with AI-generated responses to keep thread active
4. Tracks 1hr/4hr/24hr checkback metrics and feeds results to the viral feedback loop

Uses existing Safari comment automation services (ports 3004–3007, 3005).

## Architecture

```
CommentEngagementBooster (comment_engagement_booster.py)
      ├── PostMonitor        — detect newly published posts in boost window
      ├── FirstCommentEngine — generate + post first comment per platform
      ├── ReplyEngine        — AI-generated replies to incoming comments
      └── EngagementTracker  — 1hr/4hr/24hr metric checkbacks → viral loop
```

## Task

### Post Monitor
1. `PostMonitor.get_posts_in_boost_window()` — query actp_published_content WHERE published_at >= now()-30min AND first_comment_posted=False
2. `PostMonitor.get_posts_needing_checkback(interval)` — query posts needing 1hr/4hr/24hr checkback
3. `PostMonitor.mark_boost_window_closed(post_id)` — set boost_window_closed=True after 30min
4. `PostMonitor.get_post_url(post_id, platform)` — retrieve live post URL from actp_adapted_payloads
5. `PostMonitor.run_monitor_loop(interval=60)` — asyncio loop: check every 60s for new posts

### First Comment Engine
6. `FirstCommentEngine.generate_first_comment(script, platform, niche)` — Claude Haiku: engaging question or CTA to seed replies
7. `FirstCommentEngine.build_prompt(script, platform)` — "Write a first comment that asks a question to get replies. Platform: {platform}. Hook: {script}"
8. `FirstCommentEngine.post_to_tiktok(post_url, comment)` — POST to Safari TikTok comments API port 3006
9. `FirstCommentEngine.post_to_instagram(post_url, comment)` — POST to Safari IG comments API port 3005
10. `FirstCommentEngine.post_to_youtube(post_url, comment)` — POST to Safari YouTube API (port 3007 extended or direct API)
11. `FirstCommentEngine.post_to_twitter(post_url, comment)` — POST to Safari Twitter comments API port 3007
12. `FirstCommentEngine.post_to_threads(post_url, comment)` — POST to Safari Threads comments API port 3004
13. `FirstCommentEngine.post_first_comment(post_id, platform, post_url, script)` — orchestrate: generate → post → mark done
14. `FirstCommentEngine.post_all_platforms(post_id)` — post first comment on all 5 platforms for a job

### Reply Engine
15. `ReplyEngine.get_incoming_comments(post_url, platform)` — fetch comments via Safari API
16. `ReplyEngine.filter_unanswered(comments)` — comments that haven't been replied to yet
17. `ReplyEngine.generate_reply(comment_text, script, niche)` — Claude Haiku: short authentic reply that extends conversation
18. `ReplyEngine.post_reply(post_url, comment_id, reply_text, platform)` — Safari comment reply endpoint
19. `ReplyEngine.run_reply_cycle(post_id, platform)` — get comments → filter → generate → reply (max 5 replies per cycle)
20. `ReplyEngine.avoid_spam(comment_id)` — track replied comment_ids to avoid double-reply

### Engagement Tracker
21. `EngagementTracker.get_metrics(post_url, platform)` — fetch views, likes, comments, shares from analytics
22. `EngagementTracker.get_tiktok_metrics(post_url)` — TikTok analytics API or Safari scrape
23. `EngagementTracker.get_instagram_metrics(post_url)` — IG API or Safari scrape
24. `EngagementTracker.get_youtube_metrics(video_id)` — YouTube Analytics API via youtube_client.py
25. `EngagementTracker.run_checkback(post_id, interval_label)` — fetch metrics, store in actp_post_checkbacks
26. `EngagementTracker.classify_performance(views_at_24hr)` — viral>100K / strong>10K / average>1K / weak>100 / flop<=100
27. `EngagementTracker.feed_to_viral_loop(post_id, classification, metrics)` — store in actp_feedback_posts for CGA PRD-102

### Supabase Tables
28. Migration: add `first_comment_posted` boolean, `boost_window_closed` boolean, `boost_comment_text` to `actp_published_content`
29. Migration `actp_post_checkbacks` — post_id FK, platform, interval_label (1hr/4hr/24hr), views, likes, comments, shares, checked_at
30. Migration `actp_feedback_posts` — post_id FK, platform, classification, views_24hr, hook_score, niche, script_snippet, created_at
31. `get_checkback_history(post_id)` — all checkback records for a post
32. `get_viral_posts(niche, days=7)` — posts classified as viral in last 7 days

### Health Server Routes
33. `GET /api/engagement/status` — posts in boost window, checkbacks due, avg 24hr views
34. `GET /api/engagement/viral` — recent viral posts with metrics
35. `POST /api/engagement/boost/:post_id` — manually trigger boost for a post

### Tests
36. `test_first_comment_generates_question()` — verify generated comment ends with '?' or contains question
37. `test_post_monitor_finds_new_posts()` — seed post published 5min ago, verify in boost window
38. `test_engagement_tracker_classifies_viral()` — 150K views → verify classification='viral'
39. `test_reply_engine_avoids_double_reply()` — send 2 cycles, verify same comment_id not replied twice
40. `test_checkback_stores_metrics()` — run checkback, verify row in actp_post_checkbacks

## Key Files
- `comment_engagement_booster.py` (new)
- `worker.py` (add engagement boost loop + checkback loop)
- `health_server.py` (add /api/engagement routes)

## Testing
```bash
python3 comment_engagement_booster.py --boost-all  # boost all posts in window
python3 comment_engagement_booster.py --checkback  # run all due checkbacks
python3 -m pytest tests/test_comment_engagement_booster.py -v
```
