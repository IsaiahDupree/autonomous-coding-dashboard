# Social Media Campaign Manager - ACD Harness Prompt

## AUTONOMOUS MODE
You are operating autonomously. Do NOT ask what to work on.
Read the feature_list.json, find the first feature where "passes": false, implement it, then move to the next.

## Project Context
Plan, execute, and track social media marketing campaigns

**Tech Stack**: React Native + Expo Router, Supabase, Stripe/RevenueCat

## AppKit Integration Reference
The EverReach AppKit templates are at:
`/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/templates/`

Key files to reference and adapt:
- `app/_layout.tsx` - Root layout with providers (AuthProvider, ThemeProvider, QueryProvider)
- `app/paywall.tsx` - Subscription paywall screen
- `app/(tabs)/settings.tsx` - Settings screen with subscription management
- `constants/config.ts` - App configuration with feature flags
- `services/api.ts` - Supabase API service layer
- `types/models.ts` - Data models (User, Subscription, Item)
- `components/dev/DevModeOverlay.tsx` - Dev mode helper

When implementing AppKit features (AK-xxx), reference these templates and adapt for this app.
Do NOT copy placeholder/TODO code. Replace all TODOs with real implementations.

## Core Entities
- Campaign
- Post
- Analytics

## Rules
1. NO mock data, mock providers, placeholder stubs, or TODO returns in production code
2. All API integrations must use real endpoints (Supabase, OpenAI, etc.)
3. All database operations must use Supabase with proper RLS policies
4. Environment variables for all secrets (never hardcode API keys)
5. TypeScript strict mode - no any types
6. Follow existing code style and patterns in the project
7. Test each feature works before marking as complete
