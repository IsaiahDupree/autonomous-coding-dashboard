# PRD: Content Intelligence & Media Asset Management System

## Overview
Build a **Content Intelligence System** that:
1. Audits all existing data in MediaPoster Lite's Supabase DB (publish_queue, platforms, daily_counters)
2. Pulls live post/analytics data from every connected social account across all platforms via Blotato API
3. Runs deep cross-platform analysis (performance, reach, dedup, gaps)
4. Uploads all metadata + analytics to Supabase for permanent record
5. Compares local video files on disk against already-uploaded records — deletes safe duplicates
6. Builds a content association graph so the system can make informed decisions about what to post next

## Target Repo
`/Users/isaiahdupree/Documents/Software/content-intelligence`

## Tech Stack
- Node.js (ES modules)
- Supabase JS client (project: `ivhfuhxorppptyuofbgq`)
- Blotato API (`https://backend.blotato.com/v2`, header `blotato-api-key`)
- MPLite REST API (`https://mediaposter-lite-isaiahduprees-projects.vercel.app/api`)
- Local file system scan (videos in `~/Documents/Software/MediaPoster/` and Sora bucket paths)

## Environment Variables
```
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_KEY=<service_role_key>
BLOTATO_API_KEY=blt_LwwTS0Syws9jriila9i3PVXneUAWio0RXK++Wv/T8mY=
MPLITE_URL=https://mediaposter-lite-isaiahduprees-projects.vercel.app
MPLITE_KEY=<mplite_key>
LOCAL_VIDEO_DIRS=/Users/isaiahdupree/Documents/Software/MediaPoster,/Users/isaiahdupree/Movies
```

## Supabase Tables to Create

### `ci_posts` — unified post registry across all platforms
```sql
CREATE TABLE ci_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,          -- tiktok, youtube, instagram, twitter, threads, facebook, pinterest, bluesky, linkedin
  account_id text,
  account_handle text,
  platform_post_id text UNIQUE,
  title text,
  caption text,
  media_url text,                  -- Blotato-hosted URL
  local_file_path text,            -- matched local file if found
  local_file_hash text,            -- SHA256 of local file for dedup
  status text,                     -- published, scheduled, draft
  published_at timestamptz,
  likes integer DEFAULT 0,
  views integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  engagement_rate numeric,
  platform_url text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### `ci_local_files` — index of every video file on local disk
```sql
CREATE TABLE ci_local_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text UNIQUE NOT NULL,
  file_name text,
  file_size_bytes bigint,
  file_hash text,                  -- SHA256
  duration_seconds numeric,
  resolution text,
  created_at timestamptz,
  already_uploaded boolean DEFAULT false,
  upload_post_id uuid REFERENCES ci_posts(id),
  safe_to_delete boolean DEFAULT false,
  deleted_at timestamptz,
  indexed_at timestamptz DEFAULT now()
);
```

### `ci_analysis_snapshots` — periodic cross-platform analysis reports
```sql
CREATE TABLE ci_analysis_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz DEFAULT now(),
  total_posts integer,
  total_platforms integer,
  total_local_files integer,
  duplicates_found integer,
  safe_to_delete_bytes bigint,
  top_performers jsonb,           -- top 10 posts by engagement
  platform_breakdown jsonb,       -- per-platform counts/totals
  content_gaps jsonb,             -- platforms with < N posts in last 30 days
  recommendations jsonb,          -- AI-generated next-action list
  raw_stats jsonb
);
```

## Core Modules

### 1. `lib/mplite-audit.js` — MPLite DB Audit
Pull all data currently in MPLite's Supabase tables:
- `publish_queue`: all items (pending, published, failed)
- `daily_counters`: per-platform publish counts
- `platforms`: configured platform accounts
- `activity_log`: recent 500 events

Output: summary object + upsert records into `ci_posts` where `platform_post_id` is known.

### 2. `lib/blotato-sync.js` — Live Social Account Pull
For every Blotato account (GET /v2/users/me/accounts), fetch:
- Recent posts via GET /v2/posts (paginated, last 90 days)
- Post status/metrics via GET /v2/posts/{id} for each post
- Platform-specific metrics (likes, views, comments, shares)

Upsert everything into `ci_posts`.

**Known Blotato Account IDs (pre-seeded):**
- YouTube: 228, 3370
- TikTok: 710, 4508, 4150, 4151
- Instagram: 807, 670, 1369
- Twitter: 571
- Threads: 243, 201
- Facebook: 786
- Pinterest: 173
- Bluesky: 201
- LinkedIn: 571

### 3. `lib/local-scanner.js` — Local Video File Indexer
Recursively scan `LOCAL_VIDEO_DIRS` for video files (.mp4, .mov, .avi, .mkv):
- Compute SHA256 hash of each file
- Extract metadata (size, created date, filename)
- Upsert into `ci_local_files`
- Match against `ci_posts.local_file_hash` to find already-uploaded files

Mark `already_uploaded=true` and `safe_to_delete=true` for files where:
- Hash matches a published `ci_post`
- The post status is `published` (not just scheduled/draft)

### 4. `lib/dedup-cleaner.js` — Safe Delete Engine
For files marked `safe_to_delete=true`:
- Log what WOULD be deleted (dry-run by default)
- Only delete if `--confirm-delete` flag is passed
- Record `deleted_at` in `ci_local_files`
- Never delete files without a confirmed `ci_posts` match + published status

### 5. `lib/analyzer.js` — Deep Cross-Platform Analysis
Generate `ci_analysis_snapshots`:
- Top performers by engagement_rate per platform
- Platform breakdown: posts, avg views, avg likes, posting frequency
- Content gaps: platforms with 0 posts in last 14 days
- Dedup summary: how many local files are safe to delete, bytes saved
- Recommendations array: e.g. "TikTok @dupree_isaiah hasn't posted in 7 days", "3.2GB of already-uploaded videos can be deleted"

### 6. `lib/association-graph.js` — Content Association Builder
Build relationships between:
- Local files ↔ ci_posts (same video, different platforms = same content node)
- Group posts by filename stem (e.g. `sora-video-042` → TikTok post + YouTube post + Instagram post)
- Store graph as adjacency list in `ci_analysis_snapshots.raw_stats.content_graph`

### 7. `index.js` — CLI Orchestrator
```
node index.js [command]

Commands:
  audit        Run MPLite DB audit only
  sync         Pull all Blotato account data
  scan         Index local video files
  analyze      Generate analysis snapshot
  clean        Show files safe to delete (dry-run)
  clean --confirm-delete   Actually delete safe files
  full         Run: audit → sync → scan → analyze (no delete)
  status       Show latest snapshot summary
```

## Feature List

### FEAT-001: Project scaffold
- `package.json`, `index.js`, `lib/` directory
- `.env.example` with all required vars
- `README.md` with CLI usage

### FEAT-002: MPLite DB audit (`lib/mplite-audit.js`)
- Fetch publish_queue, daily_counters, platforms, activity_log from MPLite API
- Upsert known published posts into `ci_posts`
- Print summary: total items, published count, failed count

### FEAT-003: Blotato account sync (`lib/blotato-sync.js`)
- GET /v2/users/me/accounts — enumerate all platform accounts
- GET /v2/posts — paginate last 90 days of posts per account
- Upsert into `ci_posts` with platform metrics

### FEAT-004: Local file scanner (`lib/local-scanner.js`)
- Recursive scan of LOCAL_VIDEO_DIRS
- SHA256 hash per file
- Upsert into `ci_local_files`
- Match hashes against `ci_posts` → set `already_uploaded`

### FEAT-005: Safe-delete engine (`lib/dedup-cleaner.js`)
- Dry-run report of deletable files
- `--confirm-delete` flag for actual deletion
- Never deletes without confirmed published post match

### FEAT-006: Cross-platform analyzer (`lib/analyzer.js`)
- Top performers, platform breakdown, content gaps
- Recommendations array
- Upsert into `ci_analysis_snapshots`

### FEAT-007: Content association graph (`lib/association-graph.js`)
- Group posts by filename stem across platforms
- Multi-platform node detection
- Store in snapshot

### FEAT-008: Supabase schema migration (`lib/schema.js`)
- Create `ci_posts`, `ci_local_files`, `ci_analysis_snapshots` if not exist
- Run automatically on first launch via `node index.js full`

### FEAT-009: Status dashboard CLI output
- `node index.js status` prints latest snapshot in a formatted table
- Shows: total posts by platform, local files indexed, safe-to-delete bytes, top 5 recommendations

### FEAT-010: Unit + integration tests (`tests/`)
- Mock Blotato API responses
- Test hash matching logic
- Test dry-run dedup
- Test analyzer recommendation generation

## Testing Requirements

### Unit Tests
- `mplite-audit.js`: mock MPLite API, verify upsert shape
- `blotato-sync.js`: mock GET /v2/posts response, verify pagination, upsert
- `local-scanner.js`: create temp files, verify hash + match logic
- `dedup-cleaner.js`: verify dry-run never deletes; confirm-delete path tested with temp files
- `analyzer.js`: verify recommendation generation for known gap scenarios

### Integration Tests (real Supabase, dry-run mode)
- Full `audit` → `sync` → `scan` → `analyze` pipeline
- Verify `ci_analysis_snapshots` row is created with valid JSON fields
- Verify no local files are deleted without explicit flag

## Success Criteria
- `node index.js full` completes without error against real Supabase + Blotato
- All social posts from last 90 days synced into `ci_posts`
- Local files correctly matched to uploaded posts via SHA256
- Latest `ci_analysis_snapshots` row shows accurate platform breakdown
- At least 1 test per module passing

## Priority
High — this enables informed content decisions and reclaims disk space from already-published videos.
