# Programmatic Creative Testing - Implementation Plan

## Current State Assessment

The PCT system has a comprehensive foundation already built across all P0 and P1 features:

### Already Built & Working

**Frontend (`pct.html`, `pct.js` ~2632 lines, `pct.css` ~1568 lines):**
- **Tab 1 - Context & Setup**: Brand CRUD, Product CRUD, VoC gold nugget entry with sentiment/source tagging
- **Tab 2 - USPs & Angles**: Manual USP entry, AI USP generation, AI angle generation with categories, expand/collapse tree, angle approval toggle
- **Tab 3 - Hook Generation**: Full parameter selection (8 frameworks with examples, 5 awareness levels, 5 sophistication levels), batch size selector (5/10/25/50), Matrix Mode for multi-parameter cross-product generation with progress tracking
- **Tab 4 - Hook Review**: Card-based display, approve/reject/rate (1-5 stars), inline editing, debounced search, multi-filter toolbar (status/framework/awareness/sophistication), bulk operations, CSV export, pagination, keyboard shortcuts (A=approve, R=reject), "More like this" variation generation
- **Tab 5 - Ad Creative**: 4 sub-tabs:
  - **Templates**: Upload with drag, size presets (1080x1080, 1080x1350, 1080x1920, 1200x628), grid display
  - **Zone Editor**: Canvas-based text zone drawing, drag-to-resize, properties panel (font, size, weight, color, alignment, maxLines), preview with sample text
  - **Generate Ads**: Select templates + approved hooks, batch client-side canvas rendering with progress bar, auto-save to backend
  - **Gallery**: Grid view, approve/reject, bulk select, filter by status, lightbox preview, individual download, ZIP export (via JSZip)

**Backend (`backend/src/routes/pct.ts`, `backend/src/services/ai-generation.ts`):**
- Full REST API for all entities with proper error handling
- AI generation via Claude Sonnet 4 for USPs, marketing angles, and hooks
- Prisma schema with all PCT models (Brand, Product, VoC, USP, MarketingAngle, Hook, Template, GeneratedAd)
- Stats endpoint with counts across all entities
- Hooks search with pagination, sorting, filtering

### What's NOT Built Yet

**P2 - Ad Deployment (Module 7):**
- Meta Business OAuth flow
- Campaign/Ad Set browser
- Batch ad push with rate limiting
- Ad status sync from Meta

**P3 - Analytics & Iteration (Module 8):**
- Performance data import from Meta
- Insights dashboard (top USPs, angles, frameworks)
- Iteration workflows ("create more like winner")

**P4 - Video Script Generation (Module 6):**
- Script generation from winning hooks (Hook -> Lid -> Body -> CTA)
- Script editor with section editing
- Duration/style/narrator configuration

**P4 - Competitor Intelligence (Module 1.4):**
- Not planned for MVP

---

## Proposed Implementation: Next Phase

### Option A: Video Script Generation (P4 Feature - High User Value, No External Dependencies)
Add AI-powered video ad script generation from winning hooks. This extends the existing generation pipeline without requiring Meta API integration.

**New features:**
1. Add "Scripts" sub-tab to Ad Creative tab
2. AI endpoint to generate full video scripts (Hook -> Lid -> Body -> CTA)
3. Script editor with section-by-section editing
4. Duration targeting (30s, 60s, 90s)
5. Narrator style and psychological trigger selection
6. Reading time estimates and word counts
7. Copy/export to clipboard

### Option B: Analytics & Iteration Dashboard (P3 - Core Business Value)
Build the insights layer that ties performance back to parameters, even without Meta API (manual data entry initially).

**New features:**
1. Manual performance data entry (CTR, CPC, ROAS per hook/ad)
2. Parameter correlation dashboard (which USP/angle/framework performs best)
3. "Create more like winner" workflow
4. Visual charts for performance trends

### Option C: Meta Deployment Integration (P2 - Complete Pipeline)
Connect to Meta Marketing API to push approved ads live.

**New features:**
1. OAuth flow for Meta Business accounts
2. Campaign/Ad Set browser
3. Batch ad push with queue and rate limiting
4. Status tracking and sync

### Option D: Polish & QA Existing Features
Verify and fix the full existing flow, add missing P1 features like multi-size generation, hook tagging.

---

## Recommended: Option A (Video Scripts) + Option D (Polish)

Start with Option D to ensure existing features work end-to-end, then implement Option A since it:
- Adds significant user value (video ads are high-performing)
- Leverages existing AI generation infrastructure
- Requires no external API integration
- Completes the creative generation story (static + video)

---

## Completed: Option A - Video Script Generation

**Implemented features:**
1. New "Video Scripts" tab (Tab 6) in the PCT interface
2. PctVideoScript Prisma model with full schema (hook, lid, body, cta sections)
3. AI-powered script generation via Claude (Hook -> Lid -> Body -> CTA structure)
4. Duration targeting: 15s, 30s, 60s, 90s with word count guidelines
5. 8 narrator style options (Conversational, Authority, Storyteller, etc.)
6. Inline section-by-section editing (contenteditable fields)
7. Script approve/reject/delete workflow
8. Filter by status and duration
9. Copy full script to clipboard
10. Word count and estimated read time display
11. Source hook linkage shown on each script
12. Stats bar updated with script count
13. Full REST API: generate, list, get, update, delete

**Files modified:**
- `backend/prisma/schema.prisma` - PctVideoScript model + enums
- `backend/src/services/ai-generation.ts` - generateVideoScript() function
- `backend/src/routes/pct.ts` - 6 video script endpoints + stats update
- `pct.html` - Scripts tab + panel
- `pct.css` - 290+ lines of script-specific styles
- `pct.js` - ~440 lines of script management logic

---

# Content Factory - Implementation Plan

## Overview
Build AI-powered content generation pipeline for social commerce. 120 features, starting with P1 foundation layers.

## Architecture
- Follows existing PCT pattern: Prisma models + Express routes + AI service
- Route prefix: `/api/cf/`
- All models prefixed with `Cf` (matching `Pct` convention)
- AI generation via Anthropic API (scripts) + mock stubs for Nano Banana/Veo 3.1

## Phase 1: Database Schema (CF-001 → CF-009)

Add to `backend/prisma/schema.prisma`:

**Enums:** CfImageType, CfVideoType, CfGenerationStatus, CfAspectRatio, CfContentStatus, CfPlatform, CfDisclosureType, CfPublishStatus, CfTestStatus

**Models (9):**
1. CfProductDossier - product info, benefits, pain points, links, category
2. CfGeneratedImage - dossier FK, type, variant, prompt, model, URLs, status
3. CfGeneratedVideo - dossier FK, image FK, type, prompt, duration, aspect ratio, status
4. CfScript - dossier FK, awareness level (1-5), hook/body/cta, word count
5. CfAssembledContent - dossier FK, script FK, video/image IDs, caption, hashtags, platform, disclosure
6. CfPublishedContent - content FK, platform, post ID/URL, promote budget, status
7. CfPerformanceMetric - published FK, date, views/likes/comments/shares/saves/clicks/purchases, calculated rates
8. CfAngleTest - dossier FK, hypothesis, variants, budget, winner tracking
9. CfScoringConfig - weight config for winner algorithm

Then: `npx prisma db push && npx prisma generate`

## Phase 2: API Routes + Types (CF-010 → CF-012)

Create `backend/src/routes/content-factory.ts`:

**Dossier CRUD:**
- `GET /dossiers` - list with counts
- `POST /dossiers` - create (auto-slug)
- `GET /dossiers/:id` - detail with all generated content
- `PUT /dossiers/:id` - update
- `DELETE /dossiers/:id` - cascade delete

Register in index.ts: `app.use('/api/cf', cfRouter);`

## Phase 3: Generation Service + Endpoints (CF-013 → CF-026)

Create `backend/src/services/cf-generation.ts`:

**Image generation (mock Nano Banana):**
- generateBeforeImage(dossier, variant) → CfGeneratedImage
- generateAfterImage(dossier, variant) → CfGeneratedImage

**Video generation (mock Veo 3.1):**
- generateBeforeAfterVideo(dossier, sourceImageId) → CfGeneratedVideo

**Script generation (real Anthropic API):**
- generateScript(dossier, level) → CfScript (5 awareness levels with PRD prompts)
- generateAllScripts(dossier) → CfScript[] (all 5 levels)

**API Endpoints:**
- `POST /generate/images` - { dossierId, type, variants }
- `POST /generate/videos` - { dossierId, sourceImageId, type }
- `POST /generate/scripts` - { dossierId, awarenessLevels }
- `POST /generate/all` - { dossierId } full pipeline

## Phase 4: Assembly + Compliance (CF-033 → CF-038, CF-061, CF-062)

- `POST /assemble` - combine script + media + generate caption + hashtags + compliance
- `GET /content/:id/preview` - preview assembled content
- Auto-disclosure for affiliate content
- Before/after guidelines check

## Phase 5: Publishing + Testing + Scoring (CF-039 → CF-054)

- `POST /publish` - mock platform publishing
- `POST /promote` - mock $5 TikTok Promote
- `GET /metrics/:publishedId` - performance metrics
- `POST /tests` - create angle test
- `GET /tests/:id` - test results with scoring
- `POST /tests/:id/pick-winner` - scoring algorithm from PRD

## File Changes

**New files:**
1. `backend/src/routes/content-factory.ts` (~800 lines)
2. `backend/src/services/cf-generation.ts` (~400 lines)

**Modified files:**
1. `backend/prisma/schema.prisma` - +250 lines (enums + 9 models)
2. `backend/src/index.ts` - +2 lines (import + mount)
3. `docs/feature_list_content_factory.json` - update passes as features complete

## Execution Order
1. Add Prisma schema → push → generate
2. Create cf-generation.ts service
3. Create content-factory.ts routes
4. Register in index.ts
5. Test each endpoint group
6. Update feature list passes
