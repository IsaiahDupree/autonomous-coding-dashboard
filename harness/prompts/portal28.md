# Portal28 Autonomous Coding Session

You are working on **Portal28**, a comprehensive creator platform for selling digital products, courses, and memberships.

## AUTONOMOUS MODE — DO NOT ASK WHAT TO WORK ON

You are running in a fully autonomous session with NO human interaction. **Never ask what to focus on.** Instead:
1. Read `feature_list.json` and find the FIRST feature where `"passes": false`
2. Implement that feature following TDD (write test → implement → verify)
3. Set `"passes": true` in `feature_list.json` when done
4. Commit your changes
5. Move to the next failing feature

**Do NOT stop to ask questions. Do NOT present options. Just pick the next failing feature and implement it.**

## Project Location
`/Users/isaiahdupree/Documents/Software/Portal28`

## PRD References
- **Main**: `/Users/isaiahdupree/Documents/Software/Portal28/docs/PRD.md`
- **Inventory**: `/Users/isaiahdupree/Documents/Software/Portal28/docs/PRD_INVENTORY.md` (195 features, 641 E2E tests)

### New PRDs (January 2026)
| PRD | Description |
|-----|-------------|
| `docs/PRD_GAP_ANALYSIS.md` | 18 unimplemented features, 30+ recommendations |
| `docs/PRD_NEW_FEATURES.md` | New feature specs (affiliates, DMs, streaks, etc.) |
| `docs/TESTING_GAP_ANALYSIS.md` | Testing coverage gaps & recommendations |
| `docs/API_TEST_COVERAGE.md` | 80+ API routes mapped to tests (56% coverage) |

All PRDs located in: `/Users/isaiahdupree/Documents/Software/Portal28/docs/`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/Portal28/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature.

## Current Status
- **Total Features**: 195
- **Implemented**: 155 (79%)
- **E2E Test Files**: 48
- **E2E Test Cases**: 641

## Critical E2E Tests Missing (P0)
| Feature | Proposed Test File |
|---------|-------------------|
| Stripe Webhooks E2E | `stripe-webhooks.spec.ts` |
| Order Bumps | `order-bumps.spec.ts` |
| File Storage UI | `file-storage.spec.ts` |
| Mux Upload UI | `mux-upload.spec.ts` |
| Drip Content UI | `drip-content.spec.ts` |
| Abandoned Checkout | `abandoned-checkout.spec.ts` |

## Tech Stack
- **Frontend:** Next.js (App Router), React, TailwindCSS
- **Backend:** Next.js API Routes, Server Actions
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage, Mux (video)
- **Payments:** Stripe

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/Portal28
npm run dev    # Start dev server
npm test       # Run tests
npx playwright test  # Run E2E tests
```

## TDD Workflow
1. Read feature requirements from `feature_list.json`
2. Write/update tests for the feature
3. Implement the feature
4. Verify tests pass
5. Update `feature_list.json` with `"passes": true`
6. Commit changes

## Priority Focus
1. **P0**: Missing E2E tests for critical features
2. **P1**: Unimplemented features from gap analysis
3. **P2**: New features (affiliates, DMs, streaks)
