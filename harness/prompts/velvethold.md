# VelvetHold Autonomous Coding Session

You are working on **VelvetHold**, a premium date reservation platform where requesters put down refundable deposits to prove serious intent, eliminating no-shows from dating.

## Project Location
`/Users/isaiahdupree/Documents/Software/VelvetHold`

## PRD References
- **Detailed PRD**: `/Users/isaiahdupree/Documents/Software/VelvetHold/PRD_DETAILED.md`
- **Feature List**: `/Users/isaiahdupree/Documents/Software/VelvetHold/feature_list.json`

## Product Concept
- **Problem:** 40-60% no-show rate on dating apps
- **Solution:** Refundable deposits ($10-$200) that prove commitment
- **Revenue Model:** Transaction fees (2.9% + $0.30), premium features
- **Market:** $5.6B dating app market, 300M+ users globally

## Core User Flows

### Invitee (Receives Requests)
1. Create profile with photos, bio, screening questions
2. Set deposit amount and cancellation policy
3. Review incoming date requests (answers + deposit amount)
4. Approve/reject with optional message
5. Meet in person → deposit released back to requester

### Requester (Sends Requests)
1. Browse invitee profiles
2. Answer screening questions
3. Submit deposit via Stripe
4. Wait for approval/rejection
5. Attend date → get deposit back

## Tech Stack
- **Frontend:** Next.js (App Router), React, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth (email + OAuth)
- **Payments:** Stripe (deposits, refunds, Connect)
- **Storage:** Supabase Storage (photos)
- **Email:** Resend (notifications)

## Key Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with photos, bio, preferences |
| `screening_questions` | Invitee's custom questions |
| `date_requests` | Request with deposit, answers, status |
| `deposits` | Stripe payment intents and refund tracking |
| `reviews` | Post-date reviews and ratings |
| `notifications` | Push/email notification log |
| `reports` | Safety reports and moderation |
| `blocked_users` | Block list per user |

## Feature Categories (120 features)
| Category | Count | Description |
|----------|-------|-------------|
| Auth & Onboarding | 12 | Registration, OAuth, 2FA, onboarding |
| Profiles | 15 | Profile creation, photos, screening questions |
| Browsing & Discovery | 10 | Search, filters, recommendations |
| Date Requests | 14 | Request flow, deposits, approval/rejection |
| Chat & Communication | 8 | In-app messaging after approval |
| Verification | 6 | ID verification, photo verification |
| Safety & Moderation | 10 | Reporting, blocking, content moderation |
| Analytics | 8 | User dashboard, engagement metrics |
| Monetization | 8 | Premium features, boost, Stripe |
| Matching | 6 | Algorithm-based suggestions |
| Admin | 8 | Admin panel, user management |
| Mobile & PWA | 5 | Responsive, installable, push notifications |
| Payments | 6 | Stripe deposits, refunds, payouts |
| Testing | 4 | Unit, integration, E2E tests |

## Development Priority
1. **P0:** Auth, profiles, browsing, basic request flow
2. **P0:** Stripe deposit integration (create + refund)
3. **P1:** Chat, notifications, screening questions
4. **P1:** Verification, safety features
5. **P2:** Analytics, premium features, matching
6. **P2:** Admin panel, mobile optimization

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/VelvetHold
npm run dev     # Start dev server
npm test        # Run tests
```

## Critical Rules
- Payment flows must use Stripe test mode in development
- Never expose Stripe secret keys in client code
- All user-generated content must pass profanity filter
- Photos require face detection before upload
- Deposits must be held in Stripe (not our accounts)
- RLS policies must be applied to all tables
- Update `feature_list.json` with `"passes": true` when features complete
