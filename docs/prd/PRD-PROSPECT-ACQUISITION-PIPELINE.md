# PRD: Multi-Platform Prospect Acquisition Pipeline
## Instagram → TikTok → Twitter → Threads → LinkedIn → CRM

**Status:** Draft  
**Date:** 2026-03-05  
**Source:** Founder voice memo — autonomous system vision  
**Scope:** Automated prospect mining across 5 platforms, unified CRM feed

---

## 1. Problem Statement

We need a repeatable, scalable pipeline to build a large prospect list from social platforms:

**Social platforms (Safari):** Find keyword → top posts → top creators → their follower lists = prospects  
**LinkedIn (Chrome):** Separate strategy — ICP-based people search, company pages, post engagers  
**Output:** All prospects normalized and fed into the CRM with stage tracking

This pipeline must run autonomously on a schedule, deduplicate across platforms, and improve targeting over time based on conversion data.

---

## 2. Existing Infrastructure to Build On

| Component | Location | Status |
|-----------|----------|--------|
| Market Research API | localhost:3106 | ✅ Running — keyword→posts→creators |
| Instagram DM service | localhost:3001 | ✅ Working |
| LinkedIn osascript driver | li_prospect.py | ✅ Working (55 prospects stored) |
| CRM prospect tables | Supabase: linkedin_prospects | ✅ Exists |
| actp_platform_creators | Supabase | ✅ Exists |
| FeedbackLoopExecutor | workflow_executors.py | ✅ Pattern |

---

## 3. Features

### PAP-001 — Keyword → Creator Pipeline (Instagram, TikTok, Twitter, Threads)

For each platform:
1. Accept `{ keyword, niche, limit }` input
2. Search keyword → collect top N posts by engagement (likes + comments + shares)
3. From top posts → extract unique creator handles
4. For each creator → extract their follower list (scroll + extract usernames/handles)
5. Score each follower by: follower count, bio keywords match, engagement rate on their posts
6. Store in `actp_prospects` with: handle, platform, source_creator, source_keyword, score, status=new

**Rate limits:** Max 200 followers per creator, max 10 creators per keyword run, jitter between requests

### PAP-002 — Creator Follower Extractor

Browser action: `{ platform, action: "extract_followers", params: { handle, limit: 200 } }`

- Navigate to creator profile
- Open followers list
- Scroll + extract: handle, display_name, bio snippet, follower_count, following_count
- Stop when limit reached or end of list
- Return structured array

Platforms supported: Instagram, TikTok, Twitter, Threads (each has different DOM structure — use platform-specific selectors)

### PAP-003 — LinkedIn Prospect Strategy

Chrome agent (BAC-004) runs these discovery strategies:
- **Strategy A:** ICP keyword search ("founder saas b2b", "solopreneur ai tools", etc.) → extract profiles
- **Strategy B:** Find post by ICP keyword → extract all people who liked/commented
- **Strategy C:** Company page → extract employees matching ICP title filters

Score each LinkedIn prospect: title_match (40%), company_size (20%), engagement_signal (20%), mutual_connections (20%)

Stores in `actp_prospects` with platform=linkedin, LinkedIn-specific fields in metadata JSON

### PAP-004 — Unified Prospect Table (Supabase)

New table: `actp_prospects`
```sql
id, handle, display_name, platform, profile_url,
source_keyword, source_creator, source_strategy,
follower_count, bio, score (0-100),
status (new | qualified | not_fit | dm_sent | responded | crm_added),
metadata jsonb, created_at, updated_at
```

Deduplication: unique on (handle, platform) — upsert on conflict, update score + source

### PAP-005 — Prospect Scorer

Scoring model per platform:
- **Instagram/TikTok/Threads:** follower_count_tier (5k-50k = high) + bio_keyword_match + engagement_rate
- **Twitter:** follower_count + tweet_frequency + bio_keyword_match + list_memberships
- **LinkedIn:** title_match + company_size + recent_activity + mutual_connections

Score 0-100, threshold for CRM push: score ≥ 65

### PAP-006 — CRM Feed

When prospect.score ≥ 65 AND status = "new":
1. Push to CRM (existing `crm_contacts` table or CRMLite)
2. Set status = "crm_added"
3. Trigger DM outreach workflow (if ENABLE_DM_OUTREACH=true)
4. Log to `actp_prospect_events`

CRM fields: name, handle, platform, profile_url, score, source, notes

### PAP-007 — Acquisition Schedule (Cron)

| Job | Schedule | Description |
|-----|----------|-------------|
| instagram_prospect_sweep | Daily 2AM | keyword → creators → followers |
| tiktok_prospect_sweep | Daily 3AM | keyword → creators → followers |
| twitter_prospect_sweep | Daily 4AM | keyword → creators → followers |
| threads_prospect_sweep | Daily 5AM | keyword → creators → followers |
| linkedin_prospect_sweep | Daily 6AM | ICP search + post engagers |
| prospect_score_run | Daily 7AM | re-score all new prospects |
| crm_push | Daily 8AM | push qualified to CRM |

### PAP-008 — Prospect Intelligence Loop

After DM sent → track: opened (proxy: reply), responded, meeting booked, closed
Feed conversion data back to scorer: if prospects from source X convert at 3x rate → boost source X score weight

---

## 4. Implementation Order

1. PAP-004: Create `actp_prospects` Supabase table
2. PAP-001: Keyword→Creator pipeline using existing Market Research API (3106)
3. PAP-002: Follower extractor browser action per platform
4. PAP-003: LinkedIn Chrome prospect strategies
5. PAP-005: Prospect scorer
6. PAP-006: CRM feed + DM trigger
7. PAP-007: Cron schedule registration
8. PAP-008: Conversion feedback loop

---

## 5. Key Files to Create/Modify

```
actp-worker/
  prospect_pipeline.py       # NEW — orchestrates full pipeline
  prospect_scorer.py         # NEW — scoring models per platform
  prospect_crm_pusher.py     # NEW — CRM feed logic

Safari Automation/packages/
  instagram-comments/        # EXTEND — add extract_followers action
  tiktok-comments/           # EXTEND — add extract_followers action
  twitter-comments/          # EXTEND — add extract_followers action
  threads-comments/          # EXTEND — add extract_followers action
  linkedin-chrome/           # NEW (see BAC-004) — prospect strategies

supabase/migrations/
  YYYYMMDD_prospects.sql     # NEW — actp_prospects table
```

---

## 6. Acceptance Criteria

- [ ] `POST /api/browser/command { platform: "instagram", action: "keyword_to_prospects", params: { keyword: "ai automation", limit: 100 }}` returns 100 scored prospects
- [ ] All 5 platforms upsert to `actp_prospects` with no duplicates
- [ ] Prospects with score ≥ 65 appear in CRM within 1 cycle of crm_push cron
- [ ] LinkedIn Chrome agent completes Strategy A search returning ≥ 20 prospects per run
- [ ] Cron jobs run on schedule without manual intervention
