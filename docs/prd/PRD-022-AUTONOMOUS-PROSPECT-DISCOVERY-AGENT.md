# PRD-022: Autonomous Prospect Discovery Agent

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** Safari Automation (port 3106), Supabase `crm_contacts`, `crm_creators`

---

## Overview

An autonomous agent that continuously discovers qualified prospects from social platforms, deduplicates against the existing CRM, and seeds `crm_contacts` with enriched data ready for the ICP scoring pipeline. Runs on a cron schedule with zero human involvement after initial niche configuration.

---

## Goals

1. Discover 50–200 new prospects per niche per week across IG, Twitter, TikTok, Threads
2. Enrich each contact with platform handles, follower count, top posts, engagement score
3. Deduplicate against existing `crm_contacts` to avoid re-outreach
4. Auto-route newly discovered contacts to `pipeline_stage = 'new'`
5. Support multiple simultaneous niche configurations (one per service offering)

---

## Architecture

```
NicheConfig (Supabase: acq_niche_configs)
    ↓
ProspectDiscoveryAgent
    ├── MarketResearchClient      → POST /api/research/{platform}/niche (port 3106)
    ├── CreatorEnrichmentClient   → POST /api/research/{platform}/search
    ├── DeduplicationEngine       → SELECT from crm_contacts WHERE platform_handle = ?
    ├── ContactSeeder             → UPSERT crm_contacts, crm_creators
    └── DiscoveryLogger           → INSERT acq_discovery_runs (stats, errors, timing)
```

---

## Data Model

### `acq_niche_configs`
```sql
CREATE TABLE acq_niche_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                   -- "ai automation coaches"
  service_slug  text NOT NULL,                   -- which service we're selling
  platforms     text[] DEFAULT '{}',             -- ["instagram","twitter","tiktok"]
  keywords      text[] DEFAULT '{}',             -- ["ai automation","solopreneur"]
  icp_min_score integer DEFAULT 60,              -- min ICP score to qualify
  max_weekly    integer DEFAULT 100,             -- prospects to discover per week
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
```

### `acq_discovery_runs`
```sql
CREATE TABLE acq_discovery_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_config_id uuid REFERENCES acq_niche_configs(id),
  platform        text NOT NULL,
  keyword         text NOT NULL,
  discovered      integer DEFAULT 0,
  deduplicated    integer DEFAULT 0,
  seeded          integer DEFAULT 0,
  errors          jsonb DEFAULT '[]',
  duration_ms     integer,
  run_at          timestamptz DEFAULT now()
);
```

---

## API Design

### `POST /api/acquisition/discovery/run`
Trigger a discovery run for a niche config.
```json
{ "niche_config_id": "uuid", "platform": "instagram", "dry_run": false }
```
Returns: `{ run_id, discovered, seeded, errors }`

### `GET /api/acquisition/discovery/runs`
List recent discovery runs with stats.

### `POST /api/acquisition/niches`
Create or update a niche config.

### `GET /api/acquisition/niches`
List all active niche configs.

---

## Features

See `feature_list.json` → category `discovery` (AAG-001 through AAG-035)

---

## Implementation Notes

- Use `crm_brain.py` pattern: call Market Research API, parse response, upsert to Supabase
- Dedup check: `SELECT id FROM crm_contacts WHERE (instagram_handle = $1 OR twitter_handle = $1 OR tiktok_handle = $1)`
- Enrichment: call TikTok enrichment for follower counts on TikTok creators
- Rate limit: max 3 concurrent platform scans, 5s delay between requests
- On error: log to `acq_discovery_runs.errors` array, continue with next contact
