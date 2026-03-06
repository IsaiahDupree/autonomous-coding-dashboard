# Agent Prompt: Marketing Agent Module (PRD-072)

## Your mission
Add the `marketing_agent.py` module to the `company-orchestrator` repo. This module accepts marketing goals, researches the niche, generates AI content, posts via existing Safari automation services, tracks engagement, and updates the marketing knowledge base.

## Target repo
`/Users/isaiahdupree/Documents/Software/company-orchestrator`

Add files to the existing project. Do NOT recreate files already created by PRD-070/071.

## Files to create/modify
```
agents/marketing_agent.py      ← main module (NEW)
modules/content_generator.py   ← Claude tweet/caption generator + scorer (NEW)
modules/safari_poster.py       ← HTTP client for Safari automation ports (NEW)
modules/metrics_collector.py   ← engagement tracking + classifier (NEW)
knowledge/marketing-playbook.md ← evolving strategy doc (NEW, start with template)
tests/test_marketing_agent.py  ← pytest tests (NEW)
```

## Safari automation endpoints (already running)
```python
SAFARI_PORTS = {
    "twitter":   "http://localhost:3007",   # POST /api/twitter/comments/post
    "instagram": "http://localhost:3005",   # POST /api/instagram/comments/post
    "threads":   "http://localhost:3004",   # POST /api/threads/comments/post
    "research":  "http://localhost:3106",   # POST /api/research/{platform}/search
}
# Market research body: {"keyword": "...", "maxResults": 10}
# Comment/post body: {"postUrl": "...", "text": "..."}
```

## Supabase tables to create
- `company_competitors` (id, handle, platform, followers, created_at)
- `company_campaigns` (id, goal, platform, posts_count, reach, top_post, classification, created_at)
- `company_post_metrics` (id, post_url, platform, likes, views, replies, classification, checked_at)

## Rate limits to enforce
- Twitter: 10 posts/day
- Instagram: 3 posts/day
- Threads: 5 posts/day

## PRD
See: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-072-MARKETING-AGENT.md`

## Tests
`tests/test_marketing_agent.py`: test content scorer (mock Claude), rate limiter logic, campaign summary schema, hook extractor output shape. Run: `python -m pytest tests/test_marketing_agent.py -x -q`.
