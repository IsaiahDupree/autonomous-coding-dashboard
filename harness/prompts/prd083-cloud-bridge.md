# PRD-083: Cloud ↔ Local Request Bridge Agent

You are building a bridge daemon that lets cloud services (Vercel crons, Supabase webhooks) send commands to local Safari/Chrome browser automations and receive results.

## Context
Working dir: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
Supabase project: ivhfuhxorppptyuofbgq
Supabase URL: https://ivhfuhxorppptyuofbgq.supabase.co
Supabase service role key: in /Users/isaiahdupree/Documents/Software/actp-worker/.env as SUPABASE_SERVICE_ROLE_KEY
Safari services: ports 3003(TW), 3004(Threads), 3005(IG), 3006(TK), 3007(TW comments), 3100(IG DM), 3102(TK DM), 3105(LI)
Chrome CDP: http://localhost:9333 (for LinkedIn search via harness/linkedin-chrome-search.js)
Pattern: harness/linkedin-daemon.js for daemon structure, harness/rate-limit-coordinator.js for rate limiting

## Features to implement
Read harness/features/prd083-cloud-bridge.json for the full feature list.

## Supabase Migration (use mcp0_apply_migration or direct Supabase REST)
Create tables:
1. browser_command_queue: id(uuid pk), platform(text), action(text), params(jsonb), status(text default 'pending'), priority(int default 5), created_at(timestamptz default now()), claimed_at(timestamptz), completed_at(timestamptz)
2. browser_results: id(uuid pk), command_id(uuid references browser_command_queue), platform(text), action(text), result(jsonb), created_at(timestamptz default now())

## Bridge routing logic
```javascript
const ROUTES = {
  'instagram:search': (params) => fetch('http://localhost:3005/api/instagram/search/hashtag', { method:'POST', body: JSON.stringify(params) }),
  'twitter:search': (params) => fetch('http://localhost:3003/api/twitter/search', { method:'POST', body: JSON.stringify(params) }),
  'tiktok:search': (params) => fetch('http://localhost:3006/api/tiktok/search/keyword', { method:'POST', body: JSON.stringify(params) }),
  'threads:search': (params) => fetch('http://localhost:3004/api/threads/search', { method:'POST', body: JSON.stringify(params) }),
  'linkedin:search': (params) => spawnChromeSearch(params), // subprocess to linkedin-chrome-search.js
};
```

## Rules
- Poll every 10 seconds (not 30, speed matters for responsiveness)
- Use SUPABASE_SERVICE_ROLE_KEY for direct Supabase REST calls
- Rate limit: 100 commands/hour per platform, track in rate-limit state
- Command allowlist: only known platform:action pairs accepted
- Never execute commands that could send messages (DM/post actions are approval-only)

## Start with CB-001 (Supabase migration), then CB-003 (daemon). Mark features complete as you go.
