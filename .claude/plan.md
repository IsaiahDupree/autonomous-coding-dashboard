# Programmatic Creative Testing System - Implementation Plan

## Current State Assessment

The PCT system is **substantially built** with a complete architecture spanning backend, database, and frontend.

### Already Implemented
- **Backend API** (`backend/src/routes/pct.ts`): Full CRUD for brands, products, VoC, USPs, angles, hooks, templates, generated ads, video scripts, plus 50+ advanced endpoints (compliance, audiences, budget rules, automation, AI features)
- **AI Generation Service** (`backend/src/services/ai-generation.ts`): Claude-powered USP/angle/hook generation with full Eugene Schwartz framework support
- **Database** (`backend/prisma/schema.prisma`): 15+ PCT models with relationships
- **Frontend API Client** (`dashboard/lib/creative-api.ts`): 100+ typed API methods
- **Frontend Pages** (all functional):
  - Overview dashboard with stats + workflow visualization
  - Brands & Products CRUD with product catalog
  - Brand Detail with VoC gold nuggets, CSV import, AI pain point/benefit extraction
  - USPs & Angles with manual + AI generation, angle approval
  - Hook Generator with full parameter config, matrix mode, advanced params (triggers, emotions, copywriter styles)
  - Hook Library with filtering, inline editing, tags, rating, bulk actions, CSV/JSON export
  - Templates with text zone definition, preview overlay, category management
  - Ad Gallery with canvas rendering, multi-size generation, batch processing, ZIP download
  - Video Scripts with generation, section-by-section editing, duration/narrator config

## What's Missing (Prioritized)

### Phase 1: Meta Deployment Pipeline (Highest Business Value)
**Why:** The core loop of "generate -> review -> deploy" is incomplete without Meta integration.

**New files:**
- `dashboard/app/creative-testing/deploy/page.tsx` - Meta connection + ad deployment

**Implementation:**
1. Meta access token input field + verification call to `/api/pct/meta/verify`
2. Campaign/Ad Set browser synced from Meta (existing API: `/api/pct/meta/campaigns`, `/api/pct/meta/ad-sets`)
3. Select approved ads from gallery -> choose target ad set -> push to Meta
4. Real-time push progress with rate limiting status (1.5s delay, ~40/min)
5. Deployment history table with status (pending, queued, pushing, success, failed)
6. Ad review status sync from Meta

**Nav addition to layout.tsx:**
```
{ href: '/creative-testing/deploy', label: 'Deploy', icon: '↗' }
```

### Phase 2: Analytics & Performance Dashboard
**Why:** Without performance tracking, can't close the iteration loop.

**New files:**
- `dashboard/app/creative-testing/analytics/page.tsx` - Performance dashboard

**Implementation:**
1. Performance data import (CSV upload with columns: ad_id, impressions, clicks, ctr, cpc, spend, conversions, roas)
2. Key metrics display table per hook/ad (sortable by CTR, CPC, ROAS, impressions)
3. Parameter correlation analysis: which framework/awareness/sophistication level produces best results
4. Winner identification: top hooks, top USPs, top angles, top templates
5. Charts: performance trends, parameter comparison heatmap
6. CSV export of all analytics data

**Nav addition to layout.tsx:**
```
{ href: '/creative-testing/analytics', label: 'Analytics', icon: '◔' }
```

### Phase 3: Iteration Workflows
**Why:** Systematically scale winners.

**Changes to existing files:**
- Add "Iterate on Winner" actions to analytics page and hook library

**Implementation:**
1. "Create More Like This" button on winning hooks -> pre-fills hook generator with same parameters
2. "Expand Winning Angle" -> generates new hooks using the same angle but different frameworks
3. "New Templates for Winner" -> takes winning hook to ad generation with template selection
4. Iteration history tracking with parent-child relationships

### Phase 4: Settings & Configuration
**New files:**
- `dashboard/app/creative-testing/settings/page.tsx`

**Implementation:**
1. API key management (Anthropic key display/update, Meta token)
2. Default parameter presets (save/load common parameter combos)
3. AI model selection (Claude Sonnet vs Haiku vs GPT-4o)
4. Notification preferences

## Technical Approach
- Follow existing patterns: `'use client'` pages, `pctApi` from `@/lib/creative-api`, `react-hot-toast`
- All API methods already exist in `creative-api.ts` for backend endpoints
- Dark theme with purple accent consistent across all pages
- Tailwind CSS v4 for styling

## Technical Requirements
- PostgreSQL on port 5433 with database `acd_database`
- Redis on port 6379
- `ANTHROPIC_API_KEY` environment variable for AI generation
- Backend on port 3434, frontend on port 3535
