# PRD-084: Business Objective Self-Improvement Loop
**Priority:** P0 | **Owner:** Polsia Orchestrator + ACD Agents

## Goal
Every system — prospect finding, DM outreach, Upwork proposals, content, ads — measures its own performance against the $5K/mo revenue target and self-adjusts strategy using Claude to close the gap autonomously.

## Revenue Target Model
```
$5,000/mo target breakdown:
  AI Automation Audit+Build ($2,500)  → need 1/month minimum
  Social Growth System ($500/mo)      → need 3 recurring clients
  ACTP Setup ($1,500)                 → nice-to-have, 1–2/mo

Leading indicators:
  LinkedIn prospects found/week        → target: 200+
  DMs approved & sent/week            → target: 50+
  Upwork proposals sent/week          → target: 20+
  Response rate                       → target: >5%
  Calls booked/week                   → target: 3+
  Close rate                          → target: 33%
```

## Self-Improvement Loop (runs via Polsia Orchestrator every 6h)

### Step 1: Measure
Pull all KPIs from live data:
- `linkedin-daemon-state.json` → prospects found, CRM synced, DM queue
- `linkedin-dm-queue.json` → approved/sent/response rates
- `upwork-queue.json` → proposals sent/won
- CRMLite API → pipeline stage counts
- business-goals.json → revenue current vs target

### Step 2: Analyze (Claude Haiku)
Prompt: "Here are this week's metrics vs targets. What's the #1 bottleneck to reaching $5K/mo? What specific parameter change would have the highest ROI?"

Returns JSON: `{ bottleneck: "low_dm_send_rate", fix: "lower_approval_friction", action: "auto_approve_icp_score_>=_8", confidence: 0.85 }`

### Step 3: Execute (auto or approval)
Auto-approve actions (confidence >0.9):
- Adjust ICP threshold (±1 point)
- Rotate strategy cursor to higher-performing strategies
- Increase/decrease cycle frequency

Approval-required:
- Change message templates
- Add new search strategies
- Enable auto-send for high-ICP prospects

### Step 4: Log + Learn
- Append to `harness/improvement-log.ndjson`
- Update `business-goals.json` with current_monthly_usd from Stripe/manual entry
- Track which fixes worked (A/B style: compare week-over-week)

## Files to Create
- `harness/improvement-loop.js` — the 6h analysis + auto-adjust daemon
- `harness/launch-improvement-loop.sh`
- `harness/improvement-log.ndjson` — history of all auto-adjustments
- Backend route: `GET /api/improvement/log` + `GET /api/improvement/status`
- Dashboard: "📈 Business Goals" tab showing KPIs vs targets + recent auto-adjustments

## Strategy Library (auto-rotated based on performance)

### LinkedIn Strategies (ranked by qualified/search ratio)
Track per-strategy stats: `{ strategy_name, searches, qualified, qualified_rate, crm_synced }`
Auto-promote strategies with rate >15%, auto-retire <5%.

### DM Template A/B Testing
Track: send count, reply count, reply rate per template
Swap low performers (<3% reply rate) for AI-generated alternatives weekly.

### Upwork Category Rotation
Track: proposals sent, won, revenue per category
Focus next week on highest-converting gig type.

## Integration Points
- Polsia Orchestrator reads improvement-log to avoid redundant actions
- LinkedIn daemon reads adjusted ICP threshold from business-goals.json
- Upwork agent reads adjusted gig categories from business-goals.json
- All daemons re-read goals at cycle start (hot reload, no restart needed)

## Success Metrics
- System identifies bottleneck correctly >70% of the time
- At least 1 auto-adjustment per week that improves a KPI
- Revenue gap closes by 20%+ month-over-month
- Zero manual strategy tuning needed (fully autonomous after initial setup)

## Dependencies
- All other PRDs (080–083) running
- ANTHROPIC_API_KEY (haiku for analysis)
- business-goals.json populated with current revenue
- CRMLite API for pipeline data
