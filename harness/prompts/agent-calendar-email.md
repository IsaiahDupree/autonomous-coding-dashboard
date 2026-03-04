# Agent Calendar + Email System

## Project
/Users/isaiahdupree/Documents/Software/agent-comms

## Context
A new TypeScript package that gives AI agents their own Google Calendar and Gmail presence.
The agent blocks 15-30 minute work sessions on Google Calendar with a description of planned work,
sends progress update emails (from a dedicated agent email, CC-ing the user), and can generate
a daily plan by reading business goals and recent activity logs.
Exposed as two MCP servers (gcal-mcp, gmail-mcp) and a Windsurf skill file.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run npx tsc --noEmit from the package root
- At the end: run npm run build and create a git commit
- Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/agent-calendar-email-features.json after completing each feature - set passes: true, status: completed
- For ACME-001 through ACAL-008 do NOT skip any step; the later MCPs depend on the earlier client modules

---

## ACAL-001: Scaffold package + Google OAuth2 helper

**Problem**: No package exists yet at /Users/isaiahdupree/Documents/Software/agent-comms

**Fix**:
1. Create package.json with name @isaac/agent-comms, type: module, scripts: build, start:gcal, start:gmail. Dependencies: googleapis, express, @modelcontextprotocol/sdk, dotenv. DevDeps: typescript, @types/node.
2. Create tsconfig.json targeting ES2022, moduleResolution: node16, outDir: dist, strict: true.
3. Create src/auth/google-auth.ts with:
   - loadCredentials(): reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN from process.env
   - getAuthClient(): returns an OAuth2Client with credentials set, auto-refreshes token
   - Token refresh uses refresh_token grant; logs new access token to console on refresh
4. Create src/config.ts with:
   - AGENT_EMAIL: process.env.AGENT_EMAIL (the agent's Gmail address)
   - USER_CC_EMAIL: process.env.USER_CC_EMAIL (Isaiah's email to always CC)
   - CALENDAR_ID: process.env.CALENDAR_ID (defaults to 'primary')
   - BUSINESS_GOALS_PATH: process.env.BUSINESS_GOALS_PATH (path to goals .md or .json file)
5. Create .env.example with all required env vars documented.
6. Create src/index.ts that just exports from auth, calendar, gmail, planner modules.

---

## ACAL-002: Google Calendar client module

**Problem**: No Google Calendar CRUD operations exist.

**Fix**:
1. Create src/calendar/calendar-client.ts with these exported async functions:
   - createBlock(title: string, startISO: string, durationMin: number, description: string, colorId?: string): Promise<CalendarEvent>
     Uses google.calendar('v3').events.insert, sets summary=title, description=description, start/end from startISO + durationMin
   - updateBlock(eventId: string, updates: Partial<{title, description, status}>): Promise<CalendarEvent>
     Uses events.patch
   - listBlocks(afterISO?: string, maxResults?: number): Promise<CalendarEvent[]>
     Uses events.list with timeMin=afterISO, maxResults default 20
   - deleteBlock(eventId: string): Promise<void>
     Uses events.delete
   - appendBlockProgress(eventId: string, progressNote: string): Promise<CalendarEvent>
     Fetches current description, appends '

[PROGRESS UPDATE - {timestamp}]
{progressNote}', calls updateBlock
2. Define CalendarEvent interface: { id: string, title: string, startISO: string, endISO: string, description: string, link: string }
3. Export all from src/calendar/index.ts

---

## ACAL-003: Gmail client module

**Problem**: No Gmail send/read operations exist.

**Fix**:
1. Create src/gmail/gmail-client.ts with:
   - sendEmail(to: string, subject: string, body: string, cc?: string[]): Promise<{ messageId: string }>
     Builds RFC 2822 message, base64url encodes, calls gmail.users.messages.send
     Always prepends USER_CC_EMAIL to cc array (from config.ts)
     Sets From header to AGENT_EMAIL
   - readInbox(maxResults?: number): Promise<EmailMessage[]>
     Uses gmail.users.messages.list with labelIds: INBOX, then fetches each message
   - searchEmails(query: string, maxResults?: number): Promise<EmailMessage[]>
     Uses gmail.users.messages.list with q=query
   - sendProgressUpdate(subject: string, body: string): Promise<{ messageId: string }>
     Calls sendEmail(USER_CC_EMAIL, subject, body, []) - sends to user with agent as sender
2. Define EmailMessage interface: { id: string, subject: string, from: string, date: string, snippet: string, body?: string }
3. Export all from src/gmail/index.ts

---

## ACAL-004: Agent planner module

**Problem**: No planning logic exists to generate a daily schedule from business goals and recent activity.

**Fix**:
1. Create src/planner/planner.ts with:
   - readBusinessGoals(): Promise<string>
     Reads BUSINESS_GOALS_PATH file (supports .md and .json). Returns string summary.
     Falls back to a hardcoded default if path not set: 'Grow revenue to $5K/month via outreach, content, and automation'
   - readRecentActivity(logDir?: string): Promise<string>
     Scans harness/logs/*.log files (last 24h, last 100 lines each), extracts lines matching Progress|completed|passes
     Returns a summary string of what the ACD has been working on
   - generateDailyPlan(goals: string, recentActivity: string): Promise<PlanBlock[]>
     Uses Claude API (ANTHROPIC_API_KEY from env) to generate a JSON array of PlanBlock objects
     Prompt: given the goals and recent activity, plan 4-8 work blocks for today (15-30 min each)
     Returns parsed PlanBlock[]
   - scheduleDailyPlan(): Promise<CalendarEvent[]>
     Calls readBusinessGoals + readRecentActivity + generateDailyPlan
     Calls createBlock for each PlanBlock starting from next round 30-min slot
     Returns created CalendarEvent[]
2. Define PlanBlock interface: { title: string, durationMin: number, description: string, priority: number }
3. Export all from src/planner/index.ts

---

## ACAL-005: Google Calendar MCP server

**Problem**: No MCP server exposes calendar tools to Claude Code and Windsurf.

**Fix**:
1. Create src/gcal-mcp.ts - a JSON-RPC 2.0 MCP server over stdio using @modelcontextprotocol/sdk Server class.
2. Register these tools:
   - gcal_create_block: { title: string, startISO: string, durationMin: number, description: string }
     Calls createBlock(), returns { eventId, link }
   - gcal_update_block: { eventId: string, title?: string, description?: string }
     Calls updateBlock()
   - gcal_list_blocks: { afterISO?: string, maxResults?: number }
     Calls listBlocks(), returns array of CalendarEvent
   - gcal_append_progress: { eventId: string, progressNote: string }
     Calls appendBlockProgress()
   - gcal_create_daily_plan: {}
     Calls scheduleDailyPlan(), returns array of created CalendarEvent with titles and links
3. Add script to package.json: start:gcal -> node dist/gcal-mcp.js
4. Add to README: MCP config snippet for claude_desktop_config.json and windsurf mcp_config.json

---

## ACAL-006: Gmail MCP server

**Problem**: No MCP server exposes Gmail tools to Claude Code and Windsurf.

**Fix**:
1. Create src/gmail-mcp.ts - JSON-RPC 2.0 MCP server over stdio.
2. Register these tools:
   - gmail_send: { to: string, subject: string, body: string, cc?: string[] }
     Calls sendEmail(), always auto-adds USER_CC_EMAIL to cc
     Returns { messageId, ccedAddresses }
   - gmail_read_inbox: { maxResults?: number }
     Calls readInbox(), returns array of EmailMessage (no body by default)
   - gmail_search: { query: string, maxResults?: number }
     Calls searchEmails()
   - gmail_send_progress_update: { subject: string, body: string }
     Calls sendProgressUpdate() - sends to user from agent address
     Returns { messageId, sentTo, from }
3. Add script to package.json: start:gmail -> node dist/gmail-mcp.js
4. Add MCP config snippet to README for both servers.

---

## ACAL-007: Progress reporter on session completion

**Problem**: Nothing automatically updates the calendar block or emails the user when a work session finishes.

**Fix**:
1. Create src/reporter/progress-reporter.ts with:
   - reportSessionComplete(eventId: string, sessionSummary: string, featuresCompleted: string[]): Promise<void>
     Step 1: calls appendBlockProgress(eventId, summary) to update calendar block description
     Step 2: builds email body with featuresCompleted list and sessionSummary
     Step 3: calls sendProgressUpdate('[Agent Update] Session Complete - {date}', emailBody)
     Logs: [REPORTER] Calendar block updated + email sent
   - reportSessionStart(title: string, plan: string, durationMin: number): Promise<{ eventId: string }>
     Calls createBlock with colorId '5' (banana yellow = in-progress)
     Returns created event id for later update
2. Create src/reporter/index.ts exporting reportSessionComplete and reportSessionStart.
3. Create a CLI entry at src/cli.ts:
   - node dist/cli.js plan -> runs scheduleDailyPlan() and prints created event links
   - node dist/cli.js report <eventId> <summary> -> runs reportSessionComplete
   - node dist/cli.js status -> calls listBlocks(new Date().toISOString()) and prints today's blocks

---

## ACAL-008: Windsurf skill file + README + MCP config snippets

**Problem**: No documentation exists for agents to discover and use these tools.

**Fix**:
1. Create README.md in package root covering: setup, .env vars, OAuth2 setup steps, building, CLI usage, MCP server config.
2. Create .windsurf/workflows/agent-calendar-skill.md at the agent-comms package root with:
   Frontmatter: description: Use Google Calendar and Gmail to plan work sessions and report progress
   Sections covering:
   - When to use these tools (planning a work day, reporting progress, sending updates)
   - gcal_create_daily_plan: call with no args to auto-generate today's schedule from business goals
   - gcal_append_progress: call with eventId + note after completing any significant task
   - gmail_send_progress_update: call at end of any multi-step session with subject + summary
   - Pattern: session start -> gcal_create_block -> do work -> gcal_append_progress -> gmail_send_progress_update
3. Create docs/OAUTH_SETUP.md with step-by-step Google Cloud Console OAuth2 credential setup instructions.
4. Verify npx tsc --noEmit and npm run build pass cleanly.
