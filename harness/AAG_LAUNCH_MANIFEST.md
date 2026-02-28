# Autonomous Acquisition Agent — Launch Manifest
## 10 Parallel ACD Agents | PRD-022 through PRD-028

**Project:** Fully autonomous AI agent system for client/prospect acquisition  
**Total Features:** 200 (AAG-001 to AAG-180 + 20 cross-cutting)  
**PRDs:** PRD-022, PRD-023, PRD-024, PRD-025, PRD-026, PRD-027, PRD-028

---

## Launch Order (Dependencies Matter)

```
Agent 01 (Foundation) MUST run first — creates all DB tables
         ↓
Agents 02, 03, 08, 09 can run in PARALLEL after Agent 01
         ↓
Agents 04, 05 run after Agent 02+03 have contacts to work with
         ↓
Agent 06 runs after Agent 05 (needs contacted stage)
         ↓
Agents 07, 10 run after all others (wire-up + reporting)
```

---

## The 10 Agents

| # | Agent | Harness Prompt | Features | PRD(s) | Priority |
|---|-------|----------------|----------|--------|----------|
| 01 | **Foundation** | `aag-agent-01-foundation.md` | AAG-001–003, 121–122, 151–152, 179 | All | 🔴 FIRST |
| 02 | **Discovery** | `aag-agent-02-discovery.md` | AAG-005–020 | 022 | 🔴 Batch A |
| 03 | **Scoring** | `aag-agent-03-scoring.md` | AAG-021–030 | 022 | 🔴 Batch A |
| 04 | **Warmup** | `aag-agent-04-warmup.md` | AAG-031–050 | 023 | 🟡 Batch B |
| 05 | **Outreach** | `aag-agent-05-outreach.md` | AAG-051–064, 139–140 | 024 | 🟡 Batch B |
| 06 | **Follow-up** | `aag-agent-06-followup.md` | AAG-065–075 | 024 | 🟡 Batch B |
| 07 | **Orchestrator** | `aag-agent-07-orchestrator.md` | AAG-076–092, 111–120, 146–147, 174 | 025 | 🟢 Batch C |
| 08 | **Email** | `aag-agent-08-email.md` | AAG-123–150 | 027 | 🔴 Batch A |
| 09 | **Entity Resolution** | `aag-agent-09-entity-resolution.md` | AAG-153–180 | 028 | 🔴 Batch A |
| 10 | **Reporting** | `aag-agent-10-reporting.md` | AAG-093–110, 119, 150, 176 | 026 | 🟢 Batch C |

---

## Per-Agent Launch Instructions

### How to start each agent in ACD

Each agent prompt file contains:
- **Mission**: what to build
- **Features to Build**: exact AAG IDs from `feature_list_autonomous_acquisition_agent.json` and `feature_list_acquisition_email_entity.json`
- **Working Directory**: where to create files
- **Output Files**: exact file paths to create
- **Code specs**: interfaces, prompts, logic
- **Tests Required**: specific test function names

**To launch an agent in ACD:**
1. Open `harness/prompts/aag-agent-{N}-{name}.md`
2. Feed full file contents as system/context prompt to ACD agent
3. Provide `feature_list_autonomous_acquisition_agent.json` or `feature_list_acquisition_email_entity.json` as additional context
4. Agent works in the specified `Working Directory`
5. Mark features `"status": "completed"` as agent finishes each one

---

## Batch A — Start NOW (all parallel, no deps except Agent 01)

```bash
# After Agent 01 completes migrations:

# Terminal 1 — Agent 02 Discovery
cd /Users/isaiahdupree/Documents/Software/Safari\ Automation/scripts/
# Feed: harness/prompts/aag-agent-02-discovery.md to ACD

# Terminal 2 — Agent 03 Scoring  
# Feed: harness/prompts/aag-agent-03-scoring.md to ACD

# Terminal 3 — Agent 08 Email
# Feed: harness/prompts/aag-agent-08-email.md to ACD

# Terminal 4 — Agent 09 Entity Resolution
# Feed: harness/prompts/aag-agent-09-entity-resolution.md to ACD
```

## Batch B — Start after Batch A completes

```bash
# Agent 04 Warmup (needs qualified contacts from Agent 03)
# Agent 05 Outreach (needs warm contacts from Agent 04)
# Agent 06 Follow-up (needs contacted contacts from Agent 05)
```

## Batch C — Start after Batch B completes

```bash
# Agent 07 Orchestrator (wires all agents together)
# Agent 10 Reporting (reads all data from all agents)
```

---

## Environment Variables Required

Add to `.env` before any agent runs:

```bash
# Core (required)
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
ENABLE_ACQUISITION=true

# Email (required for Agent 08)
RESEND_API_KEY=your_resend_key
FROM_EMAIL=outreach@yourdomain.com
EMAIL_UNSUB_SECRET=random-secret-string-here
OWNER_EMAIL=isaiah@example.com
# IMAP (optional, for reply detection)
IMAP_HOST=imap.gmail.com
IMAP_USER=your@email.com
IMAP_PASS=app_password

# Entity Resolution (required for Agent 09)
PERPLEXITY_API_KEY=your_perplexity_key

# Optional (service will degrade gracefully without)
SAFARI_GATEWAY_URL=http://localhost:7070
```

---

## File Structure After All Agents Complete

```
Safari Automation/scripts/acquisition/
├── __init__.py
├── config.py
├── state_machine.py
├── daily_caps.py
├── channel_coordinator.py
├── notification_client.py
├── discovery_agent.py
├── scoring_agent.py
├── warmup_agent.py
├── outreach_agent.py
├── followup_agent.py
├── email_agent.py
├── entity_resolution_agent.py
├── orchestrator.py
├── reporting_agent.py
├── clients/
│   └── market_research_client.py
├── email/
│   ├── resend_client.py
│   ├── discovery.py
│   ├── generator.py
│   ├── imap_watcher.py
│   └── templates/base.html
├── entity/
│   ├── perplexity_client.py
│   ├── username_matcher.py
│   ├── bio_link_extractor.py
│   ├── linktree_parser.py
│   └── disambiguator.py
├── reporting/
│   ├── stats_collector.py
│   ├── insight_generator.py
│   └── formatter.py
├── db/
│   ├── migrations/
│   │   ├── 001_acquisition_tables.sql
│   │   └── 002_crm_contacts_columns.sql
│   └── queries.py
├── api/
│   ├── server.py
│   ├── schemas.py
│   └── routes/
│       ├── discovery.py
│       ├── warmup.py
│       ├── outreach.py
│       ├── followup.py
│       ├── email.py
│       ├── entity.py
│       ├── orchestrator.py
│       └── reports.py
└── tests/
    ├── test_discovery_agent.py
    ├── test_scoring_agent.py
    ├── test_warmup_agent.py
    ├── test_outreach_agent.py
    ├── test_followup_agent.py
    ├── test_email_agent.py
    ├── test_entity_resolution.py
    ├── test_orchestrator.py
    ├── test_reporting_agent.py
    └── test_e2e_acquisition_pipeline.py
```

---

## Cron Jobs (enabled when ENABLE_ACQUISITION=true)

| Time | Job | Agent |
|------|-----|-------|
| 6:00 AM daily | Discovery | Agent 02 |
| 6:30 AM daily | Entity Resolution | Agent 09 |
| 7:00 AM daily | ICP Scoring | Agent 03 |
| 7:30 AM daily | Email Discovery | Agent 08 |
| 8:00 AM daily | Warmup Schedule | Agent 04 |
| 8:30 AM daily | Warmup Execute | Agent 04 |
| 9:00 AM daily | DM Outreach | Agent 05 |
| 9:30 AM daily | Email Send | Agent 08 |
| Every 4 hours | Inbox Sync + Follow-up | Agent 06 |
| Monday 9:00 AM | Weekly Report | Agent 10 |

---

## Full Pipeline Flow (what happens every day)

```
6AM  → Discovery Agent finds 20–50 new prospects on social platforms
6:30 → Entity Resolution links cross-platform profiles (Twitter → LinkedIn → email)
7AM  → Scoring Agent qualifies ~50% (score ≥65), archives rest
7:30 → Email Discovery finds verified emails for LinkedIn/website contacts
8AM  → Warmup Scheduler creates comment schedules for qualified contacts
8:30 → Warmup Executor sends today's comments (2–3 per warming contact)
9AM  → Outreach Agent sends first DMs to ready_for_dm contacts
9:30 → Email Agent sends first emails to email-channel contacts
Every 4h → Sync inboxes, detect replies, advance stage, notify human
Day 4 → Follow-up 1 sent to non-responders
Day 7 → Follow-up 2 (close-the-loop) sent
Day 10 → Archive non-responders
Monday → Weekly report delivered to email + Obsidian + push notification
```

---

## PRD Reference

| PRD | Title | Harness File |
|-----|-------|--------------|
| PRD-022 | Autonomous Prospect Discovery Agent | `docs/prd/PRD-022-AUTONOMOUS-PROSPECT-DISCOVERY-AGENT.md` |
| PRD-023 | Engagement Warmup System | `docs/prd/PRD-023-ENGAGEMENT-WARMUP-SYSTEM.md` |
| PRD-024 | Outreach & Follow-up Agent | `docs/prd/PRD-024-OUTREACH-AND-FOLLOWUP-AGENT.md` |
| PRD-025 | Acquisition Orchestrator | `docs/prd/PRD-025-ACQUISITION-ORCHESTRATOR.md` |
| PRD-026 | Pipeline Analytics & Reporting | `docs/prd/PRD-026-PIPELINE-ANALYTICS-AND-REPORTING.md` |
| PRD-027 | Email Outreach Integration | `docs/prd/PRD-027-EMAIL-OUTREACH-INTEGRATION.md` |
| PRD-028 | Cross-Platform Entity Resolution | `docs/prd/PRD-028-CROSS-PLATFORM-ENTITY-RESOLUTION.md` |
