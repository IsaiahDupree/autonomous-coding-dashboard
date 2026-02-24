---
description: Run the autonomous revenue machine - research, generate, publish, optimize content for $5K+/month
---

# Autonomous Revenue Machine Workflow

## Prerequisites
- OpenClaw gateway running: `openclaw gateway status`
- ACTP Worker running on port 9090
- ACD Backend running on port 3434

## Steps

1. Verify all services are up
```bash
curl -s http://localhost:9090/api/services/system/full_status -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{}' | python3 -m json.tool | head -50
```

2. Check revenue dashboard
```bash
curl -s http://localhost:9090/api/services/system/daily_revenue -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"days": 30}' | python3 -m json.tool
```

3. Run research (check cache first to save credits)
```bash
# Check cached results first
curl -s http://localhost:9090/api/services/research/list_results -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"platform": "twitter", "niche": "ai_automation", "limit": 10}' | python3 -m json.tool

# Only if cache is stale (>24h), run fresh research
curl -s http://localhost:9090/api/services/research/twitter -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"niches": ["ai_automation", "saas_growth", "content_creation"]}' | python3 -m json.tool
```

4. Generate content from strategy
```bash
# Get winning strategy
curl -s http://localhost:9090/api/services/twitter/strategy -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"niche": "ai_automation"}' | python3 -m json.tool

# Generate tweets
curl -s http://localhost:9090/api/services/twitter/generate -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"niche": "ai_automation"}' | python3 -m json.tool
```

5. Publish content
```bash
curl -s http://localhost:9090/api/services/publish/auto -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"platforms": ["twitter", "threads"], "text": "GENERATED_CONTENT"}' | python3 -m json.tool
```

6. Run outreach
```bash
# LinkedIn prospecting
curl -s http://localhost:9090/api/services/linkedin/prospect -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"keywords": "SaaS founder", "limit": 50}' | python3 -m json.tool

# Upwork job scan
curl -s http://localhost:9090/api/services/upwork/scan -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{}' | python3 -m json.tool
```

7. Check feedback and optimize
```bash
curl -s http://localhost:9090/api/services/feedback/checkbacks -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{}' | python3 -m json.tool

curl -s http://localhost:9090/api/services/feedback/analysis -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{}' | python3 -m json.tool
```

8. Delegate coding tasks to ACD if needed
```bash
curl -s http://localhost:9090/api/services/system/delegate_to_acd -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"project": "PROJECT_ID", "task": "TASK_DESCRIPTION", "project_path": "/path/to/project"}' | python3 -m json.tool
```

9. Check pending approvals
```bash
curl -s http://localhost:9090/api/services/system/pending_approvals -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{}' | python3 -m json.tool
```

10. End of day: write learnings to memory
```bash
curl -s http://localhost:9090/api/services/memory/write_daily -H "Authorization: Bearer $WORKER_SECRET" -X POST -H "Content-Type: application/json" -d '{"content": "Day results: ..."}' | python3 -m json.tool
```
