# PRD-112: Safari Social Media Domain Agent (Native Tool Calling)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-112-features.json
- **Depends On**: PRD-111 (NativeToolAgent base class must exist)
- **Priority**: P0 — this agent drives audience growth toward 1M followers

## Context

This agent is a domain specialist in social media growth. It extends `NativeToolAgent` (PRD-111) and is given a curated set of tools mapping to all 12 Safari Automation ports. Claude (the LLM) decides autonomously which tools to call to achieve goals like "Grow TikTok followers by finding and engaging with 50 solopreneur creators today" or "Post the 11 pending Remotion videos across all 5 platforms."

The agent knows:
- Platform-specific rules: TikTok rate limits, IG DM restrictions, LinkedIn 10 req/day
- ICP: solopreneur/content-creator niche, 1K–100K follower range
- Content performance data from actp_content_performance (218 rows, 26.3M views in solopreneur niche)
- Safari Automation service ports and correct endpoint formats

## Domain System Prompt

Inject into Claude's system prompt:
```
You are a social media growth specialist for EverReach OS. Your goal is to grow audience
to 1M followers on TikTok, Instagram, YouTube, Twitter, and Threads by:
1. Researching high-performing content in the solopreneur/content-creation niche
2. Posting videos to all 5 platforms (TikTok/IG/YouTube/Twitter/Threads)
3. Commenting on top creator posts within 30min of publish to seed engagement
4. DMing qualified prospects (ICP: solopreneur/founder/creator, 1K-100K followers)
5. Replying to incoming comments/DMs within 30min to boost algorithm signals

Rate limit rules (hard constraints, never exceed):
- LinkedIn: max 10 connection requests/day (use dry_run=true to preview)
- TikTok DM: inbox-search strategy first, profile-fallback second
- Instagram comments: max 20/hour
- Twitter: avoid composeTweet (known failure); use reply to existing posts only

Platform ports:
- Instagram DM: localhost:3001, Comments: localhost:3005
- TikTok DM: localhost:3002, Comments: localhost:3006
- Twitter DM: localhost:3003, Comments: localhost:3007
- Threads Comments: localhost:3004
- LinkedIn: localhost:3105
- Market Research: localhost:3106

Always call research_niche first to identify top posts, then comment/engage.
```

## Architecture

```
SocialMediaDomainAgent (social_media_agent.py)
    extends NativeToolAgent (PRD-111)
    tools (20):
        ├── research_niche          — Market Research port 3106
        ├── get_top_posts           — Market Research port 3106
        ├── get_top_creators        — Market Research port 3106
        ├── post_instagram_comment  — IG Comments port 3005
        ├── post_tiktok_comment     — TikTok Comments port 3006
        ├── post_twitter_reply      — Twitter Comments port 3007
        ├── post_threads_comment    — Threads Comments port 3004
        ├── send_instagram_dm       — Instagram DM port 3001
        ├── send_tiktok_dm          — TikTok DM port 3002
        ├── send_twitter_dm         — Twitter DM port 3003
        ├── linkedin_search         — LinkedIn port 3105
        ├── linkedin_connect        — LinkedIn port 3105
        ├── linkedin_message        — LinkedIn port 3105
        ├── get_follower_counts     — actp_follower_snapshots
        ├── get_engagement_stats    — actp_post_checkbacks
        ├── get_crm_contacts        — crm_contacts Supabase
        ├── score_crm_contact       — dm_outreach_client.py
        ├── queue_outreach          — dm_outreach_client.py
        ├── get_pending_posts       — actp_published_content WHERE first_comment_posted=False
        └── mark_comment_posted     — update actp_published_content
```

## Task

### Tool Implementations
1. `tool_research_niche(niche, platform, max_results=10)` — POST localhost:3106/api/research/{platform}/search body={keyword:niche, maxResults}
2. `tool_get_top_posts(niche, platform)` — return top posts from actp_content_performance for niche+platform
3. `tool_get_top_creators(niche, platform)` — competitor_research via market research port 3106
4. `tool_post_instagram_comment(post_url, comment_text)` — POST localhost:3005/api/instagram/comments/post
5. `tool_post_tiktok_comment(post_url, comment_text)` — POST localhost:3006/api/tiktok/comments/post (direct /video/ URL required)
6. `tool_post_twitter_reply(post_url, comment_text)` — POST localhost:3007/api/twitter/comments/post
7. `tool_post_threads_comment(post_url, comment_text)` — POST localhost:3004/api/threads/comments/post
8. `tool_send_instagram_dm(username, message)` — POST localhost:3001/api/dm/send body={username, message}
9. `tool_send_tiktok_dm(username, message)` — POST localhost:3002/api/dm/send (inbox-search strategy)
10. `tool_send_twitter_dm(username, message)` — POST localhost:3003/api/dm/send
11. `tool_linkedin_search(query, limit=10)` — POST localhost:3105/api/linkedin/search
12. `tool_linkedin_connect(profile_url, note, dry_run=True)` — POST localhost:3105/api/linkedin/connect (default dry_run)
13. `tool_linkedin_message(profile_url, message)` — POST localhost:3105/api/linkedin/message
14. `tool_get_follower_counts()` — SELECT platform, follower_count FROM actp_follower_snapshots, latest per platform
15. `tool_get_engagement_stats(post_id)` — SELECT from actp_post_checkbacks for post_id
16. `tool_get_crm_contacts(platform, limit=20)` — SELECT from crm_contacts WHERE platform=X
17. `tool_score_crm_contact(contact_id)` — call dm_outreach_client score_contact
18. `tool_queue_outreach(contact_id, platform, message)` — queue in crm_message_queue
19. `tool_get_pending_posts()` — SELECT from actp_published_content WHERE first_comment_posted=False AND published_at > now()-2h
20. `tool_mark_comment_posted(post_id)` — UPDATE actp_published_content SET first_comment_posted=True

### Tool Schemas (Anthropic format)
21. Write complete JSON input_schema for all 20 tools with type, properties, required fields
22. Annotate each schema with detailed description so Claude understands when to call it

### Agent Orchestration
23. `SocialMediaDomainAgent.__init__()` — call super().__init__() + register all 20 tools
24. `SocialMediaDomainAgent.get_system_prompt()` — return the domain system prompt (platform rules, ports, ICP)
25. `SocialMediaDomainAgent.run_growth_session(goal)` — call self.run(goal), log outcome
26. `SocialMediaDomainAgent.run_engagement_boost()` — preset goal: "Post first comment on all pending videos"
27. `SocialMediaDomainAgent.run_prospect_session()` — preset goal: "Find and queue 10 ICP prospects on LinkedIn and TikTok"
28. `SocialMediaDomainAgent.run_niche_research()` — preset goal: "Research solopreneur niche, find top 5 posts to comment on"

### Self-Healing Specifics
29. Detect if Safari port is down (connection refused) → tool returns `{"error": "service_unavailable"}` → Claude skips to next platform
30. Rate limit detection: if tool returns HTTP 429 → agent pauses that platform for 60min via SelfHealingMixin
31. `health_check_safari_ports()` — check all 12 ports, return dict: port → up/down
32. Register health_check_safari_ports as a tool so Claude can call it when unsure if services are running

### Cron Integration
33. APScheduler: `run_engagement_boost()` every 15min (check for new posts needing first comment)
34. APScheduler: `run_niche_research()` every 4hr
35. APScheduler: `run_prospect_session()` daily at 11:00 and 15:00 (match LinkedIn active hours)

### Supabase Logging
36. All tool calls logged to actp_tool_call_log (from PRD-111 framework)
37. `log_engagement_action(platform, action, target, result)` — insert into actp_engagement_actions
38. Migration: `actp_engagement_actions` — id, platform, action_type, target_url, target_handle, result jsonb, agent_run_id FK, created_at

### Health Routes
39. `GET /api/agents/social-media/status` — agent health, last run, error count, safari port status
40. `GET /api/agents/social-media/engagement` — recent engagement actions, comment success rate per platform
41. `POST /api/agents/social-media/run` — manually trigger a goal for this agent

### Tests
42. `test_tool_research_niche_calls_market_research()` — mock port 3106, verify correct endpoint + payload
43. `test_tool_post_instagram_comment_correct_endpoint()` — verify /api/instagram/comments/post (not /api/comments/post)
44. `test_tool_linkedin_connect_dry_run_default()` — verify dry_run=True unless explicitly set False
45. `test_agent_skips_down_ports()` — mock port returning connection refused, verify Claude continues to next tool
46. `test_engagement_boost_preset_goal()` — seed 2 pending posts, verify mark_comment_posted called for both
47. `test_tool_schemas_valid_json()` — verify all 20 tool schemas are valid Anthropic format

## Key Files
- `social_media_agent.py` (new)
- `native_tool_agent.py` (from PRD-111)
- `worker.py` — start SocialMediaDomainAgent daemon

## Environment Variables
- All Safari port URLs read from env (SAFARI_INSTAGRAM_DM_URL=http://localhost:3001, etc.)
- `ENABLE_SOCIAL_MEDIA_AGENT=true` flag to activate
