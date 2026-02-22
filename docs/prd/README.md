# ACTP Workflow Automation — PRD Index

## Overview

These 6 PRDs define the system required to run **fully automated content pipelines** that coordinate between cloud services (Vercel + Supabase) and a local macOS machine (Safari automation + Remotion rendering).

The primary workflow — **Research → Generate → Render → Review → Publish** — demonstrates the system's capability. The architecture is general-purpose: any multi-step pipeline mixing cloud and local tasks can be defined as a workflow.

---

## PRD Dependency Graph

```
PRD-001: Workflow Engine ◄────── Foundation for everything
    │
    ├── PRD-002: Local Agent Daemon v2 ◄── Executes all local tasks
    │       │
    │       ├── PRD-003: Safari Research Pipeline
    │       │       │
    │       │       └── (feeds research data to cloud)
    │       │
    │       ├── PRD-004: Remotion Content Pipeline
    │       │       │
    │       │       └── (renders video, uploads to cloud)
    │       │
    │       └── PRD-006: Automated Publishing Pipeline
    │               │
    │               └── (uploads content via Safari/Blotato)
    │
    └── PRD-005: AI Content Review Gate ◄── Cloud-only, gates publishing
```

---

## The Primary Workflow: Research → Publish

```
 STEP 1: Safari Research (LOCAL)          PRD-003
   │  Safari browses TikTok/IG/YouTube
   │  Extracts competitor content data
   │  Uploads structured items to cloud
   ▼
 STEP 2: Blueprint Extraction (CLOUD)     ResearchLite
   │  AI analyzes research items
   │  Extracts patterns: hooks, CTAs, formats
   │  Stores creative blueprints
   ▼
 STEP 3: Content Generation (CLOUD)       ContentLite + PRD-004
   │  AI generates video script from blueprint
   │  Selects Remotion template
   │  Assembles render props (assets, text, audio)
   ▼
 STEP 4: Video Rendering (LOCAL)          PRD-004
   │  Remotion renders MP4 from composition + props
   │  Uploads finished video to Supabase Storage
   │  Links video URL to creative record
   ▼
 STEP 5: AI Quality Review (CLOUD)        PRD-005
   │  Claude evaluates: hook, clarity, brand, compliance
   │  Returns: APPROVE / REVISE / REJECT
   │  If REVISE → loop back to Step 3 (max 2x)
   │  If REJECT → archive, log reason
   ▼
 STEP 6: Platform Adaptation (CLOUD)      PRD-006
   │  Adapt caption per platform (TikTok vs IG vs YT)
   │  Select optimal hashtags
   │  Determine publish time (Thompson Sampling)
   │  Schedule cross-platform stagger
   ▼
 STEP 7: Upload & Publish (LOCAL)         PRD-006
   │  Safari or Blotato uploads video to platform
   │  Verify post is live
   │  Return post URL
   ▼
 STEP 8: Post-Publish Tracking (CLOUD)    MetricsLite + HookLite
   │  Record in actp_organic_posts
   │  Create UTM tracking link
   │  Schedule metric collection (1h, 4h, 24h, 48h, 7d)
   ▼
 STEP 9: Performance Scoring (CLOUD)      MetricsLite
   │  Score content performance
   │  Identify winners
   │  Feed back to research (winning angles → new queries)
   ▼
 LOOP: Back to Step 1 with new learnings
```

---

## PRD Summary Table

| PRD | Name | Runs On | New Tables | Key Deliverable |
|-----|------|---------|------------|-----------------|
| 001 | Workflow Engine | Cloud (Vercel) | `actp_workflow_definitions`, `actp_workflow_executions`, `actp_workflow_steps`, `actp_workflow_tasks` | Stateful DAG executor with retry, timeout, conditional branching |
| 002 | Local Agent Daemon v2 | Local (macOS) | `actp_worker_registrations` | Capability-based task executor replacing hardcoded polling loops |
| 003 | Safari Research Pipeline | Local → Cloud | Extends `actp_market_items` | Automated Safari browsing for TikTok/IG/YouTube research |
| 004 | Remotion Content Pipeline | Cloud → Local → Cloud | `actp_remotion_templates` | End-to-end script → render → upload → link pipeline |
| 005 | AI Content Review Gate | Cloud | `actp_review_rubrics`, `actp_content_reviews` | Rubric-based AI quality assessment with approve/revise/reject |
| 006 | Automated Publishing Pipeline | Cloud → Local → Cloud | `actp_publish_schedule` | Platform-adapted, time-optimized, verified publishing |

---

## Implementation Order

```
Week 1:  PRD-001 (Workflow Engine) — DB tables, execution engine, advance cron
         PRD-002 (Local Agent) — Base daemon, capability registration, task poller

Week 2:  PRD-003 (Safari Research) — TikTok + IG scrapers, cloud integration
         PRD-004 (Remotion Pipeline) — Template registry, props builder, render executor

Week 3:  PRD-005 (AI Review) — Rubrics, evaluation engine, decision logic
         PRD-006 (Publishing) — Platform adapter, upload executors, verification

Week 4:  Integration testing — Full end-to-end workflow runs
         ACTPDash UI — Workflow monitoring, review dashboard
         Tuning — Rate limits, timing optimization, rubric calibration
```

**Total estimated effort: ~40 developer-days across all 6 PRDs.**

---

## New Database Tables (All PRDs)

| Table | PRD | Purpose |
|-------|-----|---------|
| `actp_workflow_definitions` | 001 | Workflow templates (JSON DAGs) |
| `actp_workflow_executions` | 001 | Running workflow instances |
| `actp_workflow_steps` | 001 | Per-step state within executions |
| `actp_workflow_tasks` | 001 | Local worker task queue |
| `actp_worker_registrations` | 002 | Worker capability registry |
| `actp_remotion_templates` | 004 | Remotion composition catalog |
| `actp_review_rubrics` | 005 | AI review scoring criteria |
| `actp_content_reviews` | 005 | Review results + decisions |
| `actp_publish_schedule` | 006 | Scheduled publish items |

---

## Key Design Principles

1. **Pull, never push** — Local machine is behind NAT. Cloud never initiates connections to local. Worker always polls.
2. **Workflows are data** — Workflow definitions are JSON stored in Supabase. No code changes needed to create new pipelines.
3. **Every step is idempotent** — Safe to retry any step. Completions are atomic.
4. **Graceful degradation** — If worker is offline, cloud steps still advance. Local steps queue up and execute when worker returns.
5. **Observable by default** — Every state transition logged. ACTPDash shows real-time workflow status.
6. **AI as a gate, not a crutch** — AI review is a quality filter, not a content generator. Generation happens in ContentLite/Remotion.
7. **Platform-native** — Each platform gets adapted content, not identical cross-posts.
