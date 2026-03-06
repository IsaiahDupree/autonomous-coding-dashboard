# PRD: Unified Browser Agent Control Layer
## Safari (IG/TikTok/Twitter/Threads/Upwork) + Chrome (LinkedIn)

**Status:** Draft  
**Date:** 2026-03-05  
**Source:** Founder voice memo — autonomous system vision  
**Scope:** Extend existing Safari automation patterns to all platforms; pivot LinkedIn to Chrome

---

## 1. Problem Statement

We have working Safari automations for Instagram DMs, TikTok DMs, Twitter, and Threads. Each was built in isolation. We need a **unified control layer** that:
- Treats every browser session as a controllable agent with a consistent API
- Supports Safari for: Instagram, TikTok, Twitter, Threads, Upwork
- Supports Chrome for: LinkedIn (Safari `do JavaScript` unreliable at LinkedIn's scale)
- Can be commanded from the cloud (Supabase task queue) and send results back to the cloud
- Is self-describing so new platforms can be added without changing the control layer

---

## 2. Existing Infrastructure to Build On

| Component | Location | Status |
|-----------|----------|--------|
| Safari DM services | Safari Automation/packages/\* | ✅ Working (ports 3001-3108) |
| osascript direct driver | scripts/li_prospect.py | ✅ Working for LinkedIn search |
| Safari control API | localhost:7070 | ✅ Running |
| Market Research API | localhost:3106 | ✅ Running |
| ACTP workflow executor pattern | actp-worker/workflow_executors.py | ✅ Pattern established |

---

## 3. Features

### BAC-001 — BrowserAgentRegistry
- Central registry of all browser agents: platform, browser (safari|chrome), port, capabilities[], health_status
- Stored in Supabase `actp_browser_agents` table
- Each agent registers on startup with: platform, browser_type, service_url, supported_actions[]
- Health check every 60s; unhealthy agents marked unavailable

### BAC-002 — UnifiedBrowserCommand API
- Single dispatch interface: `POST /api/browser/command`
- Payload: `{ platform, action, params, task_id }`
- Routes to correct service based on registry
- Returns: `{ success, result, screenshot_url?, error? }`
- Actions: `search`, `scroll`, `extract`, `click`, `type`, `dm`, `comment`, `follow`, `connect`

### BAC-003 — Safari Agent Template
- Base class/pattern all Safari services must implement: `SafariBrowserAgent`
- Methods: `health()`, `navigate(url)`, `extract(selector_hints)`, `act(action, params)`, `screenshot()`
- Apply Instagram agent's battle-tested patterns (multi-strategy typing, cliclick fallback, retry with backoff) to all Safari agents
- Agents: Instagram, TikTok, Twitter, Threads, Upwork

### BAC-004 — Chrome Agent for LinkedIn
- New service: `packages/linkedin-chrome/` (TypeScript, port 3109)
- Uses Chrome via AppleScript + `do JavaScript` OR Playwright (headful Chrome)
- Decision: Try Playwright headful Chrome first (most reliable for LinkedIn's CSP)
- Mirrors LinkedIn Safari agent API but targets Chrome window
- Actions: search_people, view_profile, extract_profile, send_connection, send_message
- Config: `LINKEDIN_CHROME_PORT=3109`, `LINKEDIN_USE_PLAYWRIGHT=true`

### BAC-005 — Upwork Safari Agent
- Extend existing Upwork Safari service (port 3108) with new actions
- Actions: search_jobs, extract_job_details, submit_proposal, check_inbox
- Job filter criteria: `{ max_hours: 4, skills: [...], budget_min: 50 }`
- Returns structured job records: title, description, budget, client_rating, url

### BAC-006 — Cloud Command Receiver
- ACTP worker polls `actp_browser_tasks` table (Supabase)
- Cloud can insert tasks: `{ platform, action, params, priority, callback_url }`
- Worker claims task → dispatches to BrowserAgentRegistry → posts result back to Supabase
- Enables remote orchestration: cloud says "find Instagram prospects" → local browser runs it → cloud gets results

### BAC-007 — Result Uploader
- After any browser action producing data, results are POST'd to Supabase
- Screenshots stored in `sora-videos` bucket (or new `browser-screenshots` bucket)
- Structured extractions stored in relevant tables (prospects, jobs, posts)
- Error traces + screenshots on failure stored for self-healing review

### BAC-008 — Platform Action Matrix
Track which actions work on which platform/browser combo:

| Platform | Browser | search | extract | dm | comment | prospect |
|----------|---------|--------|---------|-----|---------|---------|
| Instagram | Safari | ✅ | ✅ | ✅ | ✅ | ✅ |
| TikTok | Safari | ✅ | ✅ | ✅ | ✅ | ✅ |
| Twitter | Safari | ✅ | ✅ | ✅ | ✅ | ✅ |
| Threads | Safari | ✅ | ✅ | ✅ | ✅ | ✅ |
| LinkedIn | Chrome | ✅ | ✅ | ✅ | ❌ | ✅ |
| Upwork | Safari | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 4. Implementation Order

1. BAC-001: Registry table + registration endpoint
2. BAC-003: Audit all Safari agents — apply Instagram battle-tested patterns
3. BAC-002: UnifiedBrowserCommand router
4. BAC-004: LinkedIn Chrome agent (Playwright headful)
5. BAC-005: Upwork Safari agent extensions
6. BAC-006: Cloud command receiver in ACTP worker
7. BAC-007: Result uploader
8. BAC-008: Integration tests across all platforms

---

## 5. Key Files to Create/Modify

```
Safari Automation/
  packages/
    linkedin-chrome/          # NEW — Chrome agent for LinkedIn
      src/
        index.ts
        automation/
          search.ts
          profiles.ts
          connections.ts
    unified-control/          # NEW — dispatch router
      src/
        registry.ts
        router.ts
        server.ts

actp-worker/
  browser_agent_client.py     # NEW — Python client for UnifiedBrowserCommand API
  browser_agent_executor.py   # NEW — WorkflowExecutor adapter
```

---

## 6. Acceptance Criteria

- [ ] All 6 platforms respond to `GET /health` with `{ status: "ok", platform, browser }`
- [ ] `POST /api/browser/command { platform: "instagram", action: "search", params: { keyword: "ai automation" }}` returns top 10 posts
- [ ] LinkedIn Chrome agent can search, extract profiles, send connections (non-dry-run)
- [ ] Cloud task inserted to `actp_browser_tasks` is picked up and executed within 30s
- [ ] Failed actions upload screenshot + error to Supabase for self-healing review
