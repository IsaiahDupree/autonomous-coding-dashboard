# PRD-080: Multi-Platform Prospect Pipeline Agent

You are building a 24/7 prospect-finding daemon that searches Instagram, TikTok, Twitter, and Threads for ICP-qualified prospects and syncs them to CRMLite.

## Context
Working dir: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
Safari automation services: ports 3100(IG DM), 3003(TW DM), 3102(TK DM), 3005(IG comments/search), 3006(TK comments/search), 3007(TW comments), 3004(Threads)
CRMLite: https://crmlite-isaiahduprees-projects.vercel.app — API key in /Users/isaiahdupree/Documents/Software/actp-worker/.env as CRMLITE_API_KEY
Business goals: /Users/isaiahdupree/Documents/Software/business-goals.json
ICP: SaaS founders, AI/automation niche, $500K-$5M ARR
Pattern to follow: harness/linkedin-daemon.js (same structure: daemon loop, state file, queue file, CRMLite sync, never auto-send DMs)

## Features to implement
Read harness/features/prd080-prospect-pipeline.json for the full feature list.

## Architecture
- harness/prospect-pipeline.js — main daemon (mirrors linkedin-daemon.js structure)
- harness/launch-prospect-pipeline.sh — start/stop/status
- Backend routes in backend/src/index.ts (follow existing pattern)
- Dashboard panel in backend/index.html Queue tab (follow LinkedIn panel pattern)

## Key APIs to call
- Instagram search: POST http://localhost:3005/api/instagram/search/hashtag { hashtag: "#aiautomation" }
- TikTok search: POST http://localhost:3006/api/tiktok/search/keyword { keyword: "ai automation" }
- Twitter search: POST http://localhost:3003/api/twitter/search { query: "AI SaaS founder", limit: 20 }
- Threads: POST http://localhost:3004/api/threads/search { query: "ai automation" }

## Rules
- NEVER auto-send DMs — only queue for human approval
- ICP threshold: ≥6/10
- pipeline_stage: 'first_touch' (not 'prospect')
- Load CRMLITE_API_KEY from actp-worker/.env (not ~/.env which has placeholder)
- Log with isTTY guard to prevent nohup double-write
- All services may return different schemas — handle gracefully with try/catch per platform

## Start with PP-001, PP-002. Run node --check after each file. Mark features complete as you go.
