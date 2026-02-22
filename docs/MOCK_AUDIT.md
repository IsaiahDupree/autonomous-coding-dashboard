# Mock Code Audit
## Production Mock Code Across All ACD Targets

**Date:** February 6, 2026 (Initial) → **February 19, 2026 (Re-audit)**  
**Rule:** No mock data, mock API calls, mock providers, placeholder/stub implementations, TODO stubs with fake returns, hardcoded fake data, or placeholder URLs in production source code.

---

## Re-Audit Summary (Feb 19, 2026)

### All 9 previously-affected targets are now CLEAN.

| Pattern Searched | Results |
|------------------|---------|
| `mock-data`, `mock_data`, `MockProvider`, `mock_provider`, `MockRedis` | **0 hits** |
| `TODO.*Replace with actual`, `TODO.*Implement`, `TODO.*real implementation` | **0 hits** |
| `via.placeholder.com`, `placeholder.com`, `example.com` (production) | **0 hits** |
| `sk_test_dummy`, `sk_test_fake`, `fake_key`, `dummy_key` | **0 hits** |
| `john@example`, `jane@example`, `admin@example`, `test@example` | **0 hits** |
| `class Mock*`, `import.*mock`, `from.*mock` (production) | **0 hits** |
| `sampleData`, `demoData`, `fakeData`, `seedData` | **0 hits** |
| Stub returns (`return [] // TODO`, `return {} // TODO`) | **0 hits** |

### Cleanup Actions Taken (Feb 19)

| Action | Target | Files |
|--------|--------|-------|
| **Deleted** orphaned `mock_provider.py` | MediaPoster | `services/ai_providers/mock_provider.py`, `services/video_providers/mock_provider.py` + pycache |
| **Deleted** 8 demo scripts | MediaPoster | `Backend/demo_*.py` (arch, orchestrator, sleep, video ingestion) |
| **Deleted** 11 demo scripts | MediaPoster | `Backend/scripts/demo_*.py` + `scripts/demo_microservices_pipeline.py` |
| **Deleted** duplicate Backend dir | MediaPoster | `Backend/Backend/` (nested duplicate) |
| **Deleted** mock CSV output artifacts | Remotion | `output/ugc-ads/*/mock_meta_performance.csv` |

### Acceptable Test Infrastructure (unchanged)

| Target | Path | Status |
|--------|------|--------|
| Remotion | `tests/video_providers/mock_provider.py` | ✅ Test file — acceptable |
| Remotion | `tests/pipeline/mock-meta-export.csv` | ✅ Test data — acceptable |
| EverReach Expo | `__mocks__/posthog-js.ts` | ✅ Jest mock — acceptable |
| EverReach App Kit | `ios-starter/__mocks__/` | ✅ Jest mocks — acceptable |
| MediaPoster Frontend | `Frontend/__mocks__/` | ✅ Jest mocks — acceptable |
| CanvasCast Web | `apps/web/__mocks__/` | ✅ Jest mocks — acceptable |
| AI Video Platform | `src/app/screenshots/mockup/` | ✅ Legitimate "device mockup" feature page — not a violation |

### Targets Scanned (all clean)

**Original (15):** GapRadar, MediaPoster, Remotion, CanvasCast, AI Video Platform, BlogCanvas, WaitlistLab, EverReach (AppKit + Expo), Portal28, VelvetHold, ShortsLinker, SnapMix, VelloPad, SoftwareHub, SteadyLetters

**Rork Apps (21):** All P26–P46 apps scanned — zero violations found

**ACTP Lite (3):** ACTP, HookLite, MPLite — zero violations found

---

## Previous Audit (Feb 6, 2026)

| Severity | Target | Issue | Status |
|----------|--------|-------|--------|
| **CRITICAL** | GapRadar | Mock data imported in 6+ production pages | ✅ RESOLVED |
| **CRITICAL** | MediaPoster | Mock providers, 20+ TODO API stubs, placeholder thumbnails | ✅ RESOLVED |
| **CRITICAL** | Remotion | Mock Video provider + 6 RapidAPI TODO stubs | ✅ RESOLVED |
| **HIGH** | CanvasCast | MockRedis in production rate limiting | ✅ RESOLVED |
| **HIGH** | AI Video Platform | 8 TODO API stubs, hardcoded fake emails, placeholder URLs | ✅ RESOLVED |
| **MEDIUM** | BlogCanvas | 3 TODO stubs (email, competitor analysis, analytics) | ✅ RESOLVED |
| **MEDIUM** | WaitlistLab | 3 TODO stubs (Facebook API, Twitter API) | ✅ RESOLVED |
| **MEDIUM** | EverReach App Kit | 2 TODO stubs (RevenueCat paywall) | ✅ RESOLVED |
| **MEDIUM** | EverReach Expo | `sk_test_dummy` Stripe key fallback | ✅ RESOLVED |

**Total NOMOCK features added:** 37 across 9 targets  
**Total features reset to passes:false:** 32

---

## CRITICAL: GapRadar

### Problem
`src/lib/mock-data.ts` contains hardcoded fake data (mock runs, mock ad creatives, mock Reddit mentions, mock gap opportunities, mock concept ideas, mock clusters, mock UGC assets) that is **imported directly in 6+ production dashboard pages**.

### Files Importing Mock Data in Production
```
src/app/dashboard/page.tsx           → mockRuns, mockGapOpportunities, mockConceptIdeas
src/app/dashboard/gaps/page.tsx      → mockGapOpportunities, mockClusters, mockAdCreatives, mockRedditMentions
src/app/dashboard/ugc/page.tsx       → mockUGCAssets, mockUGCRecommendations
src/app/dashboard/brands/[id]/page.tsx → mockAdCreatives, mockGapOpportunities
src/app/dashboard/compare/page.tsx   → mockRuns
src/app/dashboard/ideas/page.tsx     → mockConceptIdeas, mockAppStoreResults
```

### Mock Data Source
```
src/lib/mock-data.ts                 → All mock data definitions
```

### Fix Required
- Replace all mock data imports with real data fetched from Supabase/API
- Delete `src/lib/mock-data.ts`
- Each page should call actual API routes or server actions to fetch data

---

## CRITICAL: MediaPoster

### Problem
Mock AI and Video providers are imported in production `__init__.py` files and used as fallback when no real provider is configured.

### Files
```
Backend/services/ai_providers/mock_provider.py       → MockAIProvider class
Backend/services/ai_providers/__init__.py:26          → from .mock_provider import MockAIProvider
Backend/services/ai_providers/__init__.py:54          → return MockAIProvider()  (fallback)

Backend/services/video_providers/mock_provider.py     → MockVideoProvider class  
Backend/services/video_providers/__init__.py:41        → from .mock_provider import MockVideoProvider
Backend/services/video_providers/__init__.py:51,59     → return MockVideoProvider()  (fallback)
```

### Additional Issues (from AI_MOCK_AUDIT.md)
- `Backend/services/ai_content_generator.py` — TODO comments with mock returns for OpenAI, Anthropic, Stability AI, DALL-E, Runway ML
- `Backend/api/comment_automation.py:432-438` — Mock comment summarization
- `Backend/api/endpoints/publishing_analytics.py:89` — Hardcoded content variants

### Fix Required
- Remove MockAIProvider and MockVideoProvider from production fallback chains
- Replace TODO stubs with real API implementations or raise `NotConfiguredError`
- Delete `mock_provider.py` files (or move to tests directory)
- Implement real OpenAI/Anthropic calls in `ai_content_generator.py`

---

## CRITICAL: Remotion

### Problem
Same mock video provider pattern as MediaPoster — MockVideoProvider used as production fallback.

### Files
```
python/services/video_providers/mock_provider.py         → MockVideoProvider class
python/services/video_providers/__init__.py:41            → from .mock_provider import MockVideoProvider
python/services/video_providers/__init__.py:51,59         → return MockVideoProvider()  (fallback)
```

### Fix Required
- Remove MockVideoProvider from production fallback chain
- Raise `NotConfiguredError` or use real Veo/Runway provider when no provider configured
- Delete `mock_provider.py` or move to tests

---

## HIGH: CanvasCast

### Problem
MockRedis class used as in-memory Redis replacement in production rate limiting when Redis URL is not configured.

### Files
```
apps/api/src/lib/ratelimit-mock.ts      → MockRedis class definition
apps/api/src/lib/ratelimit.ts:12        → import { MockRedis } from './ratelimit-mock'
apps/api/src/lib/ratelimit.ts:33-53     → Falls back to MockRedis when no Redis URL

apps/web/src/lib/ratelimit.ts:37        → Inline MockRedis class
apps/web/src/lib/ratelimit.ts:100       → Falls back to MockRedis
```

### Fix Required
- Replace MockRedis with a proper in-memory rate limiter (e.g., `@upstash/ratelimit` with memory adapter, or a simple Map-based limiter without "Mock" naming)
- Or require Redis URL in production and throw on missing config
- Delete `ratelimit-mock.ts`

---

## HIGH: AI Video Platform

### Problem
8 TODO stubs with "Replace with actual API call" across CPP and Review pages. Hardcoded fake email addresses (`john@example.com`, `jane@example.com`, `admin@example.com`) in review item data. Placeholder URLs (`via.placeholder.com`) used as screenshot defaults.

### Files
```
src/app/cpp/page.tsx:78,105,127,165,209        → 5x "TODO: Replace with actual API call"
src/app/ads/review/page.tsx:42                  → "TODO: Replace with actual API calls" + hardcoded emails
src/app/ads/review/components/ReviewItemCard.tsx:45 → "TODO: Replace with actual API call"
src/app/review/page.tsx:46                      → "TODO: Replace with actual API calls" + hardcoded emails
src/app/screenshots/page.tsx:23                 → via.placeholder.com URL
src/app/screenshots/captions/page.tsx:30        → via.placeholder.com URL
src/app/screenshots/editor/page.tsx:528         → via.placeholder.com URL
```

### Fix Required
- Replace all TODO API call stubs with real Supabase queries
- Replace hardcoded email addresses with auth context user data
- Replace via.placeholder.com URLs with empty state UI or real storage URLs

---

## MEDIUM: BlogCanvas

### Problem
3 TODO stubs for unimplemented integrations: email notifications, competitor analysis, and Google Analytics/Search Console.

### Files
```
src/app/api/blog-posts/[id]/showcase/route.ts:118    → "TODO: Send email notifications (integrate with email service)"
src/app/api/websites/[id]/competitors/[competitorId]/analyze/route.ts:27 → "TODO: In a real implementation, you would:"
src/lib/analytics/check-back-scheduler.ts:88          → "TODO: Integrate with Google Analytics and Search Console APIs"
```

### Fix Required
- Implement real email service (Resend/SendGrid) for showcase notifications
- Implement real competitor analysis with web scraping or AI
- Implement Google Analytics and Search Console API integration

---

## MEDIUM: WaitlistLab

### Problem
3 TODO stubs for unimplemented platform APIs: Facebook data fetching and Twitter/X API v2 posting/metrics.

### Files
```
waitlist-lab/src/app/dashboard/page-old.tsx:63          → "TODO: Fetch real data from Facebook API"
waitlist-lab/src/lib/amd/platform-manager.ts:267        → "TODO: Implement Twitter API v2 posting"
waitlist-lab/src/lib/amd/platform-manager.ts:286        → "TODO: Implement Twitter API metrics fetching"
```

### Fix Required
- Replace Facebook API TODO with real Meta Marketing API calls (or remove old page)
- Implement real Twitter API v2 posting and metrics in platform manager

---

## MEDIUM: EverReach App Kit

### Problem
2 TODO stubs for RevenueCat paywall implementation — the paywall UI exists but purchase flow uses placeholder logic.

### Files
```
ios-starter/app/paywall.tsx:184    → "TODO: Replace with actual RevenueCat implementation"
ios-starter/app/paywall.tsx:197    → "TODO: Replace with actual RevenueCat implementation"
```

### Fix Required
- Implement real RevenueCat SDK for in-app purchases and subscription management
- Wire up real offerings, purchase flow, and restore functionality

---

## MEDIUM: EverReach Expo (CRM)

### Problem
Stripe webhook handler falls back to a dummy secret key (`sk_test_dummy`) when `STRIPE_SECRET_KEY` environment variable is missing, which silently allows the route to initialize with invalid credentials.

### Files
```
backend-vercel/app/api/webhooks/stripe/route.ts:43    → new Stripe('sk_test_dummy', ...)
```

### Fix Required
- Remove `sk_test_dummy` fallback
- Throw ConfigError when `STRIPE_SECRET_KEY` is missing
- Webhook route should not initialize without proper credentials

---

## LOW (Acceptable): Test Infrastructure

These `__mocks__` directories contain test-only mocks and are acceptable per the "no mock code" rule:

| Target | Path | Contents |
|--------|------|----------|
| EverReach Expo | `__mocks__/posthog-js.ts` | PostHog mock for Jest tests |
| EverReach App Kit | `ios-starter/__mocks__/` | Jest module mocks |
| MediaPoster Frontend | `Frontend/__mocks__/` | Jest module mocks |
| CanvasCast Web | `apps/web/__mocks__/` | Jest module mocks |

**No action needed** — these are standard Jest testing patterns and don't affect production code.

---

## Prevention

The following rules have been added to the harness prompts to prevent future mock code:

### Added to `harness/prompts/coding.md`
- NEVER use mock data, mock API calls, mock providers, or placeholder/stub implementations in production
- NEVER import from files named `mock-data`, `mock_provider`, `mocks`
- NEVER leave TODO comments with fake return values
- If you find existing mock code, replace it with real implementation or remove it

### Added to `harness/prompts/initializer.md`
- Same rules applied to project initialization

### Enforcement
The harness will now enforce these rules on every session for every target.
