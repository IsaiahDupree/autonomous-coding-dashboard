# PRD-023: Engagement Warmup System

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** PRD-022 (Discovery), Safari comment services (3004/3005/3006/3007), `crm_contacts`

---

## Overview

Before sending a cold DM, the Warmup Agent posts 2–3 genuine comments on a prospect's recent posts over 3–5 days. This builds recognition, reduces DM rejection rates, and improves reply rates by ~40%. The system is fully autonomous: it reads `pipeline_stage = 'qualified'`, schedules comments with natural human-like timing gaps, tracks what was commented, and advances the contact to `warming` → `ready_for_dm` when the warmup window closes.

---

## Goals

1. Auto-schedule 2–3 comments per prospect spread across 3–5 days
2. Generate contextually relevant comments using Claude (not generic praise)
3. Never comment twice on the same post
4. Enforce per-platform rate limits (max 30 comments/day/platform)
5. Advance `pipeline_stage` to `ready_for_dm` when warmup complete
6. Track all comments in `crm_messages` (type = 'comment')

---

## Architecture

```
WarmupScheduler (cron: daily 8AM)
    ↓ reads pipeline_stage = 'qualified'
WarmupAgent
    ├── PostFetcher         → crm_market_research (cached) or live scrape
    ├── CommentGenerator    → Claude API, post text + niche context → comment
    ├── CommentRateLimiter  → max N comments/day/platform, min 18h between same account
    ├── CommentSender       → POST /api/{platform}/comments/post (3005/3006/3007/3004)
    ├── WarmupTracker       → INSERT crm_messages, UPDATE acq_warmup_schedules
    └── StageAdvancer       → UPDATE crm_contacts SET pipeline_stage = 'ready_for_dm'
                              when warmup_comment_count >= warmup_target
```

---

## Data Model

### `acq_warmup_schedules`
```sql
CREATE TABLE acq_warmup_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid REFERENCES crm_contacts(id),
  platform            text NOT NULL,
  post_url            text NOT NULL,
  scheduled_at        timestamptz NOT NULL,
  comment_text        text,
  sent_at             timestamptz,
  comment_id          text,
  status              text DEFAULT 'pending',   -- pending|sent|failed|skipped
  skip_reason         text,
  created_at          timestamptz DEFAULT now()
);
```

### `acq_warmup_configs`
```sql
CREATE TABLE acq_warmup_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_config_id     uuid REFERENCES acq_niche_configs(id),
  comments_target     integer DEFAULT 2,        -- comments to send before DM
  window_days         integer DEFAULT 5,        -- spread over N days
  min_gap_hours       integer DEFAULT 20,       -- min hours between comments to same account
  use_ai_comments     boolean DEFAULT true,
  comment_tone        text DEFAULT 'insightful', -- insightful|encouraging|curious
  platforms_priority  text[] DEFAULT '{"twitter","instagram","tiktok"}',
  created_at          timestamptz DEFAULT now()
);
```

---

## Comment Generation Prompt (Claude)

```
You are engaging with a creator/founder on {platform}.

Their recent post: "{post_text}"
Their niche: {niche}
Your brand voice: thoughtful, specific, adds value — never generic

Write a 1-2 sentence comment that:
1. References something specific from their post (not just "great post!")
2. Adds a genuine insight, question, or perspective
3. Sounds like a peer, not a fan
4. Does NOT pitch anything

Comment:
```

---

## API Design

### `POST /api/acquisition/warmup/schedule`
Schedule warmup for a batch of qualified contacts.
```json
{ "contact_ids": ["uuid"], "override_config": {} }
```

### `POST /api/acquisition/warmup/execute`
Execute pending warmup comments (called by cron).
```json
{ "platform": "twitter", "limit": 10 }
```

### `GET /api/acquisition/warmup/status`
```json
{ "pending": 12, "sent_today": 8, "completed": 45, "by_platform": {} }
```

---

## Features

See `feature_list.json` → category `warmup` (AAG-036 through AAG-070)

---

## Implementation Notes

- Pull prospect's recent posts from `crm_market_research` first (avoid extra scrape)
- If no cached posts, call Market Research API live before scheduling
- Twitter comment endpoint: `POST http://localhost:3007/api/twitter/comments/post` body `{postUrl, text}` or `{postUrl, useAI: true}`
- Instagram: `POST http://localhost:3005/api/instagram/comments/post`
- TikTok: `POST http://localhost:3006/api/tiktok/comments/post`
- Threads: `POST http://localhost:3004/api/threads/comments/post`
- Rate limit guard: check `acq_warmup_schedules` count for today before sending
- On `useAI: true` (Twitter only): let the comment service generate — skip Claude generation
