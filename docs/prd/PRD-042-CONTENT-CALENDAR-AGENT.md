# PRD-042 — Content Calendar Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `content_calendar`  
**Module:** `actp-worker/content_calendar_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Tables:** actp_posting_schedule, actp_content_performance, actp_niche_resonance, actp_ab_tests

---

## Overview

The Content Calendar Agent manages the full cross-platform content publishing calendar. It translates niche resonance data, A/B test results, and posting schedule windows into a concrete daily queue of posts — preventing audience saturation, ensuring format diversity, rotating offer topics, and auto-filling gaps when the queue runs dry. It bridges the gap between content production (Remotion, drafts) and distribution (Blotato, Safari posting).

---

## Goals

1. Generate a 7-day rolling content calendar for all 6 platforms (Twitter, Threads, TikTok, Instagram, YouTube, LinkedIn).
2. Enforce minimum gaps between posts on each platform to prevent view fatigue.
3. Rotate content formats (educational, entertaining, promotional, personal) per the target content mix.
4. Auto-fill calendar gaps by pulling briefs from `actp_niche_resonance` and queuing Remotion renders.
5. Respect A/B test windows (don't post competing variants in overlapping windows).
6. Flag over-saturation when posting density exceeds optimal frequency for any niche.
7. Export calendar to Supabase (`actp_content_calendar`) for dashboard visibility.
8. Send a weekly calendar preview to Telegram every Monday at 7 AM.

---

## Architecture

```
multi_agent_dispatch.py
  └─► content_calendar_agent.py
        ├─► actp_posting_schedule  (optimal windows + gaps)
        ├─► actp_niche_resonance   (best niche × format combos)
        ├─► actp_content_performance (what's performed recently)
        ├─► actp_ab_tests          (active test windows)
        ├─► actp_gen_jobs          (pending Remotion renders)
        ├─► actp_content_calendar  (output: scheduled posts)
        └─► Telegram (weekly preview, saturation alerts)
```

---

## Content Mix Targets (Per Platform)

| Format | Twitter | TikTok | Instagram | Threads | YouTube | LinkedIn |
|--------|---------|--------|-----------|---------|---------|---------|
| Educational | 40% | 30% | 25% | 45% | 60% | 50% |
| Entertaining | 20% | 40% | 35% | 25% | 20% | 10% |
| Promotional | 15% | 15% | 20% | 10% | 10% | 20% |
| Personal | 25% | 15% | 20% | 20% | 10% | 20% |

---

## Offer Rotation (Weekly)

Ensure each offer gets visibility across all platforms each week:
- `safari_automation` — Mon/Thu
- `creator_growth` — Tue/Fri  
- `ai_automation` — Wed/Sat
- `personal_brand` — Tue/Sun

---

## Supabase Tables

### `actp_content_calendar` (new)
```sql
CREATE TABLE actp_content_calendar (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform       TEXT NOT NULL,
  scheduled_for  TIMESTAMPTZ NOT NULL,
  content_type   TEXT,    -- educational | entertaining | promotional | personal
  offer_tag      TEXT,
  niche          TEXT,
  hook           TEXT,
  brief_summary  TEXT,
  gen_job_id     UUID REFERENCES actp_gen_jobs(id),
  blotato_post_id TEXT,
  status         TEXT DEFAULT 'planned',  -- planned | rendered | posted | cancelled
  ab_test_id     UUID REFERENCES actp_ab_tests(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, scheduled_for)
);
CREATE INDEX ON actp_content_calendar(platform, scheduled_for);
CREATE INDEX ON actp_content_calendar(status);
```

### `actp_calendar_saturation` (new)
```sql
CREATE TABLE actp_calendar_saturation (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform    TEXT,
  niche       TEXT,
  window_start TIMESTAMPTZ,
  window_end   TIMESTAMPTZ,
  post_count  INTEGER,
  saturation_score NUMERIC(5,2),
  alert_sent  BOOLEAN DEFAULT false,
  checked_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Saturation Detection Logic

```python
SATURATION_THRESHOLDS = {
    "twitter":   {"posts_per_day": 3, "same_niche_per_day": 2},
    "tiktok":    {"posts_per_day": 2, "same_niche_per_day": 1},
    "instagram": {"posts_per_day": 1, "same_niche_per_week": 3},
    "threads":   {"posts_per_day": 3, "same_niche_per_day": 2},
    "youtube":   {"posts_per_week": 2, "same_niche_per_week": 1},
    "linkedin":  {"posts_per_day": 1, "same_niche_per_week": 2},
}
```

Alert fires if: `upcoming_posts_in_window / threshold_max > 0.85`

---

## CLI Interface

```bash
python3 content_calendar_agent.py --week                   # generate 7-day calendar
python3 content_calendar_agent.py --today                  # today's post queue
python3 content_calendar_agent.py --gaps                   # find empty slots in next 7 days
python3 content_calendar_agent.py --fill-gaps              # auto-fill gaps with top niche content
python3 content_calendar_agent.py --saturation             # saturation analysis per platform
python3 content_calendar_agent.py --mix                    # actual vs target content mix
python3 content_calendar_agent.py --preview                # 7-day calendar summary (Telegram)
python3 content_calendar_agent.py --reschedule PLATFORM    # re-optimize a platform's schedule
python3 content_calendar_agent.py --cancel POST_ID         # cancel a planned post
python3 content_calendar_agent.py --status                 # calendar health dashboard
python3 content_calendar_agent.py --next-posts 5           # next 5 posts across all platforms
python3 content_calendar_agent.py --offer-rotation         # verify offer rotation balance
```

### Dispatch Integration
```python
AGENTS["content_calendar"] = {
    "week":     ("content_calendar_agent.py", ["--week"]),
    "today":    ("content_calendar_agent.py", ["--today"]),
    "gaps":     ("content_calendar_agent.py", ["--gaps"]),
    "fill":     ("content_calendar_agent.py", ["--fill-gaps"]),
    "preview":  ("content_calendar_agent.py", ["--preview"]),
    "status":   ("content_calendar_agent.py", ["--status"]),
}
```

---

## Calendar Generation Algorithm

```
1. Pull optimal windows from actp_posting_schedule
2. Pull top niche × format combos from actp_niche_resonance
3. For each platform × day:
   a. Check existing calendar entries (avoid duplicates)
   b. Select niche/format respecting content mix targets
   c. Respect min_gap_hours between posts
   d. Rotate offer tags per weekly rotation plan
   e. Check active A/B tests (don't double-book a test window)
   f. Insert planned entry to actp_content_calendar
4. Run saturation check
5. If gaps remain after fill: queue Remotion brief for missing content
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `calendar_weekly_preview` | Mon 7 AM | `--preview` → Telegram |
| `calendar_fill_gaps` | Daily 6 AM | `--fill-gaps` |
| `calendar_saturation_check` | Every 4h | `--saturation` |
| `calendar_mix_report` | Daily 9 AM | `--mix` |

---

## Telegram Alerts

```
📅 Weekly Content Calendar Preview — Mar 2–8, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total planned: 18 posts across 6 platforms
Mon: TW×2, TK×1, TH×2
Tue: TW×2, IG×1, LI×1, TH×1
Wed: TW×2, TK×1, TH×2, YT×1
...
Gaps: 3 (2×YouTube, 1×LinkedIn) → auto-filling
Saturation risk: None
Content mix: ✅ Educational 41%, 🟡 Promo 18% (target 15%)
```

---

## Acceptance Criteria

- [ ] `--week` generates ≥ 14 calendar entries across 6 platforms
- [ ] Entries respect `min_gap_hours` from `actp_posting_schedule`
- [ ] `--saturation` correctly identifies when niche/platform density exceeds threshold
- [ ] `--fill-gaps` creates Remotion render briefs for empty slots
- [ ] `--mix` computes actual vs target percentages per format
- [ ] `--preview` sends correctly formatted Telegram message
- [ ] `--offer-rotation` validates all 4 offers appear in 7-day window
- [ ] UNIQUE constraint on `(platform, scheduled_for)` prevents double-booking
- [ ] A/B test active windows are respected (no conflicts)
- [ ] `multi_agent_dispatch.py --domain content_calendar --task preview` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `content_calendar_agent.py` with all CLI flags
2. Create Supabase migration for `actp_content_calendar` and `actp_calendar_saturation`
3. Implement calendar generation algorithm with niche rotation
4. Add saturation detection with configurable thresholds per platform
5. Implement `--fill-gaps` which reads niche resonance and creates brief-to-render pipeline entries
6. Add offer rotation validation
7. Send weekly Telegram preview with per-day breakdown
8. Add `--reschedule PLATFORM` to re-optimize a single platform's calendar
