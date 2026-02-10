# ShortsLinker - YouTube Shorts to Long-Form Video Linking Tool

## AUTONOMOUS MODE — DO NOT ASK WHAT TO WORK ON

You are running in a fully autonomous session with NO human interaction. **Never ask what to focus on.** Instead:
1. Read `feature_list.json` and find the FIRST feature where `"passes": false`
2. Implement that feature following TDD (write test → implement → verify)
3. Set `"passes": true` in `feature_list.json` when done
4. Commit your changes
5. Move to the next failing feature

**Do NOT stop to ask questions. Do NOT present options. Just pick the next failing feature and implement it.**

## Project Overview
ShortsLinker is a local desktop tool that scans a creator's YouTube channel, matches Shorts to their corresponding long-form videos, and bulk-inserts the correct long-form links into Shorts descriptions. It solves the creator ops gap where Shorts don't automatically link to their source long-form videos.

## Tech Stack
- **Desktop Framework:** Electron or Tauri
- **Frontend:** React + TypeScript + TailwindCSS
- **Backend Service:** Node.js/TypeScript
- **Database:** SQLite (local)
- **API:** YouTube Data API v3
- **Auth:** Google OAuth 2.0 (loopback)
- **Token Storage:** OS Keychain / encrypted local file

## Primary PRD
- `PRD.md` - Complete product requirements with epics, user stories, and wizard flow

## Feature Categories
1. **Auth (AUTH-*)** - OAuth, token storage, multi-channel support
2. **Scan (SCAN-*)** - Channel indexing, incremental scanning
3. **Classification (CLASS-*)** - Shorts detection heuristics
4. **Matching (MATCH-*)** - Title similarity, keyword overlap, confidence scoring
5. **Review (REVIEW-*)** - Match review table, bulk actions
6. **Link Strategy (LINK-*)** - Description updates, templates
7. **Apply (APPLY-*)** - Safe updates, batch processing, quota handling
8. **Logging (LOG-*)** - Before/after logging, rollback support
9. **Database (DB-*)** - SQLite schema for videos, matches, jobs, change_log
10. **UI (UI-*)** - 11-screen wizard flow
11. **Licensing (LICENSE-*)** - License keys, trial mode

## Key Flows

### 1. Channel Scan Flow
```
OAuth Login → Select Channel → Scan Uploads → Index Videos → Classify Shorts/Long
```

### 2. Matching Flow
```
Title Similarity → Keyword Overlap → Publish Proximity → Confidence Score → Candidate Ranking
```

### 3. Apply Flow
```
Fetch Existing Snippet → Modify Description → Include Required Fields → Batch Update → Log Changes
```

## Implementation Priority

### Phase 1 - Core Infrastructure (P0)
- AUTH-001, AUTH-002, AUTH-004: OAuth + token storage
- SCAN-001, SCAN-002: Channel scanning
- CLASS-001, CLASS-002, CLASS-005: Basic classification
- DB-001 through DB-004: SQLite schema

### Phase 2 - Matching Engine (P0)
- MATCH-001 through MATCH-005: Scoring algorithm
- REVIEW-001 through REVIEW-003: Review table

### Phase 3 - Safe Apply (P0)
- APPLY-001 through APPLY-006: Safe update algorithm
- LINK-001, LINK-004: Description updates + templates
- LOG-001 through LOG-003: Logging

### Phase 4 - UI Wizard (P0)
- UI-001, UI-002: Wizard flow + desktop shell

### Phase 5 - Polish (P1/P2)
- Incremental scanning, rollback execution
- License validation, auto-updates
- Pro features (highlights, playlists)

## Environment Variables
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## API Quota Considerations
- `videos.list` = 1 unit
- `videos.update` = 50 units
- Default quota: 10,000 units/day = ~200 updates/day
- Tool should throttle or support "Bring Your Own GCP Project"

## Critical Safe Update Pattern
```typescript
// 1. Fetch existing video
const video = await youtube.videos.list({
  part: ['snippet', 'status', 'contentDetails'],
  id: [videoId]
});

// 2. Modify only description
const updatedSnippet = {
  ...video.snippet,
  description: newDescription
};

// 3. Update with required fields
await youtube.videos.update({
  part: ['snippet'],
  requestBody: {
    id: videoId,
    snippet: updatedSnippet // includes title, categoryId
  }
});
```

## Success Metrics
- % Shorts successfully linked
- Time saved vs manual linking
- Apply job success rate
- Support tickets per 100 installs

## GitHub Repository
https://github.com/IsaiahDupree/ShortsLinker
