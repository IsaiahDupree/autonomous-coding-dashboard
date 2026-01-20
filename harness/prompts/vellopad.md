# VelloPad - Autonomous Coding Harness Prompt

## Project Overview
VelloPad is a modern book creation platform where anyone can write + fully edit a book, get print-ready PDFs, and buy physical copies via print-on-demand APIs. The platform drives completion with guided prompts, tutorials, email nudges, and SEO content.

**Domain:** VelloPad.com  
**Numerology:** 33 → Master Builder

## PRD References

| Document | Description | Priority |
|----------|-------------|----------|
| [PRD.md](../../VelloPad/PRD.md) | Complete product requirements, epics, user stories, DB schema | Primary |
| [DEVELOPER.md](../../VelloPad/DEVELOPER.md) | Developer handoff guide, architecture, setup | Reference |

## Feature List
**Path:** `/Users/isaiahdupree/Documents/Software/VelloPad/feature_list.json`

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **UI:** shadcn/ui, Tailwind CSS, Lucide Icons
- **Editor:** TipTap (ProseMirror-based)
- **Auth:** Supabase Auth
- **Database:** Supabase (Postgres)
- **Storage:** Supabase Storage / S3 / R2
- **Queue:** BullMQ + Redis (or Upstash)
- **Payments:** Stripe
- **Email:** Resend
- **Analytics:** PostHog
- **PDF Rendering:** Puppeteer / Prince / WeasyPrint
- **POD Providers:** Peecho, Prodigi, Lulu, Bookvault

## Key Directories
```
VelloPad/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── editor/       # TipTap editor components
│   │   ├── outline/      # Book outline builder
│   │   ├── preview/      # PDF preview components
│   │   ├── cover/        # Cover design components
│   │   └── assets/       # Asset library components
│   ├── lib/              # Business logic
│   │   ├── auth/         # Authentication
│   │   ├── print/        # Print orchestrator + adapters
│   │   ├── rendition/    # PDF generation pipeline
│   │   ├── events/       # Analytics events
│   │   └── email/        # Lifecycle emails
│   └── types/            # TypeScript types
├── supabase/
│   └── migrations/       # Database migrations
└── e2e/                  # Playwright E2E tests
```

## Current Phase
**Phase 1: Foundation & Auth (BS-EP01)**
- Setting up authentication with Supabase
- Workspace creation and member roles
- Design system with VelloPad color palette

## Epics & Priority

| Epic | Name | Priority | Status |
|------|------|----------|--------|
| BS-EP01 | Foundation & Auth | P0 | 🔄 In Progress |
| BS-EP02 | Book Studio Core | P0 | ⏳ Pending |
| BS-EP03 | Assets, Templates, Cover | P0 | ⏳ Pending |
| BS-EP04 | Rendition Pipeline | P0 | ⏳ Pending |
| BS-EP05 | Commerce + Orders | P0 | ⏳ Pending |
| BS-EP06 | Print Orchestrator | P0 | ⏳ Pending |
| BS-EP07 | Admin Campaigns | P1 | ⏳ Pending |
| BS-EP08 | SEO Blog + Marketing Hub | P1 | ⏳ Pending |
| BS-EP09 | Analytics & Reliability | P1 | ⏳ Pending |

## Implementation Guidelines

### TDD Workflow
1. Read feature from `feature_list.json`
2. Write E2E test in `e2e/` directory
3. Implement feature to pass test
4. Update feature `passes: true` when complete

### Editor Implementation (TipTap)
- Use TipTap with custom extensions for book-specific formatting
- Support headings, lists, links, quotes, images, page breaks
- Implement autosave with debouncing
- Track word count per chapter and total

### Print Orchestrator Pattern
- Build adapter interface for POD providers
- Start with one provider (Peecho or Prodigi)
- Abstract all provider-specific logic behind canonical interface
- Store provider config securely

### Rendition Pipeline
- Queue jobs with BullMQ
- Generate interior PDF + cover PDF
- Run preflight checks before allowing checkout
- Store artifacts in object storage with signed URLs

## Testing Requirements
- E2E tests with Playwright for critical user flows
- Unit tests for business logic (preflight, quote calculation)
- Integration tests for POD provider adapters

## Commit Guidelines
```
feat(book-studio): add chapter editor with autosave
fix(rendition): handle large image DPI warnings
test(e2e): add book creation flow tests
```

## Success Metrics
- **Activation:** 40% create book + write 300+ words in 24h
- **Completion:** 25% generate print-ready PDF
- **Revenue:** 15% purchase proof copy
- **Repeat:** 30% place 2nd order within 30 days
