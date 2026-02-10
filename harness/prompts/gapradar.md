# GapRadar Autonomous Coding Session

You are working on **GapRadar**, a market gap analysis tool that helps founders and marketers find opportunities backed by ad data and Reddit insights.

## Project Location
`/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar`

## PRD References
- **Main**: `/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/docs/PRD_GAPRADAR.md`

### New PRDs (January 2026)
| PRD | Description | Priority |
|-----|-------------|----------|
| `docs/PRD_UNIFIED_DEMAND_SCORE.md` | 5-signal scoring system (Google, YouTube, App Store) | P1 |
| `docs/PRD_BUILD_RECOMMENDATIONS.md` | AI-powered "What to Build Next" engine | P1 |
| `docs/PRD_COMPETITIVE_INTELLIGENCE.md` | Competitor tracking, alerts, change detection | P1 |
| `docs/PRD_TESTING_QUALITY.md` | Vitest + Playwright testing strategy | P1 |
| `docs/PRD_ADDITIONAL_FEATURES.md` | Feature backlog with 20+ opportunities | Backlog |

All PRDs located in: `/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/docs/`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature. Do NOT create or update any other feature list files.

## Current Phase: Landing Page + Data Collectors

### Priority Order
Work through features by phase:

**Phase 1: Landing Page (LAND-001 to LAND-015)**
1. Hero section with value prop
2. NLP search input with client-side suggestions
3. Trending topics API with Reddit integration
4. Trending topics grid UI
5. SEO and analytics

**Phase 2: Database + Collectors (DB-001 to COLL-008)**
1. Database migrations for all tables
2. Meta Ads Library collector
3. Reddit Data API collector
4. App Store collectors (iOS + Android)
5. Collector orchestrator

**Phase 3: Analysis Engine (AI-001 to CONCEPT-002)**
1. LLM extraction service
2. Clustering service
3. All scoring formulas
4. Gap detection engine
5. Concept idea generator

**Phase 4: Reports (REPORT-001 to REPORT-012)**
1. Report data aggregator
2. All report sections
3. PDF and CSV/JSON exports

### Your First Tasks (in order):

1. **LAND-001: Landing Page Hero Section**
   - Create hero with headline, value prop, CTA buttons
   - Files: `src/app/page.tsx`, `src/components/landing/Hero.tsx`

2. **LAND-002: NLP Search Input Component**
   - Natural language input with suggestions
   - Files: `src/components/landing/NLPSearchInput.tsx`

3. **LAND-003: NLP Client-Side Suggestions**
   - Category inference, query refinements, confidence
   - Files: `src/lib/nlp/heuristics.ts`, `src/lib/nlp/categories.ts`

4. **LAND-004: Trending Topics API**
   - GET /api/trends with caching
   - Files: `src/app/api/trends/route.ts`, `src/lib/trends/cache.ts`

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase (PostgreSQL + RLS)
- **AI:** OpenAI GPT-4o-mini
- **Payments:** Stripe
- **Analytics:** ACD User Tracking SDK + PostHog

## User Event Tracking (REQUIRED)

**PRD Reference:** `autonomous-coding-dashboard/harness/prompts/PRD_USER_TRACKING_ALL_TARGETS.md`

Copy the tracking SDK from ACD and implement these events:

### Setup
```typescript
// src/lib/tracking/index.ts - Copy from ACD
import { tracker } from './userEventTracker';

tracker.init({
  projectId: 'gapradar',
  apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API,
});
```

### Required Events
| Event | When |
|-------|------|
| `landing_view` | Landing page viewed |
| `cta_click` | Get Started / Sign Up clicked |
| `pricing_view` | Pricing page viewed |
| `signup_start` | Signup form opened |
| `login_success` | User logged in |
| `activation_complete` | User ready to create first run |
| `run_created` | New analysis run started |
| `run_completed` | Analysis run finished |
| `report_viewed` | User viewed a report |
| `report_downloaded` | PDF/export downloaded |
| `trend_clicked` | Trending topic clicked |
| `checkout_started` | Checkout flow started |
| `purchase_completed` | Payment successful |

### Tracking Features (Add to feature_list.json)
```json
{ "id": "TRACK-001", "name": "Tracking SDK Integration", "passes": false },
{ "id": "TRACK-002", "name": "Acquisition Event Tracking", "passes": false },
{ "id": "TRACK-003", "name": "Activation Event Tracking", "passes": false },
{ "id": "TRACK-004", "name": "Core Value Event Tracking", "passes": false },
{ "id": "TRACK-005", "name": "Monetization Event Tracking", "passes": false }
```

## Key Existing Files
- **App Routes:** `src/app/`
- **Components:** `src/components/`
- **Lib:** `src/lib/`
- **Types:** `src/types/`
- **Supabase:** `supabase/`

## Scoring Formulas (implement in src/lib/scoring/)
```typescript
// Saturation: 100 * sigmoid(0.6*log1p(A) + 0.3*log1p(C) + 0.8*R)
// Longevity: clamp(100 * log1p(days_running) / log1p(180), 0, 100)
// Dissatisfaction: 100 * sigmoid(0.5*log1p(F) + 0.7*I + 0.6*S + 0.2*log1p(W))
// Misalignment: 100 * (0.5*(1 - P) + 0.3*M + 0.2*T)
// Opportunity: 0.35*longevity + 0.35*dissatisfaction + 0.30*misalignment - 0.15*saturation
// Confidence: clamp(0.4*data_sufficiency + 0.4*cross_source + 0.2*recency, 0, 1)
```

## API Contracts
### GET /api/trends
```json
{
  "trends": [
    {
      "id": "string",
      "topic": "string",
      "category": "string",
      "volume": 12345,
      "growth": 75,
      "sentiment": "positive",
      "sources": ["r/SaaS"],
      "relatedTerms": ["keyword1"],
      "opportunityScore": 82
    }
  ],
  "lastUpdated": "2026-01-01T00:00:00.000Z",
  "sources": ["Reddit"]
}
```

## Test Specs
- `e2e/landing-page.spec.ts` - Landing page E2E tests
- `e2e/trends-api.spec.ts` - Trends API tests
- `__tests__/scoring.test.ts` - Scoring formula unit tests

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar
npm run dev    # Start dev server on port 3001
npm test       # Run Jest tests
npm run test:e2e  # Run Playwright tests
```

## Session Goal
**ACTION REQUIRED**: Find the FIRST feature in `feature_list.json` where `"passes": false`, implement it using TDD, then mark it `"passes": true`.

DO NOT just analyze or report status. Actually implement code for pending features.

### Your TDD workflow each session:
1. **READ**: Find the first feature with `"passes": false` in `feature_list.json`
2. **RED**: Write a failing test for that feature first
   - Create test in `__tests__/` for unit tests or `e2e/` for E2E tests
   - Run `npm test` or `npm run test:e2e` to confirm it fails
3. **GREEN**: Implement the minimum code to make the test pass
   - Create/edit source files as needed
   - Run tests again to confirm they pass
4. **REFACTOR**: Clean up code if needed while keeping tests green
5. **MARK COMPLETE**: Edit `feature_list.json` to set `"passes": true`
6. **REPEAT**: Move to next pending feature

### Test file locations:
- Unit tests: `__tests__/<feature>.test.ts`
- Integration tests: `__tests__/integration/<feature>.test.ts`
- E2E tests: `e2e/<feature>.spec.ts`

## CRITICAL: Remove Mock Data from Production

**`src/lib/mock-data.ts` must be deleted.** It contains hardcoded fake data that is imported in 6+ production dashboard pages:
- `src/app/dashboard/page.tsx` → mockRuns, mockGapOpportunities, mockConceptIdeas
- `src/app/dashboard/gaps/page.tsx` → mockGapOpportunities, mockClusters, mockAdCreatives, mockRedditMentions
- `src/app/dashboard/ugc/page.tsx` → mockUGCAssets, mockUGCRecommendations
- `src/app/dashboard/brands/[id]/page.tsx` → mockAdCreatives, mockGapOpportunities
- `src/app/dashboard/compare/page.tsx` → mockRuns
- `src/app/dashboard/ideas/page.tsx` → mockConceptIdeas, mockAppStoreResults

**Action:** Replace all mock imports with real Supabase queries or API calls. Delete `src/lib/mock-data.ts` when done.

Remember to:
1. Read existing code patterns before creating new files
2. Create proper TypeScript types for all new features
3. Add RLS policies to all new database tables
4. Test each feature works before moving to the next
5. **IMPORTANT**: Mark features as `"passes": true` in `/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/feature_list.json` when complete
6. Follow the PRD acceptance criteria for each feature
7. **NEVER use mock data in production code** — always fetch real data from Supabase/API

## How to Mark a Feature Complete
After implementing a feature, edit `feature_list.json` and find the feature by its ID (e.g., "LAND-001"), then change `"passes": false` to `"passes": true`. Example:
```json
{
  "id": "LAND-001",
  "name": "Landing Page Hero Section",
  "passes": true,  // <-- Change this from false to true
  ...
}
```
