# PRD-072: Marketing Agent Service

## Status: Ready
## Author: Isaiah Dupree
## Created: 2026-03-04
## Priority: P1 — Revenue-generating autonomous marketing

---

## 1. Problem Statement

Safari automation can post content and send DMs, but there is **no agent that autonomously decides what to market, generates the content, schedules it, executes the campaign, and measures results** — then improves based on what worked.

The marketing loop today requires: human decides campaign → human writes content → human triggers posts. Polsia's marketing agent does all of this without human input: it researches what's trending, drafts content, posts, tracks metrics, and refines its strategy.

---

## 2. Solution Overview

A **Marketing Agent** module (part of `company-orchestrator`) that:
- Accepts a marketing goal ("grow Twitter followers", "promote cloud-sync-mcp launch")
- Researches the niche using the Market Research API (port 3106)
- Generates platform-appropriate content using Claude + existing ACTP ContentLite
- Executes via Safari automation (Twitter, Instagram, Threads, LinkedIn)
- Tracks performance metrics
- Feeds results back to the self-improving reflector

This reuses ALL existing Safari automation infrastructure — the marketing agent is the orchestration layer above it.

---

## 3. Architecture

```
Marketing Goal: "Grow Twitter audience for cloud-sync-mcp"
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                MARKETING AGENT                       │
│                                                      │
│  1. Research (port 3106 → top creators + hooks)      │
│  2. Generate content (Claude → tweets, captions)     │
│  3. Schedule (MPLite queue or immediate post)        │
│  4. Execute (Safari automation ports 3003/3005/3007) │
│  5. Track (collect likes/views after 1h/24h)         │
│  6. Reflect (update content strategy knowledge)      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Feature List

### Research
- `MKT-001` Niche researcher: given goal, query Market Research API `/api/research/{platform}/search` for top posts + creators
- `MKT-002` Hook extractor: Claude analyzes top posts and extracts reusable hook patterns + content frameworks
- `MKT-003` Competitor mapper: identify top 5 accounts to model + track in Supabase `company_competitors` table

### Content Generation
- `MKT-004` Tweet generator: given hook + product context, Claude generates 5 tweet variants (thread + standalone)
- `MKT-005` Caption generator: platform-aware captions for Instagram/Threads/LinkedIn from same brief
- `MKT-006` Content scorer: Claude scores each variant on hook strength, clarity, CTA (1-10); pick top 2

### Execution
- `MKT-007` Twitter poster: POST to Safari automation port 3007 `/api/twitter/comments/post` with best tweet
- `MKT-008` Instagram poster: POST to port 3005 with best caption
- `MKT-009` Threads poster: POST to port 3004 with threads-optimized variant
- `MKT-010` DM campaign: given list of warm leads from CRM, generate personalized DMs and dispatch via port 3003

### Performance Tracking
- `MKT-011` Metrics collector: after 1h and 24h, query post URLs for engagement (likes, views, replies)
- `MKT-012` Performance classifier: label each post viral/good/average/flop based on engagement thresholds
- `MKT-013` Campaign summary: write to Supabase `company_campaigns` table (goal, posts, reach, conversions)

### Strategy Loop
- `MKT-014` Best-post analyzer: weekly review of top performers → extract what worked → update hook library
- `MKT-015` A/B tester: for each campaign run 2 variants, compare 24h results, keep winner's framework
- `MKT-016` Marketing knowledge base: append lessons to `knowledge/marketing-playbook.md` after each campaign

### Ops
- `MKT-017` Rate limiter: enforce per-platform daily post limits (Twitter: 10/day, IG: 3/day, Threads: 5/day)
- `MKT-018` Marketing log: append each action to `logs/marketing-agent.jsonl`
- `MKT-019` Campaign CLI: `python marketing_agent.py --goal "..." --platform twitter --dry-run`

---

## 5. Success Criteria

- Full campaign (research → generate → post → track) runs end-to-end without human intervention
- Content scoring reduces low-quality posts (< 6/10) from being published
- 24h metrics collected and stored for at least 3 campaigns
- Marketing knowledge base updated after each campaign

---

## 6. Dependencies

- Safari automation services (ports 3003, 3004, 3005, 3007, 3106) — existing
- MPLite publishing queue — existing
- ACTP CRM (crm_contacts table) — existing
- Supabase project: ivhfuhxorppptyuofbgq
