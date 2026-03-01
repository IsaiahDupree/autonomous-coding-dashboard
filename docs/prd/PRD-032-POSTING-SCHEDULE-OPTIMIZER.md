# PRD-032: Posting Schedule Optimizer

**Status:** Ready for ACD  
**Priority:** P2  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `actp_posting_schedule`, `actp_content_performance`, `actp_ab_tests`, `actp_niche_resonance`  
**Module:** `growth_orchestrator.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/scheduler/CLAUDE.md`

---

## Overview

Posting on 6 platforms without a data-driven schedule leads to viewer fatigue, saturation, and missed peak windows. This PRD defines an optimizer that learns the best posting time windows for each platform by combining: (1) historical engagement data from `actp_content_performance`, (2) A/B test timing signals from `actp_ab_tests`, and (3) Thompson Sampling to explore/exploit time slots continuously.

The scheduler ensures we never post the same concept on competing platforms within a 4-hour window, maintains platform-specific frequency limits, and alerts when any platform's daily capacity is at risk of exhaustion.

---

## Goals

1. Maintain optimal posting windows per platform in `actp_posting_schedule`
2. Use Thompson Sampling to continuously refine windows based on engagement feedback
3. Prevent cross-platform saturation: no two platforms get the same niche within 4h
4. Detect viewer fatigue: engagement decay > 30% over 7 days → reduce frequency
5. Generate a weekly posting calendar that respects all platform limits
6. CLI: `--dm-schedule` returns ranked outreach windows for the day

---

## Current Seeded Schedule (UTC)

| Platform | Posts/day | Best Hours | Days | Min Gap |
|----------|-----------|------------|------|---------|
| Twitter | 3 | 14, 17, 22 | Mon–Fri | 3h |
| Threads | 3 | 13, 17, 23 | Mon–Sat | 3h |
| Instagram | 1–2 | 15, 20 | Tue–Sat | 8h |
| TikTok | 2–3 | 12, 17, 23 | Mon–Sat | 5h |
| YouTube | 1 (2/wk) | 15, 18 | Tue, Thu | 72h |
| LinkedIn | 1 | 13, 17 | Mon–Fri | 12h |

---

## Thompson Sampling Algorithm

```python
class ThompsonSlot:
    """Beta distribution slot for a (platform, hour) pair."""
    def __init__(self):
        self.alpha = 1  # successes (high-engagement posts)
        self.beta  = 1  # failures  (low-engagement posts)

    def sample(self) -> float:
        return random.betavariate(self.alpha, self.beta)

    def update(self, reward: float):
        """reward = 1.0 if eng_score > avg, else 0.0"""
        if reward > 0.5:
            self.alpha += 1
        else:
            self.beta += 1
```

**Update cycle:** After each post's 24h checkback, compute `reward = 1 if eng_score > platform_avg_engagement else 0`. Update the slot for `(platform, post_hour)`.

**Exploration vs Exploitation:** Sample from Beta(α, β) for all candidate hours. Pick the hour with the highest sample. This naturally balances trying new times and returning to proven winners.

---

## Saturation Detection

```python
SATURATION_THRESHOLD = 0.70  # engagement drops to 70% of 30-day avg

def check_saturation(platform: str, lookback_days: int = 7) -> dict:
    """
    Pull last 7 days of actp_content_performance for platform.
    Compare avg engagement to 30-day avg.
    If ratio < 0.70, recommend reducing frequency by 1 post/day.
    """
```

---

## Cross-Platform Deduplication Rules

1. Same niche cannot appear on Twitter + TikTok within 4 hours
2. Same niche cannot appear on Instagram + Threads within 6 hours
3. YouTube posts should lead TikTok reposts by ≥ 24 hours
4. LinkedIn gets unique professional-angle content, never same as Twitter same day

---

## Data Model

### `actp_posting_schedule`
```sql
-- EXISTING TABLE
platform        text UNIQUE NOT NULL
posts_per_day   integer
best_hours      integer[]  -- UTC hours
active_days     integer[]  -- 0=Mon, 6=Sun
min_gap_hours   integer
thompson_slots  jsonb      -- {hour: {alpha, beta}} for each candidate hour
updated_at      timestamptz
```

---

## CLI Interface

```bash
python3 growth_orchestrator.py --content-mix --platform twitter
python3 growth_orchestrator.py --dm-schedule --hours 24
python3 growth_orchestrator.py --cross-platform
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain scheduler --task optimize
python3 multi_agent_dispatch.py --domain scheduler --task saturation-check
python3 multi_agent_dispatch.py --domain scheduler --task weekly-calendar
```

---

## Acceptance Criteria

- [ ] `actp_posting_schedule` has 6 platform rows with valid `best_hours` and `thompson_slots`
- [ ] After each 24h checkback, Thompson slots updated for the posted hour
- [ ] Saturation check: Telegram alert if any platform engagement drops > 30%
- [ ] Weekly calendar generated with no cross-platform conflicts
- [ ] `optimize` task updates `best_hours` to highest-sampling Thompson slot
- [ ] `--dm-schedule --hours 24` returns real contact list with optimal send times
- [ ] `actp_agent_tasks` row logged with domain=scheduler on every run

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| SCHD-001 | Time-zone aware scheduling: peak hours shift by audience location | P2 |
| SCHD-002 | Weekly calendar export as iCal / Notion integration | P3 |
| SCHD-003 | Competitor posting time analysis: pull top creator post times from research | P2 |
| SCHD-004 | Platform-specific content type scheduling (e.g., TikTok trends peak Mon morning) | P2 |
| SCHD-005 | Auto-pause platform when engagement score < 50% for 3 consecutive days | P1 |
