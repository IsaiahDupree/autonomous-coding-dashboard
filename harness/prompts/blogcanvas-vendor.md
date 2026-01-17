# BlogCanvas Vendor Offer Platform - Autonomous Coding Session

You are working on **BlogCanvas**, evolving it into a vendor offer platform with landing pages, checkout, client portals, and scheduling.

## Project Location
`/Users/isaiahdupree/Documents/Software/BlogCanvas`

## PRD Reference
`/Users/isaiahdupree/Documents/Software/BlogCanvas/docs/PRD_VENDOR_OFFER_PLATFORM.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/BlogCanvas/feature_list_vendor_platform.json`

## Current Phase: MVP (Phase 1)

### Priority Order
Work through features in this order:

1. **Database Migrations** (VENDOR-001, PAGE-001, OFFER-001, CLIENT-001, etc.)
2. **Vendor Auth & Profile** (VENDOR-001, VENDOR-002, VENDOR-003)
3. **Page Builder Blocks** (PAGE-002 through PAGE-011)
4. **Checkout Flow** (CHECKOUT-001 through CHECKOUT-005)
5. **Client Portal** (PORTAL-001 through PORTAL-013)
6. **Scheduling** (SCHED-001 through SCHED-009)
7. **Analytics** (TRACK-001 through TRACK-007)

### Your First Tasks (in order):

1. **VENDOR-001: Vendor Auth & Profile**
   - Create vendor registration and login
   - Add vendor profile with handle selection
   - Files: `src/app/api/auth/vendor/route.ts`, `src/app/vendor/register/page.tsx`

2. **VENDOR-002: Vendor Handle System**
   - Implement unique vendor handles for URL routing
   - Route: `/@vendorhandle/`
   - Files: `src/app/@[vendor]/layout.tsx`

3. **PAGE-001: Offer Page Data Model**
   - Create Supabase migration for offer_pages table
   - JSON block storage structure
   - Files: `supabase/migrations/offer_pages.sql`, `src/types/offer-page.ts`

4. **PAGE-002: Page Block Editor Framework**
   - Block-based editor with drag-and-drop
   - Files: `src/components/editor/BlockEditor.tsx`, `src/lib/editor/block-types.ts`

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe Connect
- **Email:** Resend
- **Calendar:** Google Calendar API
- **Analytics:** PostHog (existing)

## Key Existing Files
- **App Routes:** `src/app/`
- **Components:** `src/components/`
- **Lib:** `src/lib/`
- **Types:** `types/`
- **Supabase:** `supabase/`

## Database Design Principles
- All tables use RLS for multi-tenancy
- Key with `vendor_id` and/or `workspace_id`
- Use UUIDs for primary keys

## Component Style Guidelines
- Use shadcn/ui components (Card, Table, Badge, Button, etc.)
- Follow existing component patterns in the codebase
- Import from `@/components/ui/`
- Use Lucide icons from `lucide-react`

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/BlogCanvas
npm run dev    # Start dev server on port 4848
npm test       # Run tests
npm run test:e2e  # Run Playwright tests
```

## Session Goal
Build the vendor offer platform MVP. Start with database migrations, then vendor auth, then the page builder. Each task should result in working, tested code.

Remember to:
1. Read existing code patterns before creating new files
2. Create proper TypeScript types for all new features
3. Add RLS policies to all new tables
4. Test each feature works before moving to the next
5. Mark features as `passes: true` in `feature_list_vendor_platform.json` when complete
