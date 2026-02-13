# Cross-System Integration Implementation Plan

## Current State
- 235 features across 26 categories, **0 passing**
- Existing: Supabase schema (ACD-specific), Express+Prisma backend, user event tracking
- Missing: All shared packages, cross-product tables, client SDKs, API gateway

## Strategy: Build all 235 features in dependency order across 8 phases

### Phase 1: Database Foundations + Shared Types
- DB-001: shared_users table
- DB-002: shared_entitlements table
- DB-003: shared_assets table
- DB-004: shared_events table
- DB-005: RLS policies for product isolation
- DB-006: Cross-product analytics views
- GAP-003: shared.person table
- MIGRATE-001: Cross-product migration system
- MIGRATE-002: Data seeding
- DX-001: Monorepo packages/ setup
- DX-003: @acd/types package with Zod schemas

### Phase 2: Auth + Security
- AUTH-001: Shared Supabase auth config
- AUTH-002: Cross-product session sharing
- AUTH-003: Product-specific roles
- AUTH-004: Unified user profiles
- AUTH-005: Cross-product OAuth
- STRIPE-001: Shared Stripe customer
- STRIPE-002: Product-specific subscriptions
- STRIPE-003: Bundle pricing
- SEC-001: Centralized secrets management
- SEC-002: API key encryption at rest
- SEC-003: JWT token rotation
- SEC-004: Webhook signature verification
- SEC-005: Inter-service request signing
- SEC-006: CSP headers
- SEC-007: Auth rate limiting
- EMAIL-001: Shared Resend config
- EMAIL-002: Cross-product email prefs

### Phase 3: Client SDKs + API Gateway
- RC-001: Remotion TypeScript client SDK
- MH-001: Meta Marketing API client library
- GW-001: API key management
- GW-002: Per-consumer rate limiting
- GW-003: Request logging/audit
- GW-004: API versioning
- GW-005: GraphQL gateway
- AN-001: Shared event tracking SDK
- AST-001: Shared asset storage
- AST-002: Asset deduplication
- AST-003: Asset tagging/search
- AST-004: Asset usage tracking
- AST-005: Meta asset upload
- RES-001: Remotion circuit breaker
- RES-002: Meta API retry/backoff
- RES-003: Dead letter queue
- RES-004: AI service degradation
- RES-005: DB connection pooling

### Phase 4: Product Integrations
- RC-002: Content Factory Remotion
- RC-003: PCT Remotion static ads
- RC-004: PCT Remotion mini-VSL
- RC-005: MediaPoster Remotion
- RC-006: WaitlistLab Remotion
- RC-007: Job status webhooks
- RC-008: Batch job submission
- MH-002: PCT Meta integration
- MH-003: Content Factory Meta
- MH-004: Shared Pixel CAPI
- MH-005: Cross-product attribution
- MH-006: Meta rate limit pooling
- PCT-WL-001: PCT → WaitlistLab campaigns
- PCT-WL-002: PCT → WaitlistLab ads
- PCT-WL-003: PCT insights via WaitlistLab
- VOICE-001: Shared voice storage
- VOICE-002: PCT voice reference
- VOICE-003: CF voice cloning
- GAP-001: Unified CAPI ingest
- GAP-002: Cross-product attribution engine
- GAP-005: Meta Pixel+CAPI snippet
- GAP-006: Non-WL conversion edge function

### Phase 5: Publishing + Workflows
- CF-TIKTOK-001: TikTok OAuth
- CF-TIKTOK-002: TikTok video upload
- CF-TIKTOK-003: TikTok Shop affiliate
- PUB-001: CF TikTok publishing API
- PUB-002: CF TikTok Promote
- PUB-003: MediaPoster Instagram
- PUB-004: MediaPoster YouTube
- PUB-005: Cross-platform syndication
- PUB-006: CF → MediaPoster handoff
- PUB-007: ShortsLinker YouTube
- FLOW-001: Content approval workflow
- FLOW-002: Multi-step content pipeline
- FLOW-003: PCT hook → ad pipeline
- TEMPLATE-001: Shared template library
- TEMPLATE-002: Custom template upload
- TEMPLATE-003: Template A/B testing
- RES-006: TikTok fallback
- RES-007: Asset upload retry
- SYNC-001: Meta ad status sync
- SYNC-002: TikTok video sync
- SYNC-003: Stripe subscription sync

### Phase 6: Infrastructure Services
- JOB-001: BullMQ/Inngest queue
- JOB-002: Scheduled jobs
- JOB-003: Video render jobs
- JOB-004: Meta ad publishing queue
- JOB-005: CF video pipeline jobs
- JOB-006: Analytics aggregation
- JOB-007: Cleanup jobs
- WH-001: Webhook delivery
- WH-002: Remotion webhooks
- WH-003: Stripe webhook hub
- WH-004: Meta webhook hub
- WH-005: TikTok webhooks
- WH-006: Custom subscriptions
- CACHE-001: Redis cluster
- CACHE-002: Session caching
- CACHE-003: API response caching
- CACHE-004: Asset metadata caching
- CACHE-005: Meta insights caching
- PERF-001: CDN configuration
- PERF-002: DB query optimization
- PERF-003: Image optimization

### Phase 7: Analytics + Monitoring + UI
- AN-002: Cross-product funnels
- AN-003: Creative performance
- AN-004: PCT feedback loop
- AN-005: TikTok metrics
- AN-006: Unified analytics dashboard
- GAP-004: Ad insights in ACD
- MON-001 to MON-007: Logging, APM, health, rate limits, cost, queues, sessions
- NOTIFY-001 to NOTIFY-003: Slack, email, in-app
- UI-001 to UI-010: Design system, buttons, forms, modals, tables, toasts, nav, loading, cards, charts
- INT-PCT-001/002, INT-CF-001/002, INT-MP-001/002: Product analytics
- INT-REM-001/002/003: Remotion marketplace/history/library
- INT-WL-001/002: Campaign templates, audience sharing

### Phase 8: Enterprise Features
- FF-001 to FF-006: Feature flags
- BILL-001 to BILL-006: Billing/metering
- AI-001 to AI-006: AI orchestration
- COST-001 to COST-003: Cost tracking
- COMP-001 to COMP-006: Compliance/GDPR
- ADMIN-001 to ADMIN-006: Admin panel
- MT-001 to MT-005: Multi-tenancy
- AFF-001 to AFF-005: Affiliates
- SEARCH-001 to SEARCH-004: Full-text search
- I18N-001 to I18N-004: Localization
- MOB-001 to MOB-004: Mobile
- OB-001 to OB-005: Onboarding
- MOD-001 to MOD-004: Moderation
- EXP-001 to EXP-004: Export/import
- SH-001, BC-001, VH-001, VP-001, SL-001: Product auth
- MP-CF-001, MP-SL-001, CC-001: Product publishing
- GAPRADAR-001/002, MOBILE-001/002: Cross-product data
- GAP-007: Custom Audience sync
- SCALE-001/002: Scaling
- DX-002,004,005,006,007: DX tooling
