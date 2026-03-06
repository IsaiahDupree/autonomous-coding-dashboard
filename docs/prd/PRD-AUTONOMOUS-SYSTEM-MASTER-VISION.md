# PRD: Autonomous System Master Vision
## Self-Improving Business Machine — Full Stack

**Status:** Active  
**Date:** 2026-03-05  
**Source:** Founder voice memo (transcribed + structured)  
**Owner:** Isaiah Dupree

---

## The Vision (Verbatim Intent)

> "The AI system tied to all these different AI systems, tied to Safari browsers, tied to MCPs, tied to skills — have all that be able to self-improve itself in order to achieve business objectives."

---

## System Map

```
                        BUSINESS OBJECTIVES
                        (goals.py — revenue, audience, autonomy)
                                │
                    ┌───────────▼────────────┐
                    │   Cognitive Orchestrator │  ← runs 24/7 in actp-worker
                    │   (15-min goal check)    │
                    └──┬──────────┬───────────┘
                       │          │
           ┌───────────▼──┐   ┌───▼────────────────┐
           │  CLOUD LAYER  │   │   LOCAL MACHINE     │
           │  (Vercel+Supabase)│  │   (actp-worker)     │
           │               │   │                    │
           │ workflow engine│   │ browser agents     │
           │ crmlite        │   │ claude code SDK    │
           │ researchlite   │   │ self-healer        │
           │ contentlite    │   │ passport drive     │
           └───────┬───────┘   └────────┬───────────┘
                   │    Cloud↔Local      │
                   └────────Bridge───────┘
                        (CLB PRD)

BROWSER AGENTS (BAC PRD)          PROSPECT PIPELINE (PAP PRD)
├── Safari: Instagram              ├── keyword → posts → creators → followers
├── Safari: TikTok                 ├── All 4 platforms deduplicated
├── Safari: Twitter                ├── LinkedIn Chrome ICP search
├── Safari: Threads                └── CRM feed (score ≥ 65)
├── Safari: Upwork
└── Chrome: LinkedIn ← PIVOT       UPWORK FULFILLMENT (UAF PRD)
                                   ├── scan jobs → feasibility score
SELF-HEALING (SHD PRD)             ├── build agent (Claude Code)
├── failure detection bus          ├── GitHub push + Vercel deploy
├── Claude Code repair agent       ├── Passport backup
├── Docker sandbox tests           └── Telegram approval gate → send
└── GitHub PR for complex fixes
```

---

## Five PRDs (Implement in This Order)

| # | PRD | Purpose | Priority |
|---|-----|---------|----------|
| 1 | [PRD-CLOUD-LOCAL-REQUEST-BRIDGE](PRD-CLOUD-LOCAL-REQUEST-BRIDGE.md) | Nervous system — cloud tasks reach local, results go back | P1 |
| 2 | [PRD-BROWSER-AGENT-UNIFIED-CONTROL](PRD-BROWSER-AGENT-UNIFIED-CONTROL.md) | Unified Safari+Chrome control for all 6 platforms | P1 |
| 3 | [PRD-PROSPECT-ACQUISITION-PIPELINE](PRD-PROSPECT-ACQUISITION-PIPELINE.md) | Find prospects on all platforms → CRM | P2 |
| 4 | [PRD-UPWORK-AUTONOMOUS-FULFILLMENT](PRD-UPWORK-AUTONOMOUS-FULFILLMENT.md) | Find gig → build → deploy → Telegram approve | P2 |
| 5 | [PRD-SELF-HEALING-CLAUDE-CODE-DOCKER](PRD-SELF-HEALING-CLAUDE-CODE-DOCKER.md) | Auto-repair any failing component | P3 |

---

## Platform → Browser Mapping

| Platform | Browser | Automations |
|----------|---------|-------------|
| Instagram | Safari | DM ✅, Comments ✅, Research ✅, Prospect ⬜ |
| TikTok | Safari | DM ✅, Comments ✅, Research ✅, Prospect ⬜ |
| Twitter | Safari | DM ✅, Comments ✅, Research ✅, Prospect ⬜ |
| Threads | Safari | Comments ✅, Research ✅, Prospect ⬜ |
| **LinkedIn** | **Chrome** | Search ✅, Prospect ✅, DM ⬜ |
| Upwork | Safari | Search ⬜, Apply ⬜ |

---

## Key Invariants (Always True)

1. **Human-in-loop gate:** Any outbound communication (proposals, DMs, comments) requires Telegram ✅ before sending at scale
2. **Passport drive backup:** All client work saved to `/Volumes/My Passport/client-projects/`
3. **GitHub first:** All code pushed to GitHub before deploy
4. **Self-healing before escalation:** 3 auto-repair attempts before Telegram alert
5. **Business goals drive scheduling:** Cognitive orchestrator reads `goals.py` targets and prioritizes tasks that close the gap

---

## Business Goals This System Achieves

From `goals.py`:
- **Revenue:** `$5,000 MRR` from client work (Upwork pipeline)
- **Audience:** `1,000,000 followers` across platforms (prospect pipeline → content → DMs)
- **Autonomy:** `99% agent uptime`, `100% daily routine completion`
- **Efficiency:** Reduce human intervention to ✅/❌ approval only

---

## Agent Dispatch Instructions

When an agent reads this document, it should:

1. Read all 5 child PRDs in order
2. Check `actp_cloud_tasks` for any queued work
3. Check current implementation status of each PRD feature (grep the codebase)
4. Pick the highest-priority unimplemented feature
5. Implement it, test it, commit to GitHub
6. Mark the feature done in the PRD (update status badge or add ✅)
7. Loop

The goal is to have all 5 PRDs at 100% acceptance criteria within 2 weeks.
