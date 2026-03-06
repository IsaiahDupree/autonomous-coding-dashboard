# PRD-081: Self-Improving Strategy Loop
## System that measures outcomes and automatically improves its own strategies

**Status:** Draft
**Date:** 2026-03-05
**Priority:** P2

---

## 1. What This Is

The autonomous system must **improve itself** over time. This PRD defines how:
- After each batch of browser sessions, outcomes are measured
- Patterns are identified: what's working, what's not
- Strategy configs are automatically updated
- If code needs to change, failure events are emitted for the self-healer
- Business goals are used as the north star for what "better" means

---

## 2. Improvement Cycle (already partially built)

```
  Browser sessions execute
         ↓
  Results in actp_browser_sessions (result JSONB)
         ↓
  Every 6h: runSelfImprovement() fires (browser-session-daemon.js)
         ↓
  Claude Haiku analyzes 24h of results
         ↓
  ┌─────────────────────────────────────────────┐
  │  For each platform:action combo:            │
  │  - success_rate too low? → adjust params    │
  │  - results poor quality? → change strategy  │
  │  - platform down often? → emit failure event│
  │  - new action type needed? → emit feature   │
  └─────────────────────────────────────────────┘
         ↓
  actp_strategy_configs updated (used by next booking cycle)
         ↓
  actp_failure_events for code issues (self-healer picks up)
         ↓
  actp_improvement_events logged for dashboard
```

---

## 3. Features

### SIL-001 — Outcome Tracking Schema
Every session result must include structured outcome data so improvement loop can measure impact:

```typescript
interface SessionResult {
  prospects_found?: number;
  prospects_qualified?: number;  // met ICP score threshold
  items_extracted?: number;
  action_success: boolean;
  platform_error?: string;
  rate_limited?: boolean;
  selector_failed?: boolean;  // DOM change indicator
}
```

Safari services updated to return this structured format.

### SIL-002 — Strategy Version Control
When improvement loop updates a strategy:
- Increment `version` in `actp_strategy_configs`
- Store old version in `params.history[]`
- A/B test new vs old for 48h before full rollout
- If new version performs worse → revert automatically

### SIL-003 — Goal-Aware Scoring
The improvement loop knows which goal each session serves (`goal_tag`):
- Revenue sessions: scored by qualified prospects discovered + Upwork gig quality
- Audience sessions: scored by prospect count × ICP score
- Engagement: scored by inbox reply rate

Scoring feeds back to booking frequency decisions.

### SIL-004 — Code Change Detection
When Haiku identifies that a problem requires code changes:
1. Emit `actp_failure_events` row with `error_type: 'improvement_needed'`
2. Self-healer classifies it
3. If `dom_change`: Claude Code repair agent updates selectors
4. If `new_feature_needed`: Create Overstory seeds issue (`sd create`)
5. If `strategy_only`: Update `actp_strategy_configs` only (no code change)

### SIL-005 — Improvement Dashboard Panel
Add to orclit dashboard (ORC-005):
- Last improvement run timestamp
- Strategies updated (with before/after params)
- Code fixes requested
- 7-day trend: success rate per platform

### SIL-006 — Weekly Strategy Report (Telegram)
Every Sunday 8am:
```
📊 Weekly Autonomous System Report

Sessions completed: 142
Success rate: 78% (↑12% vs last week)
Best platform: Twitter (89% success)
Worst platform: LinkedIn (58% — Chrome CDP issues)

Prospects found: 234 → CRM: 89 qualified (ICP score ≥65)
Upwork gigs found: 12 → proposals ready: 4 (awaiting approval)

Strategy changes made this week:
- instagram: Added 3 fallback selectors (selector_failed rate dropped 40%)
- twitter: Increased keyword diversity → prospect quality +15%
- upwork: Narrowed to React/Next.js skills → gig fit score +25%

Code fixes applied: 2 (dom_change)
Human attention needed: 1 (LinkedIn Chrome login expired)
```

---

## 4. Acceptance Criteria

- [ ] All browser session results include structured outcome data (SIL-001)
- [ ] Strategy configs updated automatically after each improvement cycle
- [ ] Version history preserved in strategy_configs.params.history
- [ ] Code-change failures routed to self-healer via actp_failure_events
- [ ] Dashboard shows 7-day trend per platform
- [ ] Weekly Telegram report sent every Sunday
- [ ] After 2 weeks: at least 1 strategy measurably improved (success rate +10%)
