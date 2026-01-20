# SteadyLetters Autonomous Coding Session

You are working on **SteadyLetters** (formerly KindLetters), a SaaS web application for creating and sending physical handwritten-style letters via Thanks.io API integration.

## Project Location
`/Users/isaiahdupree/Documents/Software/KindLetters`

## PRD References
- **Main PRD**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_STEADYLETTERS.md`
- **Mobile Optimization**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_MOBILE_OPTIMIZATION.md`
- **Security Hardening**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_SECURITY_HARDENING.md`
- **Observability**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_OBSERVABILITY.md`
- **Gaps & Improvements**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_GAPS_AND_IMPROVEMENTS.md`
- **Status Report**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_STATUS_REPORT.md`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/KindLetters/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature. Do NOT create or update any other feature list files.

## Current Phase Priority

**Phase 6: Mobile Optimization (MOB-001 to MOB-010)** - HIGHEST PRIORITY
- Mobile hamburger menu navigation
- Touch targets and iOS input fixes
- Responsive layouts for all pages

**Phase 7: Security Hardening (SEC-001 to SEC-008)**
- Thanks.io webhook signature verification
- Rate limiting with Upstash Redis
- Security headers and input validation

**Phase 8: Observability (OBS-001 to OBS-008)**
- Sentry error tracking
- PostHog analytics
- Structured logging

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Database:** PostgreSQL (Supabase), Prisma ORM
- **Auth:** Supabase Auth
- **AI:** OpenAI GPT-4o, Whisper, DALL-E 3
- **Mail API:** Thanks.io
- **Payments:** Stripe
- **Deployment:** Vercel

## Key Files
| Purpose | File |
|---------|------|
| Navbar | `src/components/navbar.tsx` |
| Global CSS | `src/app/globals.css` |
| Thanks.io Client | `src/lib/thanks-io.ts` |
| OpenAI Utils | `src/lib/openai.ts` |
| Usage Tracking | `src/lib/usage.ts` |
| Tier Limits | `src/lib/tiers.ts` |
| Server Actions | `src/app/actions/*.ts` |

## Important Rules
1. **Never break existing functionality** - All current features are working
2. **Mobile first** - Phase 6 mobile work is highest priority
3. **Security matters** - Add signature verification before processing webhooks
4. **Test thoroughly** - 48+ test files exist, run tests before marking complete

## Database Schema
Located in `prisma/schema.prisma`:
- User, UserUsage, Recipient, Template, Order, MailOrder, Event

## Commands
```bash
# Development
npm run dev

# Tests
npm test
npx playwright test

# Database
npx prisma generate
npx prisma db push
npx prisma studio
```

## TDD Workflow
1. Read the feature requirements from `feature_list.json`
2. Write/update tests for the feature
3. Implement the feature
4. Verify tests pass
5. Update `feature_list.json` with `"passes": true`

## Session Goals
Each session should:
1. Pick the next incomplete feature (lowest ID in current phase)
2. Implement the feature following TDD
3. Run tests to verify
4. Mark feature as complete in `feature_list.json`
5. Commit changes with descriptive message
