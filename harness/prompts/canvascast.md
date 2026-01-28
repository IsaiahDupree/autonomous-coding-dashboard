# CanvasCast Autonomous Coding Session

You are working on **CanvasCast**, an AI-powered video generation platform that transforms text prompts into fully produced short-form videos with AI-generated scripts, voiceover, images, and captions.

## Project Location
`/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target`

## PRD References
- **Main**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/DEVELOPER_HANDOFF.md`
- **Core PRD**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/PRD_CORE.md`
- **Prompt-to-Video**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/PRD_PROMPT_TO_VIDEO.md`
- **Gap Analysis**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/PRD_GAP_ANALYSIS.md`
- **Recommendations**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/PRD_RECOMMENDATIONS.md`
- **E2E Testing**: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/PRD_E2E_TESTING.md`

All subsystem PRDs are in: `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/docs/prds/`

### New PRD Areas (from PRD_RECOMMENDATIONS.md)
| Phase | Area | Features |
|-------|------|----------|
| 13 | Error Recovery & Resilience | RESIL-001 to RESIL-004 |
| 14 | Content Moderation & Safety | MOD-001 to MOD-004 |
| 15 | Analytics & Metrics | ANALYTICS-001 to ANALYTICS-004 |
| 16 | Admin Dashboard | ADMIN-001 to ADMIN-005 |
| 17 | Document Processing | DOC-001 to DOC-005 |
| 18 | Remotion Production | REMOTION-001 to REMOTION-006 |
| 19 | Rate Limiting | RATE-001 to RATE-004 |
| 20 | GDPR & Privacy | GDPR-001 to GDPR-005 |
| 21 | Accessibility | A11Y-001 to A11Y-005 |

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature. Do NOT create or update any other feature list files.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  Next.js 14 App Router │ React Server Components │ TailwindCSS          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                API                                       │
│  Express.js │ /api/v1/projects │ /api/v1/jobs │ Stripe Webhooks         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│       Redis/BullMQ       │         │        Supabase          │
│      Job Queue           │         │  PostgreSQL + Storage    │
└──────────────────────────┘         └──────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              WORKER                                      │
│  9-Step Pipeline: Script → Voice → Align → Images → Render → Package   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack
- **Frontend:** Next.js 14, React, TailwindCSS, shadcn/ui
- **API:** Express.js, BullMQ
- **Worker:** Node.js, Remotion, FFmpeg
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth (Magic Links, OAuth)
- **Payments:** Stripe
- **AI:** OpenAI (GPT-4, TTS, Whisper), Google Gemini
- **Analytics:** ACD User Tracking SDK

## User Event Tracking (REQUIRED)

**PRD Reference:** `autonomous-coding-dashboard/harness/prompts/PRD_USER_TRACKING_ALL_TARGETS.md`

### Required Events for CanvasCast
| Event | When |
|-------|------|
| `landing_view` | Landing page viewed |
| `cta_click` | Get Started clicked |
| `login_success` | User logged in |
| `activation_complete` | User ready to create first video |
| `project_created` | New video project started |
| `prompt_submitted` | Video prompt submitted |
| `video_generated` | Video generation completed |
| `video_downloaded` | User downloaded video |
| `script_edited` | User edited generated script |
| `voice_selected` | User selected voice option |
| `checkout_started` | Checkout flow started |
| `purchase_completed` | Credits/subscription purchased |

### Tracking Features (Add to feature_list.json)
```json
{ "id": "TRACK-001", "name": "Tracking SDK Integration", "passes": false },
{ "id": "TRACK-002", "name": "Acquisition Event Tracking", "passes": false },
{ "id": "TRACK-003", "name": "Activation Event Tracking", "passes": false },
{ "id": "TRACK-004", "name": "Core Value Event Tracking", "passes": false },
{ "id": "TRACK-005", "name": "Monetization Event Tracking", "passes": false }
```

## Monorepo Structure
```
CanvasCast-Target/
├── apps/
│   ├── web/           # Next.js frontend (port 3000)
│   ├── api/           # Express API (port 8989)
│   └── worker/        # BullMQ worker
├── packages/
│   ├── shared/        # Types, schemas, utils
│   └── remotion/      # Video composition
├── supabase/
│   ├── config.toml
│   └── migrations/
├── docs/
│   └── prds/          # All PRD documents
└── tests/
```

## Implementation Phases

**Phase 1: Foundation (FOUND-001 to FOUND-005)**
- Monorepo setup with pnpm workspaces
- Shared types and schemas packages
- Remotion package initialization

**Phase 2: Database (DB-001 to DB-015)**
- All Supabase migrations
- RLS policies
- RPC functions for credits and drafts

**Phase 3: Auth (AUTH-001 to AUTH-008)**
- Supabase client setup
- Auth middleware
- Signup/login pages
- OAuth callback

**Phase 4: Draft (DRAFT-001 to DRAFT-003)**
- Pre-auth prompt capture
- Draft API routes
- Prompt input component

**Phase 5: API (API-001 to API-013)**
- Express server setup
- Project and job endpoints
- Credit and subscription endpoints
- Stripe webhooks

**Phase 6: Worker (WORKER-001 to WORKER-004)**
- BullMQ worker setup
- Pipeline orchestrator
- Context management

**Phase 7: Pipeline (PIPE-001 to REMOTION-004)**
- 9 pipeline steps implementation
- Remotion video composition

**Phase 8: Frontend (UI-001 to UI-017)**
- All pages and components
- Hooks for data fetching

**Phase 9-12: Billing, Email, Storage, Testing**

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target
pnpm install        # Install dependencies
pnpm dev            # Start all services
pnpm dev:web        # Frontend only
pnpm dev:api        # API only
pnpm dev:worker     # Worker only
pnpm test           # Run tests
pnpm typecheck      # TypeScript check
```

## Session Goal
**ACTION REQUIRED**: Find the FIRST feature in `feature_list.json` where `"passes": false`, implement it using TDD, then mark it `"passes": true`.

DO NOT just analyze or report status. Actually implement code for pending features.

### Your TDD workflow each session:
1. **READ**: Find the first feature with `"passes": false` in `feature_list.json`
2. **RED**: Write a failing test for that feature first
   - Create test in `__tests__/` for unit tests or `e2e/` for E2E tests
   - Run `pnpm test` to confirm it fails
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

Remember to:
1. Read existing code patterns before creating new files
2. Check the relevant PRD in `docs/prds/` for detailed requirements
3. Create proper TypeScript types in `packages/shared`
4. Add Supabase migrations for database changes
5. **IMPORTANT**: Mark features as `"passes": true` in `/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/feature_list.json` when complete
6. Follow the PRD acceptance criteria for each feature

## How to Mark a Feature Complete
After implementing a feature, edit `feature_list.json` and find the feature by its ID (e.g., "FOUND-001"), then change `"passes": false` to `"passes": true`. Example:
```json
{
  "id": "FOUND-001",
  "name": "Monorepo Setup",
  "passes": true,  // <-- Change this from false to true
  ...
}
```
