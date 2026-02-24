# Autonomous Revenue Machine Strategy

## Date: February 23, 2026
## Goal: $50,000 via Apple + Stripe | $5,000+/month starting this month

---

## 1. Architecture: OpenClaw → ACTP → ACD Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                    OpenClaw (Orchestrator Brain)                       │
│              ws://127.0.0.1:18789 — always-on daemon                  │
│                                                                       │
│  Receives goals → Plans actions → Delegates → Monitors → Learns      │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ Marketing    │  │ Coding Tasks │  │ Quality Gates             │   │
│  │ Tasks        │  │              │  │                           │   │
│  │ ↓            │  │ ↓            │  │ Pre-publish: AI review    │   │
│  │ ACTP Worker  │  │ ACD Agents   │  │ Pre-deploy: test suite    │   │
│  │ (121 topics) │  │ (Claude SDK) │  │ Pre-outreach: compliance  │   │
│  └──────┬───────┘  └──────┬───────┘  │ Post-action: metrics      │   │
│         │                  │          └───────────────────────────┘   │
└─────────┼──────────────────┼─────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌──────────────────┐ ┌────────────────────────────┐
│ ACTP Worker      │ │ ACD (Port 3434)            │
│ Port 9090        │ │                            │
│                  │ │ POST /api/harness/start    │
│ 20 services      │ │ POST /api/harness/status   │
│ 121 topics       │ │ POST /api/projects         │
│                  │ │                            │
│ research.*       │ │ Coding agent executes:     │
│ twitter.*        │ │ - Feature implementation   │
│ publish.*        │ │ - Bug fixes               │
│ feedback.*       │ │ - Test writing            │
│ dm.*             │ │ - App Store optimization   │
│ linkedin.*       │ │                            │
│ crm.*            │ │ Git commit → push → deploy │
│ ads.*            │ │                            │
└──────────────────┘ └────────────────────────────┘
```

## 2. What Exists Today (121 Real Topics)

### Revenue-Critical Chains (all working NOW)

**Research → Generate → Publish → Track:**
```
research.twitter        → discover trending niches
research.platform       → scrape competitor content
twitter.strategy        → get winning strategy from data
twitter.generate        → create tweets from strategy
twitter.generate_prompt → AI prompt from research + strategy
publish.auto            → publish (MediaPoster first, fallback to lite)
publish.multi           → multi-platform distribution
feedback.register_post  → track published content
feedback.checkbacks     → check performance metrics
feedback.analysis       → AI analysis of what works
metrics.winners         → find top-performing content
```

**Outreach → CRM → Convert:**
```
dm.top_contacts         → find best outreach targets
dm.ai_generate          → generate personalized messages
dm.send                 → send DMs across platforms
dm.process_outreach     → process outreach queue
crm.create_contact      → add leads to CRM
crm.log_interaction     → track conversations
linkedin.prospect       → run prospecting pipeline
linkedin.campaign       → execute outreach campaigns
upwork.search           → find high-value contracts
upwork.propose          → generate AI proposals
```

**Content Production:**
```
sora.generate           → AI video generation
remotion.render         → template-based video rendering
content.analyze_video   → AI analysis (viral score, hook, CTA)
content.youtube_payload → YouTube upload metadata
mediaposter.smart_schedule → optimal posting time
mediaposter.post_from_actp → high-level publish with feedback
blotato.publish         → direct platform upload
```

## 3. What Needs Building (Integration Topics)

### New topics needed in service_registry.py:

| Topic | Purpose | Priority |
|-------|---------|----------|
| `system.delegate_to_acd` | Send coding task to ACD agent | HIGH |
| `system.acd_status` | Check ACD agent progress | HIGH |
| `system.approval_gate` | Human approval for risky actions | HIGH |
| `system.daily_revenue` | Revenue dashboard from Stripe + Apple | HIGH |
| `orchestrator.morning_routine` | Full morning automation chain | MEDIUM |
| `orchestrator.content_blitz` | Batch content generation | MEDIUM |
| `orchestrator.outreach_cycle` | Full outreach automation | MEDIUM |

## 4. Revenue Targets & Products

### Immediate Revenue (This Month)

| Product | Channel | Price | Target | Monthly |
|---------|---------|-------|--------|---------|
| EverReach Pro | Apple App Store | $19.99/mo | 100 users | $2,000 |
| ClientPortal | Stripe | $49/mo | 30 users | $1,470 |
| Upwork contracts | Direct | $2K+/project | 2 projects | $4,000 |
| Content automation service | Stripe | $2K/mo | 1 client | $2,000 |
| **Total Month 1** | | | | **$9,470** |

### Scale to $50K (3-month trajectory)

| Month | EverReach | SaaS | Services | Upwork | Total |
|-------|-----------|------|----------|--------|-------|
| 1 | $2,000 | $1,500 | $2,000 | $4,000 | $9,500 |
| 2 | $5,000 | $4,000 | $6,000 | $4,000 | $19,000 |
| 3 | $8,000 | $6,000 | $8,000 | $4,000 | $26,000 |
| **Cumulative** | | | | | **$54,500** |

## 5. TODAY'S Actions (Feb 23, 2026)

### Phase 1: Research (Now)
```bash
actp-worker invoke research.twitter '{"niches":["saas_founders","content_creators","ai_automation"]}'
actp-worker invoke research.platform '{"platform":"tiktok","niche":"ai_automation"}'
actp-worker invoke twitter.strategy '{"niche":"saas_founders"}'
actp-worker invoke upwork.search '{"keywords":"content automation AI","budget_min":1000}'
```

### Phase 2: Content Generation
```bash
actp-worker invoke twitter.generate '{"niche":"ai_automation"}'
actp-worker invoke twitter.generate_prompt '{"niche":"saas_founders"}'
actp-worker invoke feedback.generate_prompt '{"niche":"content_creators"}'
actp-worker invoke sora.generate '{"concept":"AI automation demo","duration":30}'
```

### Phase 3: Publishing
```bash
actp-worker invoke publish.auto '{"platforms":["tiktok","instagram","twitter"],"file_path":"VIDEO","text":"CAPTION"}'
actp-worker invoke mediaposter.post_from_actp '{"video_url":"URL","platforms":["tiktok","instagram"]}'
```

### Phase 4: Outreach
```bash
actp-worker invoke linkedin.prospect '{"keywords":"SaaS founder","limit":50}'
actp-worker invoke dm.process_outreach '{}'
actp-worker invoke upwork.scan '{}'
```

### Phase 5: Track & Optimize
```bash
actp-worker invoke feedback.checkbacks '{}'
actp-worker invoke metrics.winners '{"platform":"tiktok","limit":10}'
actp-worker invoke feedback.analysis '{}'
actp-worker invoke memory.write_daily '{"content":"Day 1 results: ..."}'
```

## 6. Credit Efficiency Rules

- **Research/discovery**: Use existing cached results first (research.list_results, research.blueprints)
- **Content drafts**: GPT-4o-mini via ContentLite (cheap)
- **Final review**: Claude via content.analyze_video (quality matters)
- **Batch operations**: Generate 10+ pieces per call, not 1
- **Feedback loop**: Winners inform next generation (less experimentation needed)
- **Target**: <$400/month AI costs for $5K+ revenue (8% cost ratio max)

## 7. Security Standards (Enforced)

- [x] All API keys in env vars only (WORKER_SECRET, ANTHROPIC_API_KEY, etc.)
- [x] OpenClaw gateway: loopback-only binding (127.0.0.1)
- [x] ACTP Worker: auth on all POST endpoints (Bearer WORKER_SECRET)
- [x] No secrets in git (all .env files in .gitignore)
- [x] Approval gates for: paid ads, bulk DMs, code deployments (system.approval_gate — fail-closed)
- [x] ACD delegation gated: system.delegate_to_acd checks approval before coding tasks
- [x] Supabase table: actp_approval_queue tracks all risky action requests
- [x] Telegram alerts for pending approvals (auto-notify)
- [ ] Daily security audit via `openclaw doctor` + `system.self_test`

## 8. Daily Autonomous Routine (Once Built)

```
06:00  system.heartbeat → verify all services running
06:05  research.twitter → scan overnight trends
06:10  twitter.strategy → update winning strategies
06:30  twitter.generate → batch 10 posts per niche
07:00  publish.auto → schedule day's content
08:00  linkedin.prospect → morning prospecting run
09:00  dm.process_outreach → process outreach queue
12:00  feedback.checkbacks → midday performance check
15:00  twitter.generate → afternoon content batch
18:00  metrics.winners → identify day's winners
18:30  feedback.analysis → AI analysis of performance
19:00  memory.write_daily → store day's learnings
19:30  feedback.generate_prompt → optimize tomorrow's prompts
```
