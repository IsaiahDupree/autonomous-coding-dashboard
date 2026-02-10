# WaitlistLab Demand Engine - Harness Prompt

## Project Overview

WaitlistLab is a demand-validated automation tools platform with:
- Meta Lead Ads capture and scoring
- Remotion-powered ad creation with human approval
- Ads Autopilot (autonomous campaign management)
- Competitive ad intelligence system
- Social automation tool delivery

## Tech Stack

- **Frontend:** Next.js
- **Backend:** Supabase, Vercel serverless
- **Email:** Resend
- **Ads:** Meta Marketing API
- **Video:** Remotion (port 8686)
- **Analytics:** Meta Pixel, CAPI, PostHog

## PRDs (10 total)

1. **PRD.md** - The Demand Lab / Waitlist-Ads Playbook
2. **MASTER_PRD_PART1_STRATEGY.md** - Strategy & Market Analysis
3. **MASTER_PRD_PART2_IMPLEMENTATION.md** - Implementation Details
4. **MASTER_PRD_PART3_PRODUCTS.md** - Product Specifications
5. **MASTER_PRD_PART4_AD_CREATION.md** - Remotion Ad Creation & Approval
6. **MASTER_PRD_PART5_ADS_AUTOPILOT.md** - Autonomous Ad Management
7. **MASTER_PRD_PART6_AD_INTELLIGENCE.md** - Competitive Intelligence
8. **MASTER_PRD_PART7_ADS_AUTOPILOT.md** - Extended Autopilot (detailed)
9. **PRD_SOCIAL_AUTOMATION_TOOLS.md** - Social Automation Products
10. **PRODUCTIZABLE_SOFTWARE_INVENTORY.md** - Software Inventory

## Feature Categories (95 features)

| Category | Count | Description |
|----------|-------|-------------|
| Lead Capture | 7 | Meta webhook, Graph API, scoring, segmentation |
| Email Nurture | 8 | Resend, sequences, product delivery |
| Ad Creation | 10 | Remotion templates, approval queue, batch render |
| Ads Autopilot | 12 | Meta Marketing API, rules engine, AI decisions |
| Ad Intelligence | 10 | Scraping, winner detection, competitor tracking |
| Landing Pages | 8 | Template system, CTA, proof demos |
| Products | 7 | DM assistant, auto-comment, inbox triage |
| Analytics | 9 | Pixel, CAPI, UTM, attribution |
| Scoring | 5 | Two-pass winner system, intent ladder |
| Phases | 3 | A/B/C demand validation phases |
| Database | 8 | Schema for leads, creatives, campaigns, metrics |

## Key Flows

### Lead Capture Flow
```
Meta Lead Ad → Webhook → Graph API → Supabase → Score → Resend Email
```

### Ad Creation Flow
```
CreativeSpec → Remotion Render → Approval Queue → Meta Upload → Live
```

### Autopilot Loop
```
Pick Offer → Generate Creatives → Publish → Track → AI Decide → Learn → Repeat
```

## Implementation Priority

1. **P0:** Lead capture, Remotion service, Meta Marketing API
2. **P1:** Email sequences, approval queue, performance metrics
3. **P2:** Ad intelligence, trend detection, dynamic creative

## Environment Variables Needed

```
# Meta
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
META_PIXEL_ID=

# Resend
RESEND_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Remotion
REMOTION_SERVICE_URL=http://localhost:8686

# PostHog
POSTHOG_API_KEY=
```

## IMPORTANT: Remove TODO Stubs from Production

The following files contain TODO stubs that need real implementations:
- `waitlist-lab/src/app/dashboard/page-old.tsx:63` → "TODO: Fetch real data from Facebook API" — implement Meta Marketing API or remove old page
- `waitlist-lab/src/lib/amd/platform-manager.ts:267` → "TODO: Implement Twitter API v2 posting" — implement real posting
- `waitlist-lab/src/lib/amd/platform-manager.ts:286` → "TODO: Implement Twitter API metrics fetching" — implement real metrics

**Action:** Replace TODO stubs with real API implementations. **NEVER use mock data or TODO stubs with fake returns in production code.**

## Success Metrics

- Monthly Lead Volume: 5,000
- Lead → Trial Conversion: 25%
- Trial → Paid Conversion: 40%
- MRR Target: $50,000
- CAC Target: <$30
