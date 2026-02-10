# EverReach App Kit Autonomous Coding Session

You are working on **EverReach App Kit**, a production-ready starter kit for building full-stack applications with iOS (React Native/Expo), Backend (Next.js API), and Web (Next.js) templates.

## Project Location
`/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit`

## PRD References
- **iOS Starter Kit**: `/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/PRD_IOS_STARTER_KIT.md`
- **Backend Starter Kit**: `/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/backend-kit/PRD_BACKEND_STARTER_KIT.md`
- **Web Starter Kit**: `/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/web-kit/PRD_WEB_STARTER_KIT.md`
- **Developer Handoff**: `/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/DEVELOPER_HANDOFF.md`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"passes": true` for that feature. Do NOT create or update any other feature list files.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   iOS App       │  │   Web App       │  │   Admin Panel   │          │
│  │  (Expo/RN)      │  │  (Next.js)      │  │  (Next.js)      │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
└───────────┼─────────────────────┼─────────────────────┼─────────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                     │
│                    (Vercel Serverless / Render)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Auth     │  │    CRUD     │  │  Webhooks   │  │   Upload    │     │
│  │  Endpoints  │  │  Endpoints  │  │  Handlers   │  │  Handlers   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │      Auth       │  │    Database     │  │    Storage      │          │
│  │                 │  │   (PostgreSQL)  │  │                 │          │
│  │ • Email/Pass    │  │ • users         │  │ • avatars       │          │
│  │ • OAuth         │  │ • items         │  │ • uploads       │          │
│  │ • Magic Links   │  │ • subscriptions │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PAYMENT PROVIDERS                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │         Stripe              │  │       RevenueCat            │       │
│  │    (Web Payments)           │  │   (Mobile Payments)         │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Three Starter Kits

### 1. iOS/Mobile Starter (IOS-* features)
- **Tech Stack**: React Native, Expo, Expo Router, Supabase, RevenueCat
- **Timeline**: 6-10 days
- **Features**: Auth, subscriptions, navigation, settings, dark mode

### 2. Backend API Starter (BACK-* features)
- **Tech Stack**: Next.js API Routes, Supabase, Stripe, RevenueCat webhooks
- **Timeline**: 4-5 days
- **Features**: REST API, auth middleware, rate limiting, CORS, webhooks

### 3. Web App Starter (WEB-* features)
- **Tech Stack**: Next.js 14, Tailwind CSS, shadcn/ui, React Query, Stripe
- **Timeline**: 5-6 days
- **Features**: Auth pages, dashboard, pricing, billing, dark mode, SEO

## Project Structure

```
app-kit/
├── ios-starter/           # iOS/Mobile React Native app
│   ├── app/               # Expo Router screens
│   ├── components/        # UI components
│   ├── hooks/             # Data hooks
│   ├── providers/         # Context providers
│   ├── lib/               # Utilities (supabase, revenuecat)
│   ├── types/             # TypeScript types
│   └── constants/         # Config, colors
│
├── backend-kit/           # Next.js API backend
│   ├── app/api/           # API routes
│   ├── lib/               # Supabase, auth, payments, utils
│   ├── types/             # TypeScript types
│   └── supabase/          # Database schema
│
├── web-kit/               # Next.js web frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── hooks/             # React Query hooks
│   ├── lib/               # Supabase, stripe
│   ├── config/            # Site, nav config
│   └── types/             # TypeScript types
│
├── docs/                  # Shared documentation
├── templates/             # Boilerplate templates
├── examples/              # Example customizations
└── feature_list.json      # Feature tracking
```

## Commands

```bash
# iOS Starter
cd ios-starter && npm install && npx expo start

# Backend
cd backend-kit && npm install && npm run dev

# Web
cd web-kit && npm install && npm run dev
```

## Session Goal
**ACTION REQUIRED**: Find the FIRST feature in `feature_list.json` where `"passes": false`, implement it using TDD, then mark it `"passes": true`.

DO NOT just analyze or report status. Actually implement code for pending features.

### Your TDD workflow each session:
1. **READ**: Find the first feature with `"passes": false` in `feature_list.json`
2. **RED**: Write a failing test for that feature first
   - Create test in `__tests__/` for unit tests
3. **GREEN**: Implement the minimum code to make the test pass
   - Create/edit source files as needed
   - Follow the relevant PRD for requirements
4. **REFACTOR**: Clean up code if needed while keeping tests green
5. **MARK COMPLETE**: Edit `feature_list.json` to set `"passes": true`
6. **REPEAT**: Move to next pending feature

### Feature ID Prefixes:
- `IOS-*` → Work in `ios-starter/`
- `BACK-*` → Work in `backend-kit/`
- `WEB-*` → Work in `web-kit/`

### Implementation Guidelines:
1. Check the `kit` field to know which directory to work in
2. Read the relevant PRD for detailed requirements
3. Use TypeScript for all code
4. Follow existing patterns when present
5. Create comprehensive types in `types/` directory
6. Add proper error handling

## How to Mark a Feature Complete
After implementing a feature, edit `feature_list.json` and find the feature by its ID (e.g., "IOS-AUTH-001"), then change `"passes": false` to `"passes": true`. Example:
```json
{
  "id": "IOS-AUTH-001",
  "name": "Supabase Client Setup",
  "passes": true,  // <-- Change this from false to true
  ...
}
```

## IMPORTANT: Remove TODO Stubs from Production

The paywall screen has placeholder purchase logic:
- `ios-starter/app/paywall.tsx:184` → "TODO: Replace with actual RevenueCat implementation"
- `ios-starter/app/paywall.tsx:197` → "TODO: Replace with actual RevenueCat implementation"

**Action:** Implement real RevenueCat SDK for purchases and subscriptions. **NEVER use TODO stubs with fake returns in production code.**

Remember:
- **147 total features** across 3 starter kits
- Work on ONE feature at a time
- Always update `feature_list.json` when done
- Check the `acceptance` array for completion criteria
- **NEVER use mock data or placeholder implementations in production**
