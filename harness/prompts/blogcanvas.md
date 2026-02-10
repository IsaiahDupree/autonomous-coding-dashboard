# BlogCanvas Autonomous Coding Session

You are working on **BlogCanvas**, a client-vendor relationship project management suite for bloggers.

## Project Location
`/Users/isaiahdupree/Documents/Software/BlogCanvas`

## PRD References
- **Main**: `/Users/isaiahdupree/Documents/Software/BlogCanvas/PRD_COMPLETE.md`
- **Status**: `/Users/isaiahdupree/Documents/Software/BlogCanvas/docs/PRD_STATUS.md`
- **Index**: `/Users/isaiahdupree/Documents/Software/BlogCanvas/docs/PRD_INDEX.md`

### New PRDs (January 2026)
| PRD | Description | Priority | Effort |
|-----|-------------|----------|--------|
| `docs/PRD_MOBILE_PWA_SUPPORT.md` | Mobile & PWA features | High | 12-16 hrs |
| `docs/PRD_WHITE_LABEL_DOMAINS.md` | Custom domains & white-label | High | 16-20 hrs |
| `docs/PRD_CLIENT_SELF_SERVICE.md` | Client self-service portal | Medium | 30-40 hrs |
| `docs/PRD_REFERRAL_AFFILIATE_SYSTEM.md` | Referral & affiliate system | Medium | 20-25 hrs |
| `docs/PRD_TESTING_STRATEGY.md` | Testing coverage strategy | High | 40-60 hrs |
| `docs/PRD_ADDITIONAL_FEATURES.md` | Future features backlog | Various | 200+ hrs |
| `docs/PRD_GAP_ANALYSIS_JAN_2026.md` | Updated gap analysis | - | Active |

### Existing PRDs (Complete)
- `docs/PRD_VENDOR_OFFER_PLATFORM.md` - 95% implemented
- `docs/PRD_CLIENT_MANAGEMENT_PURCHASING.md` - Complete
- `docs/PRD_AI_AGENTS_PIPELINE.md` - Complete
- `docs/PRD_CSV_IMPORT_EXPORT.md` - Complete
- `docs/PRD_CLIENT_APPROVAL_WORKFLOW.md` - Complete
- `docs/PRD_PIPELINE_PAGE.md` - Complete
- `docs/PRD_PITCH_REPORT_GENERATOR.md` - Complete
- `docs/PRD_BRAND_CONTEXT_INTEGRATION.md` - Complete
- `docs/PRD_REVISION_HISTORY_UI.md` - Complete
- `docs/PRD_CLIENT_CONTENT_REQUESTS.md` - Complete

All PRDs located in: `/Users/isaiahdupree/Documents/Software/BlogCanvas/docs/`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/BlogCanvas/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS 4
- **Backend:** Next.js API Routes, Server Actions
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** Stripe
- **Email:** Resend
- **Port:** 4848 (development server)

## Key Directories
- `/app` - Next.js App Router pages
- `/components` - React components
- `/lib` - Utilities and helpers
- `/api` - API route handlers
- `/supabase/migrations` - Database migrations

## Priority Order

### 🔴 High Priority (Implement First)
1. **Testing Strategy** - Foundation for quality
2. **Mobile & PWA Support** - User experience
3. **White-Label Domains** - Enterprise feature

### 🟡 Medium Priority (Phase 2)
4. **Client Self-Service** - Reduce support burden
5. **Referral System** - Growth features

### 🟢 Future Consideration
6. **Additional Features** - i18n, AI expansion, marketplace

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/BlogCanvas
npm run dev    # Start dev server on port 4848
npm test       # Run tests
```

## TDD Workflow
1. Read feature requirements from `feature_list.json`
2. Write/update tests for the feature
3. Implement the feature
4. Verify tests pass
5. Update `feature_list.json` with `"passes": true`
6. Commit changes

## IMPORTANT: Remove TODO Stubs from Production

The following files contain TODO stubs that need real implementations:
- `src/app/api/blog-posts/[id]/showcase/route.ts:118` → "TODO: Send email notifications" — implement real email service (Resend/SendGrid)
- `src/app/api/websites/[id]/competitors/[competitorId]/analyze/route.ts:27` → "TODO: In a real implementation" — implement real competitor analysis
- `src/lib/analytics/check-back-scheduler.ts:88` → "TODO: Integrate with Google Analytics and Search Console APIs"

**Action:** Replace TODO stubs with real integrations or mark the feature as `passes: false`.

## Critical Rules
- ❌ Do NOT break existing functionality
- ❌ Do NOT hardcode API keys
- ❌ Do NOT mark features passing without testing
- ❌ Do NOT leave TODO stubs with fake/placeholder return values
- ✅ Follow existing code patterns
- ✅ Use TypeScript types properly
- ✅ Test with browser on port 4848
- ✅ Commit before session ends
- ✅ **NEVER use mock data, TODO stubs with fake returns, or placeholder implementations in production**
