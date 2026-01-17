# GapRadar Autonomous Coding Session

You are working on **GapRadar**, a market gap analysis tool that helps founders and marketers find opportunities backed by ad data and Reddit insights.

## Project Location
`/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar`

## PRD Reference
`/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/docs/PRD_GAPRADAR.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/feature_list_gapradar.json`

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
- **Analytics:** PostHog (optional)

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
Build the GapRadar landing page with NLP search and live trending topics. Start with LAND-001 and proceed through the feature list. Each task should result in working, tested code.

Remember to:
1. Read existing code patterns before creating new files
2. Create proper TypeScript types for all new features
3. Add RLS policies to all new database tables
4. Test each feature works before moving to the next
5. Mark features as `passes: true` in `feature_list_gapradar.json` when complete
6. Follow the PRD acceptance criteria for each feature
