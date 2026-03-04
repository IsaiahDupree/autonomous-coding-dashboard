# PRD: Agent Calendar + Email System

## Overview

An AI agent should be able to plan its own work sessions, block time on Google Calendar, send progress reports via Gmail (from a dedicated agent email address), and expose all of this to Claude Code and Windsurf via MCP servers and a skill file.

## Problem Statement

Today, AI agents executing long-running tasks (ACD sessions, outreach cycles, content generation) operate invisibly. There is no way to:
- See what the agent planned to do today
- Know when a session started or completed
- Receive a written summary of what was accomplished
- Correlate agent activity with calendar time blocks

This creates operational friction: the user has no passive awareness of agent progress without actively checking logs.

## Goals

1. Agent blocks 15-30 minute work sessions on Google Calendar with descriptive titles and plans
2. Agent sends progress emails (from its own Gmail address) CC-ing the user on every send
3. Agent generates a daily plan from business goals + recent ACD activity
4. Two MCP servers (gcal-mcp, gmail-mcp) expose these capabilities to any Claude Code agent
5. A Windsurf skill file teaches agents when and how to use these tools

## Non-Goals

- Building a full project management system
- Replacing Supabase activity logging (this is complementary)
- Multi-agent coordination or conflict resolution on calendar

## Architecture

### Package: agent-comms
Path: /Users/isaiahdupree/Documents/Software/agent-comms
Language: TypeScript (ESM, Node 18+)
Auth: Google OAuth2 via googleapis SDK (refresh token stored in .env)

### Modules

src/auth/google-auth.ts
- getAuthClient(): OAuth2Client with auto-refresh
- Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN from env

src/calendar/calendar-client.ts
- createBlock(title, startISO, durationMin, description, colorId?)
- updateBlock(eventId, updates)
- listBlocks(afterISO?, maxResults?)
- deleteBlock(eventId)
- appendBlockProgress(eventId, note)

src/gmail/gmail-client.ts
- sendEmail(to, subject, body, cc?)  -- always auto-CCs USER_CC_EMAIL
- readInbox(maxResults?)
- searchEmails(query, maxResults?)
- sendProgressUpdate(subject, body)

src/planner/planner.ts
- readBusinessGoals()  -- reads BUSINESS_GOALS_PATH file
- readRecentActivity(logDir?)  -- scans harness/logs/*.log last 24h
- generateDailyPlan(goals, activity)  -- Claude API -> array of PlanBlock
- scheduleDailyPlan()  -- full pipeline: goals + activity + plan + create calendar blocks

src/reporter/progress-reporter.ts
- reportSessionStart(title, plan, durationMin)  -- creates calendar block, returns eventId
- reportSessionComplete(eventId, summary, featuresCompleted[])  -- appends to block + emails user

### MCP Servers

gcal-mcp (src/gcal-mcp.ts):
Tools: gcal_create_block, gcal_update_block, gcal_list_blocks, gcal_append_progress, gcal_create_daily_plan

gmail-mcp (src/gmail-mcp.ts):
Tools: gmail_send, gmail_read_inbox, gmail_search, gmail_send_progress_update

### CLI
node dist/cli.js plan     -- generate + schedule today's plan
node dist/cli.js report <eventId> <summary>  -- mark session complete
node dist/cli.js status   -- print today's calendar blocks

## Environment Variables

GOOGLE_CLIENT_ID        -- OAuth2 app client ID
GOOGLE_CLIENT_SECRET    -- OAuth2 app client secret
GOOGLE_REFRESH_TOKEN    -- Long-lived refresh token
AGENT_EMAIL             -- The agent's Gmail address (e.g. agent@isaiahdupree.com)
USER_CC_EMAIL           -- Isaiah's email to always CC
CALENDAR_ID             -- Google Calendar ID (default: primary)
BUSINESS_GOALS_PATH     -- Path to goals .md or .json file
ANTHROPIC_API_KEY       -- For daily plan generation via Claude

## MCP Config Snippet (add to ~/.codeium/windsurf/mcp_config.json)

{
  mcpServers: {
    gcal: {
      command: node,
      args: [/Users/isaiahdupree/Documents/Software/agent-comms/dist/gcal-mcp.js]
    },
    gmail: {
      command: node,
      args: [/Users/isaiahdupree/Documents/Software/agent-comms/dist/gmail-mcp.js]
    }
  }
}

## Skill File

.windsurf/workflows/agent-calendar-skill.md documents:
- When to use (planning, progress updates, user notifications)
- Pattern: session start -> gcal_create_block -> work -> gcal_append_progress -> gmail_send_progress_update
- All tool signatures with example inputs

## Feature List

ACAL-001: Scaffold package + Google OAuth2 helper
ACAL-002: Google Calendar client module (CRUD + appendBlockProgress)
ACAL-003: Gmail client module (send, read, progress update)
ACAL-004: Agent planner (readGoals + readActivity + generateDailyPlan + scheduleDailyPlan)
ACAL-005: Google Calendar MCP server (5 tools)
ACAL-006: Gmail MCP server (4 tools)
ACAL-007: Progress reporter (reportSessionStart + reportSessionComplete)
ACAL-008: Windsurf skill file + README + OAuth setup docs

## Success Criteria

- npx tsc --noEmit passes cleanly
- Both MCP servers start and respond to tools/list RPC call
- CLI plan command creates at least 1 calendar block
- CLI report command appends to a block and sends an email
- Skill file is readable and discoverable via /agent-calendar-skill in Windsurf
