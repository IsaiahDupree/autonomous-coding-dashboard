#!/usr/bin/env python3
"""Feature definitions for all ACTP Lite systems."""

SERVICES = {
    "metricslite": {"name": "MetricsLite", "path": "/Users/isaiahdupree/Documents/Software/metricslite", "desc": "Analytics cron polling service", "stack": "Next.js 16, Supabase, Vercel Cron"},
    "genlite": {"name": "GenLite", "path": "/Users/isaiahdupree/Documents/Software/genlite", "desc": "Video generation job queue", "stack": "Next.js 16, Supabase, Sora/Veo3/Nano Banana"},
    "adlite": {"name": "AdLite", "path": "/Users/isaiahdupree/Documents/Software/adlite", "desc": "Ad deployment and budget management", "stack": "Next.js 16, Supabase, Meta/TikTok Ads API"},
    "actpdash": {"name": "ACTPDash", "path": "/Users/isaiahdupree/Documents/Software/actpdash", "desc": "Campaign management dashboard", "stack": "Next.js 16, Supabase, shadcn/ui, Recharts"},
    "actp-worker": {"name": "actp-worker", "path": "/Users/isaiahdupree/Documents/Software/actp-worker", "desc": "Local macOS worker daemon", "stack": "Python 3.11+, asyncio, httpx"},
    "hooklite": {"name": "HookLite", "path": "/Users/isaiahdupree/Documents/Software/hooklite", "desc": "Webhook receiver service", "stack": "Next.js 16, Supabase, Tailwind CSS"},
    "mediaposter-lite": {"name": "MPLite", "path": "/Users/isaiahdupree/Documents/Software/mediaposter-lite", "desc": "Organic publishing queue", "stack": "Next.js 16, Supabase, Tailwind CSS"},
}

def _common_nextjs(P, name, kp):
    """Common features for all Next.js Lite services (~95 features)."""
    f = []
    # Setup (15)
    for i, d in enumerate([
        "Initialize Next.js 16 project with App Router", "Configure TypeScript strict mode + path aliases",
        "Set up Tailwind CSS v4 with custom theme", "Configure ESLint next/core-web-vitals",
        "Create .env.local.example with all env vars", "Configure vercel.json (framework, build, functions)",
        "Set up Supabase client (anon + service role)", "Create .gitignore", "Create postcss.config.mjs",
        "Create next.config.ts production-ready", "Set up package.json with deps + scripts",
        "Create README.md with setup/API/architecture docs", "Configure path aliases in tsconfig.json",
        "Set up global CSS with Tailwind + CSS variables", "Create root layout.tsx with nav + metadata"
    ], 1):
        f.append((f"{P}-SETUP-{i:03d}", d))
    # Auth (10)
    for i, d in enumerate([
        f"API key generation with {kp}_ prefix and SHA-256 hashing", "API key validation against Supabase",
        f"Master key auth via {name.upper()}_MASTER_KEY env var", "requireAuth helper for Bearer tokens",
        "Middleware: protect API, allow public endpoints", "Dashboard routes bypass API key auth",
        "Track last_used on key validation", "Key expiration with expires_at", "Permission-based access control",
        "Proper 401/403 responses with error messages"
    ], 1):
        f.append((f"{P}-AUTH-{i:03d}", d))
    # API helpers (8)
    for i, d in enumerate([
        "ok() helper for success responses", "err() helper for error responses",
        "IP extraction from x-forwarded-for", "Request header extraction utility",
        "Activity logging to activity_log table", "Body parsing with malformed JSON handling",
        "CORS headers for cross-origin access", "Rate limiting on API endpoints"
    ], 1):
        f.append((f"{P}-API-{i:03d}", d))
    # Health (5)
    for i, d in enumerate([
        "GET /api/health: service name, version, status", "Supabase connectivity check in health",
        "Timestamp + uptime in health response", "Service-specific stats in health", "HTTP 503 if DB unreachable"
    ], 1):
        f.append((f"{P}-HEALTH-{i:03d}", d))
    # Quality (10)
    for i, d in enumerate([
        "All routes return proper HTTP status codes", "All routes have try-catch with structured errors",
        "No hardcoded secrets in source", "Env vars validated on startup", "No mock data/providers in production",
        "Parameterized DB queries (no SQL injection)", "TypeScript types for all request/response shapes",
        "No 'any' types in production code", "All async properly awaited with error boundaries",
        "Consistent JSON response format everywhere"
    ], 1):
        f.append((f"{P}-QUAL-{i:03d}", d))
    # Security (8)
    for i, d in enumerate([
        "Input validation on all POST/PUT bodies", "Request size limits", "API key hashing with SHA-256",
        "Timing-safe comparison for signatures", "No sensitive data in error responses",
        "Env validation prevents startup without secrets", "Rate limiting on auth endpoints", "HTTPS-only in production"
    ], 1):
        f.append((f"{P}-SEC-{i:03d}", d))
    # Testing (20)
    for i, d in enumerate([
        "Unit tests for API helpers", "Unit tests for auth/key validation",
        "Integration tests: all endpoints happy path", "Integration tests: error cases",
        "Test auth middleware", "Test health endpoint structure", "Test key gen/validation round-trip",
        "Test master key bypass", "Test rate limiting", "Test CORS headers",
        "Test malformed JSON handling", "Test missing fields return 400", "Test unauthorized returns 401",
        "Test not found returns 404", "E2E: full workflow API→DB", "Test DB error handling",
        "Test concurrent requests", "Smoke test all dashboard pages", "Test CLI commands",
        "Test env validation on startup"
    ], 1):
        f.append((f"{P}-TEST-{i:03d}", d))
    # UI common (12)
    for i, d in enumerate([
        "Responsive nav sidebar with service name", "Dark mode with CSS variables",
        "Loading skeleton components", "Error boundary component", "API key input modal",
        "localStorage API key persistence", "Status badge component", "Data table with sort/filter",
        "Pagination component", "Toast notifications", "Mobile-responsive layout", "Empty state component"
    ], 1):
        f.append((f"{P}-UI-{i:03d}", d))
    return f

# ─── MetricsLite ──────────────────────────────────────────
def metricslite_features():
    P = "ML"
    f = _common_nextjs(P, "MetricsLite", "mlk")
    n = len(f)
    domain = [
        # Cron (10)
        "POST /api/cron/organic-metrics: collect organic post metrics",
        "POST /api/cron/ad-metrics: collect ad deployment metrics",
        "POST /api/cron/threshold-check: generate alerts",
        "Validate CRON_SECRET header on cron endpoints",
        "Write cron run records to actp_cron_runs with timing",
        "Handle 60s Vercel timeout with partial-completion logging",
        "vercel.json crons: organic 30min, ads 30min, threshold hourly",
        "Idempotency: skip if last run < 20min ago",
        "Batch platform API calls within rate limits",
        "Log errors per-post without failing entire run",
        # YouTube (8)
        "YouTube Data API v3 integration for video stats",
        "Batch YouTube calls (50 IDs per request)",
        "Parse YouTube: viewCount, likeCount, commentCount",
        "YouTube quota tracking (10K units/day)",
        "Handle YouTube errors: quotaExceeded, videoNotFound",
        "Map YouTube metrics to ACTP standard format",
        "Cache YouTube responses 15min to reduce quota",
        "Extract YouTube engagement rate + duration",
        # TikTok (8)
        "TikTok Content API for video stats",
        "TikTok auth with access token refresh",
        "Parse TikTok: play_count, like_count, comment_count, share_count",
        "TikTok rate limits (1K req/day basic)",
        "Map TikTok metrics to ACTP format",
        "Handle TikTok errors: token_expired, rate_limited",
        "Extract TikTok avg watch time + completion rate",
        "Handle TikTok sandbox vs production",
        # Instagram (6)
        "Instagram Graph API / RapidAPI for reel stats",
        "Parse Instagram: impressions, reach, likes, comments, shares, saves",
        "RapidAPI rate limit handling",
        "Map Instagram metrics to ACTP format",
        "Cache Instagram responses 30min TTL",
        "Handle Instagram errors: invalid_token, rate_limit",
        # Meta Ads (8)
        "Meta Marketing API ad campaign insights",
        "Batch Meta requests for multiple ad IDs",
        "Parse Meta: impressions, clicks, spend, ctr, cpc, conversions",
        "Meta API rate limits + request windowing",
        "Map Meta ad metrics to ACTP format",
        "Track cumulative spend in actp_ad_deployments.spend_cents",
        "Handle Meta errors: OAuthException, rate_limit",
        "Support Meta Marketing API v21 versioning",
        # TikTok Ads (6)
        "TikTok Business API ad campaign reporting",
        "TikTok /report/integrated/get/ endpoint",
        "Parse TikTok ads: impressions, clicks, spend, conversions",
        "TikTok Business API auth + token management",
        "Map TikTok ad metrics to ACTP format",
        "Handle TikTok Business API errors",
        # Normalization (8)
        "Normalize all metrics to standard keys: views, likes, comments, shares, ctr",
        "Write normalized metrics to actp_performance_logs",
        "Update actp_organic_posts.metrics JSONB snapshot",
        "Update actp_ad_deployments.metrics JSONB snapshot",
        "Calculate engagement rate from weighted formula",
        "Calculate organic_score from metrics",
        "Store raw API response in raw_data for debugging",
        "Metric deduplication (skip if unchanged)",
        # Alerts (8)
        "Detect viral: views > 10K in first 24h",
        "Detect engagement drop: rate drops > 50%",
        "Detect spend alert: daily spend exceeds cap",
        "Detect fatigue: CTR drops > 30% over 3 checks",
        "Write alerts to actp_metric_alerts",
        "Prevent duplicate alerts (6h cooldown)",
        "Configurable thresholds per campaign",
        "Alert severity levels: info, warning, critical",
        # Endpoints (10)
        "GET /api/status: last run times, collection counts",
        "GET /api/metrics/:creative_id: all metrics for creative",
        "GET /api/metrics/:creative_id/timeseries: chart data",
        "GET /api/alerts: active alerts with pagination",
        "POST /api/alerts/:id/acknowledge",
        "GET /api/runs: recent cron runs",
        "POST /api/collect/:post_id: manual single-post collection",
        "GET /api/stats: aggregated collection statistics",
        "All list endpoints support limit/offset pagination",
        "All list endpoints support platform/campaign/date filters",
        # Dashboard pages (5)
        "Dashboard /: overview with run status, posts tracked, alerts",
        "Dashboard /alerts: alert list with severity badges, acknowledge",
        "Dashboard /runs: cron history with success/fail, duration",
        "Dashboard /metrics/[id]: creative timeseries charts",
        "Dashboard /settings: API key mgmt, threshold config",
        # Extra tests (10)
        "Test YouTube API integration with real key",
        "Test TikTok API integration with real token",
        "Test metric normalization consistency across platforms",
        "Test threshold alert detection accuracy",
        "Test cron idempotency (no duplicate data)",
        "Test cron timeout handling with partial completion",
        "Test metric deduplication logic",
        "Test API quota tracking enforcement",
        "Test timeseries endpoint date ordering",
        "Integration: full cron cycle API→DB",
        # CLI (15)
        "CLI entry point with command routing",
        "CLI help command with usage docs",
        "CLI env var auth (METRICSLITE_URL, METRICSLITE_KEY)",
        "CLI tabular output for lists",
        "CLI JSON output for details",
        "CLI timeAgo helper for timestamps",
        "CLI network error handling with retry",
        "CLI --json flag for machine output",
        "CLI: metricslite health",
        "CLI: metricslite status",
        "CLI: metricslite collect <post_id>",
        "CLI: metricslite alerts",
        "CLI: metricslite alerts ack <id>",
        "CLI: metricslite runs",
        "CLI: metricslite stats",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── GenLite ──────────────────────────────────────────────
def genlite_features():
    P = "GL"
    f = _common_nextjs(P, "GenLite", "gl")
    domain = [
        # Job API (18)
        "POST /api/jobs: submit generation job", "Validate job: required model, prompt, brief",
        "Support models: sora, veo3, nano_banana, remotion", "Auto-set executor: cloud vs local",
        "GET /api/jobs: filter by status, model, campaign", "GET /api/jobs/:id: job details",
        "POST /api/jobs/:id/cancel", "POST /api/jobs/:id/retry with attempt reset",
        "GET /api/jobs/next: local_only jobs for worker", "POST /api/jobs/:id/claim: worker claims",
        "POST /api/jobs/:id/complete with output_url", "POST /api/jobs/:id/fail with error",
        "GET /api/stats: counts by model/status", "GET /api/providers: API key status per provider",
        "Priority ordering (1=highest, 10=lowest)", "Pagination on job list",
        "Filter by date range", "Sort by priority, created_at, status",
        # Sora (10)
        "Sora API client for video generation", "Submit to POST /v1/videos/generations",
        "Store provider_job_id from Sora", "Poll Sora for completion status",
        "Download Sora video from temp URL", "Upload Sora output to Supabase Storage",
        "Handle Sora errors: rate_limit, content_policy, timeout", "10-min Sora timeout",
        "Parse Sora metadata: resolution, duration, format", "Sora aspect ratio + duration params",
        # Veo3 (8)
        "Veo3 API client for video gen", "Submit to predictLongRunning endpoint",
        "Poll Veo3 operation status", "Download from GCS URI",
        "Upload Veo3 to Supabase Storage", "Handle Veo3 errors: quota, safety_filter",
        "15-min Veo3 timeout", "Veo3 style + aspect ratio params",
        # Nano Banana (6)
        "Nano Banana API client", "Submit generation request",
        "Poll/webhook for completion", "Handle errors + rate limits",
        "5-min timeout", "Upload to Supabase Storage",
        # Remotion local (6)
        "Mark Remotion jobs executor='local'", "Include template + props in brief",
        "Support template selection (hook-cta-vertical, etc.)", "Track local job claiming + worker assignment",
        "Handle local timeout (10min no heartbeat = release)", "Auto-release stale claims",
        # Cron (8)
        "POST /api/cron/poll-providers every 2min", "POST /api/cron/retry-failed every 15min",
        "vercel.json cron config", "CRON_SECRET validation",
        "Poll all submitted/generating jobs", "Auto-retry failed under max_attempts with backoff",
        "Log polling to actp_cron_runs", "Handle provider downtime gracefully",
        # Storage (6)
        "Upload videos to Supabase Storage bucket", "Generate public URLs",
        "Store file size + metadata on completion", "Generate thumbnails",
        "Update actp_creatives.video_url on link", "Clean up expired provider URLs",
        # Dashboard (5)
        "Dashboard /: live job queue by campaign", "Dashboard /jobs/[id]: brief, logs, preview, retry",
        "Dashboard /providers: health, keys, usage", "Dashboard /stats: counts, rates, duration by model",
        "Dashboard /settings: API keys, provider config",
        # Extra tests (10)
        "Test Sora API e2e", "Test Veo3 API e2e", "Test Nano Banana API e2e",
        "Test job validation rejects invalid briefs", "Test cancel updates status",
        "Test retry increments attempts", "Test claiming prevents double-claim",
        "Test cron handles mixed statuses", "Test Storage upload produces public URL",
        "Test stale claim release",
        # CLI (16)
        "CLI entry point", "CLI help", "CLI env auth", "CLI tabular output",
        "CLI JSON output", "CLI timeAgo", "CLI error handling", "CLI --json flag",
        "CLI: genlite health", "CLI: genlite jobs", "CLI: genlite jobs <id>",
        "CLI: genlite submit --model sora --prompt '...'", "CLI: genlite cancel <id>",
        "CLI: genlite retry <id>", "CLI: genlite stats", "CLI: genlite providers",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── AdLite ───────────────────────────────────────────────
def adlite_features():
    P = "AL"
    f = _common_nextjs(P, "AdLite", "alk")
    domain = [
        # Action queue (8)
        "POST /api/actions: submit ad action", "Support types: deploy, scale_up/down, pause, resume, kill",
        "GET /api/actions: filter by status, campaign, platform", "GET /api/actions/:id",
        "POST /api/actions/:id/cancel", "POST /api/actions/:id/retry",
        "Priority ordering in action queue", "Action idempotency: prevent duplicates",
        # High-level (8)
        "POST /api/deploy: full campaign structure creation", "POST /api/scale: budget scaling",
        "POST /api/pause/:deployment_id", "POST /api/kill/:deployment_id",
        "GET /api/deployments: active with metrics", "GET /api/deployments/:id with spend history",
        "Deploy creates Campaign→AdSet→Ad on Meta", "Deploy creates Campaign→AdGroup→Ad on TikTok",
        # Budget rules (10)
        "GET /api/rules", "POST /api/rules", "PUT /api/rules/:id", "DELETE /api/rules/:id",
        "Rule types: auto_scale, spend_cap, fatigue_kill, time_limit",
        "Rule condition evaluation (>, <, >=, <=, ==)", "Rule actions: scale_up/down, pause, kill",
        "Default rule: kill if 2x budget no conversions", "Campaign rules override globals",
        "Track rule triggers (last_triggered_at, count)",
        # Meta Ads (10)
        "Meta Marketing API v21 campaign creation", "Create campaign with objective + budget",
        "Create ad set with audience + placement", "Create ad with video creative",
        "Update ad set budget (scale)", "Pause campaign via status update",
        "Delete/archive campaign", "Handle Meta errors: OAuth, rate_limit, validation",
        "Store external IDs in actp_ad_deployments", "Meta audience targeting: age, gender, interests, locations",
        # TikTok Ads (8)
        "TikTok Business API v1.3 ad management", "Create TikTok campaign with budget",
        "Create TikTok ad group with targeting", "Create TikTok ad with video",
        "Update TikTok budget", "Pause TikTok campaign",
        "Handle TikTok API errors", "Store TikTok external IDs",
        # Cron (8)
        "POST /api/cron/execute-actions every 5min", "POST /api/cron/budget-pacing hourly",
        "POST /api/cron/fatigue-check every 2h", "POST /api/cron/spend-caps hourly",
        "vercel.json cron config", "CRON_SECRET validation",
        "Execute pending actions in priority order", "Auto-retry failed under max_attempts",
        # Fatigue (6)
        "Detect CTR drop > 30% over 3 checks → fatigue", "Detect frequency > 3.0 → saturated",
        "Detect CPA increase > 50% → inflated", "Auto-pause fatigued ads",
        "Create metric alert for fatigue", "Store fatigue history",
        # Spend (6)
        "Track daily spend per campaign", "Campaign daily spend cap enforcement",
        "Per-ad daily spend cap", "Auto-scale winner budgets",
        "Scale factor with max cap", "GET /api/stats: spend summary",
        # Dashboard (6)
        "Dashboard /: active deployments with spend, CTR, CPA", "Dashboard /deployments/[id]: metrics, budget, actions",
        "Dashboard /actions: queue with status tracking", "Dashboard /rules: budget rule editor",
        "Dashboard /spend: daily/weekly charts", "Dashboard /settings: keys, rules, credentials",
        # Extra tests (10)
        "Test Meta campaign creation e2e", "Test TikTok campaign creation e2e",
        "Test budget scaling updates platform API", "Test fatigue detection on CTR drop",
        "Test spend cap pauses ads", "Test action queue priority order",
        "Test rule condition evaluation", "Test deploy creates full structure",
        "Test concurrent actions no duplicates", "Integration: deploy→metrics→scale",
        # CLI (18)
        "CLI entry point", "CLI help", "CLI env auth", "CLI tabular output",
        "CLI JSON output", "CLI timeAgo", "CLI error handling", "CLI --json flag",
        "CLI: adlite health", "CLI: adlite deployments", "CLI: adlite deployments <id>",
        "CLI: adlite deploy --creative <id> --platform meta --budget 500",
        "CLI: adlite scale <id> --factor 2.0", "CLI: adlite pause <id>",
        "CLI: adlite kill <id>", "CLI: adlite actions", "CLI: adlite rules", "CLI: adlite stats",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── ACTPDash ─────────────────────────────────────────────
def actpdash_features():
    P = "AD"
    f = _common_nextjs(P, "ACTPDash", "ad")
    # Override auth with Supabase Auth
    f = [x for x in f if not x[0].startswith(f"{P}-AUTH-")]
    auth = [
        "Supabase Auth email/password sign-in", "Supabase Auth magic link sign-in",
        "Login page with email/password form", "Sign-up page with email verification",
        "Auth middleware protecting all dashboard routes", "Session management with cookies",
        "User profile settings page", "Sign-out with session cleanup",
        "API routes protected by session validation", "Auth errors redirect to login",
    ]
    for i, d in enumerate(auth, 1):
        f.append((f"{P}-AUTH-{i:03d}", d))
    domain = [
        # Campaign API (10)
        "GET /api/campaigns: list with summary stats", "GET /api/campaigns/:id: full details",
        "POST /api/campaigns: create new", "PUT /api/campaigns/:id: update config",
        "POST /api/campaigns/:id/pause", "POST /api/campaigns/:id/resume",
        "Campaign wizard: offer, platforms, budget, angles, schedule",
        "Campaign validation: required fields, limits", "Campaign summary stats aggregation",
        "Campaign timeline: ordered events across rounds",
        # Creative API (8)
        "GET /api/creatives: list with metrics", "GET /api/creatives/:id: full detail",
        "POST /api/creatives/generate: proxy to GenLite", "POST /api/creatives/:id/publish: proxy to MPLite",
        "POST /api/creatives/:id/deploy-ad: proxy to AdLite", "Filter by campaign, round, status, winner",
        "Sort by organic_score, ad_score, created_at", "Creative comparison side-by-side",
        # Analytics (8)
        "GET /api/analytics/overview: aggregated metrics", "GET /api/analytics/winners: selection history",
        "GET /api/analytics/alerts: proxy MetricsLite", "Cross-creative comparison charts",
        "Platform trend analysis", "ROI calculation: spend vs conversions",
        "Winner reasoning display", "Export analytics as CSV",
        # System (8)
        "GET /api/system/health: aggregate all services", "GET /api/system/webhooks: proxy HookLite",
        "GET /api/system/worker: heartbeat from Supabase", "Service health polling 30s refresh",
        "Service status: healthy, degraded, down", "Cron run history display",
        "Unified log viewer", "Worker heartbeat with last-seen",
        # Service clients (8)
        "MPLite client: queue management, enqueue, history", "GenLite client: jobs, submit, cancel, retry",
        "AdLite client: deploy, scale, pause, kill, rules", "MetricsLite client: status, alerts, runs",
        "HookLite client: events, replay, stats", "All clients use Bearer auth",
        "Client error handling with user messages", "Client timeout handling (5s)",
        # Realtime (7)
        "Realtime on actp_creatives for status updates", "Realtime on actp_organic_posts for publish notifs",
        "Realtime on actp_performance_logs for live metrics", "Realtime on actp_metric_alerts for toasts",
        "Realtime on actp_worker_heartbeats for worker status", "Toast notification component",
        "Auto-refresh tables on Realtime changes",
        # Dashboard pages (23)
        "Page /: campaign list with status, progress, spend",
        "Page /campaigns/new: creation wizard multi-step form",
        "Page /campaigns/[id]: rounds, creatives, metrics, timeline",
        "Page /campaigns/[id]/settings: config, pause/resume",
        "Page /creatives: grid with thumbnails, scores, status",
        "Page /creatives/[id]: video preview, metrics breakdown",
        "Page /creatives/generate: model selection, prompt, brief",
        "Page /publish: MPLite queue (pending, claimed, completed, failed)",
        "Page /publish/history: published posts with metrics",
        "Page /publish/schedule: calendar view",
        "Page /ads: deployments with spend, CTR, CPA, status",
        "Page /ads/[id]: spend timeline, charts, budget history",
        "Page /ads/rules: budget rule editor",
        "Page /ads/spend: daily/weekly charts by campaign",
        "Page /analytics: cross-creative comparison charts",
        "Page /analytics/winners: selection history + reasoning",
        "Page /analytics/trends: platform analysis",
        "Page /analytics/alerts: alert feed + acknowledge",
        "Page /system: all service health dashboard",
        "Page /system/webhooks: HookLite event feed",
        "Page /system/crons: cron execution history",
        "Page /system/worker: heartbeat, active jobs",
        "Page /system/logs: unified log viewer",
        # UI Components (10)
        "Campaign card: status, progress, spend, best CTR", "Creative card: thumbnail, score, views, winner",
        "Service health bar across all services", "Metric chart (Recharts: line, bar, area)",
        "Alert toast for real-time events", "Nav sidebar with campaign list + status",
        "Video player for creative preview", "Budget rule condition builder UI",
        "Spend chart with daily/weekly toggle", "Timeline component for campaign events",
        # Extra tests (10)
        "Test Supabase Auth sign-in/out", "Test campaign CRUD e2e",
        "Test proxy to MPLite", "Test proxy to GenLite", "Test proxy to AdLite",
        "Test Realtime subscription", "Test campaign wizard validation",
        "Test responsive mobile layout", "Test charts with real data",
        "E2E: create campaign→generate→publish→view metrics",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── actp-worker ──────────────────────────────────────────
def worker_features():
    P = "WK"
    f = []
    # Setup (15)
    setup = [
        "Python project with requirements.txt + venv", ".env.example with all env vars",
        "Config loader from .env + CLI flags", "README.md with setup/usage/architecture",
        "Main worker.py with asyncio event loop", "Structured logging with level control",
        "Supabase client for heartbeat/logging", "httpx async client for REST calls",
        "Graceful shutdown on SIGINT/SIGTERM", "pyproject.toml with metadata",
        ".gitignore for Python", "Typed config dataclass", "Env validation on startup",
        "--verbose flag for debug logging", "Version file + --version flag",
    ]
    for i, d in enumerate(setup, 1):
        f.append((f"{P}-SETUP-{i:03d}", d))
    domain = [
        # Core daemon (10)
        "Main polling loop with configurable interval (10s default)",
        "Task router dispatching to correct executor",
        "Concurrent execution with max_concurrent (default 2)",
        "Job lifecycle: claim→execute→report", "Active job tracking with timeout",
        "Graceful shutdown: finish current job", "Auto-restart loop after errors",
        "Skip jobs needing unavailable capabilities", "Exponential backoff on poll failures",
        "Log job start/end with timing",
        # MPLite poller (10)
        "MPLite poller: GET /api/queue/next", "Claim via POST /api/queue/{id}/claim",
        "Route to Safari or Blotato by config", "Report complete via POST /api/queue/{id}/complete",
        "Report fail via POST /api/queue/{id}/fail", "Download video to temp dir before upload",
        "Handle MPLite API errors + retry", "Respect platform field for routing",
        "Include caption, hashtags, metadata", "Handle video download failures",
        # GenLite poller (8)
        "GenLite poller: GET /api/jobs/next for local_only", "Claim via POST /api/jobs/{id}/claim",
        "Route to Remotion executor", "Report complete with output_url",
        "Report fail with error", "Upload rendered video to Supabase Storage",
        "Handle GenLite API errors + retry", "Parse template + props from brief",
        # Safari executor (10)
        "Safari executor wrapping safari_tiktok_cli", "Safari executor wrapping safari_instagram_poster",
        "YouTube upload via Safari automation", "Download video to temp before upload",
        "Launch Safari via AppleScript subprocess", "Wait for upload completion (5min timeout)",
        "Capture post URL from Safari output", "Handle Safari crash: kill, retry once, fail",
        "Caption + hashtag injection", "Clean up temp files after upload",
        # Blotato executor (8)
        "Blotato executor via local HTTP API", "Discover Blotato port from config",
        "Upload via POST /api/upload", "Poll for upload completion",
        "Handle Blotato unreachable: skip, log warning", "Support all Blotato platforms",
        "Include caption + metadata", "Capture post URL from response",
        # Remotion executor (10)
        "Remotion executor via npx remotion render", "REMOTION_PROJECT_PATH from env",
        "Pass template + JSON props to render", "Monitor render progress via stdout",
        "10-min timeout with kill", "Capture output file path",
        "Upload to Supabase Storage", "Generate thumbnail from first frame",
        "Handle errors: missing template, ffmpeg, OOM", "Clean up after upload",
        # Heartbeat (10)
        "Heartbeat: upsert actp_worker_heartbeats every 60s",
        "Include worker_id, hostname, OS, Python version",
        "Report current job in heartbeat", "Report capabilities (safari, blotato, remotion, ffmpeg)",
        "Report system info: CPU, memory, disk", "Track jobs_completed/failed counters",
        "Set status='offline' on shutdown", "Handle Supabase connection loss in heartbeat",
        "Worker ID format: worker-{hostname}-{pid}", "Heartbeat interval configurable",
        # Capability detection (8)
        "Detect Safari: check osascript + Safari installed", "Detect Blotato: HTTP GET /api/status",
        "Detect Remotion: npx remotion --version", "Detect ffmpeg: ffmpeg -version",
        "Report capabilities in heartbeat", "Skip jobs needing missing capabilities",
        "CLI: actp-worker check-all diagnostics", "Log detected capabilities on startup",
        # CLI (15)
        "CLI: actp-worker start", "CLI: actp-worker start --poll-interval 5",
        "CLI: actp-worker start --services mplite", "CLI: actp-worker start --daemon",
        "CLI: actp-worker status", "CLI: actp-worker stop",
        "CLI: actp-worker logs", "CLI: actp-worker logs --level error",
        "CLI: actp-worker capabilities", "CLI: actp-worker run-safari --video ... --platform tiktok",
        "CLI: actp-worker run-blotato --video ... --platform instagram",
        "CLI: actp-worker run-remotion --template hook-cta --props '{...}'",
        "CLI: actp-worker check-safari", "CLI: actp-worker check-blotato", "CLI: actp-worker check-remotion",
        # launchd (5)
        "Create com.actp.worker.plist template", "CLI: actp-worker install-service",
        "CLI: actp-worker uninstall-service", "RunAtLoad + KeepAlive in plist",
        "Log stdout/stderr to /tmp/actp-worker.log",
        # Error handling (8)
        "Network failure: exponential backoff (10s→20s→40s→5min max)",
        "Safari crash: kill process, retry once, fail", "Blotato unreachable: skip, log, retry next poll",
        "Remotion timeout: kill after 10min, fail", "Disk full: check space before download, skip if <1GB",
        "Supabase connection loss: cache heartbeat, retry", "Job timeout: release claim after 15min",
        "Graceful degradation: missing capabilities don't crash worker",
        # Testing (25)
        "Unit test config loader", "Unit test task router", "Unit test heartbeat reporter",
        "Unit test MPLite poller claim/report", "Unit test GenLite poller claim/report",
        "Unit test Safari executor command building", "Unit test Blotato executor HTTP calls",
        "Unit test Remotion executor command building", "Unit test capability detection",
        "Unit test exponential backoff logic", "Integration: MPLite poll→claim→execute→report",
        "Integration: GenLite poll→claim→render→report", "Test graceful shutdown finishes job",
        "Test concurrent job limit enforcement", "Test stale job release after timeout",
        "Test heartbeat updates Supabase correctly", "Test offline status on shutdown",
        "Test capabilities reported accurately", "Test CLI start command",
        "Test CLI status command", "Test CLI stop command",
        "Test launchd plist generation", "Test env validation errors",
        "Test network retry logic", "E2E: worker processes real MPLite queue item",
        # Quality (10)
        "No hardcoded secrets in source", "Env vars validated on startup",
        "No mock data in production", "Structured logging all operations",
        "Proper error messages for all failures", "Type hints on all functions",
        "Docstrings on all public functions", "Clean process management (no zombie processes)",
        "Temp file cleanup on all code paths", "Resource limits (max concurrent, disk space)",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── HookLite (existing, add more features) ──────────────
def hooklite_features():
    P = "HL"
    f = _common_nextjs(P, "HookLite", "hlk")
    domain = [
        # Webhook routes (12)
        "POST /api/hooks/meta: Meta Ads webhook with HMAC-SHA256 validation",
        "GET /api/hooks/meta: Meta verification challenge handler",
        "POST /api/hooks/tiktok: TikTok Ads webhook with signature validation",
        "POST /api/hooks/stripe: Stripe webhook with v1 signature validation",
        "POST /api/hooks/waitlistlab: WaitlistLab webhook with Bearer token",
        "POST /api/hooks/mplite: MPLite webhook with Bearer token",
        "POST /api/hooks/generic: Generic webhook with master key",
        "Log all webhook events to actp_webhooks table",
        "Extract source IP, event type, headers for each webhook",
        "Return webhook_id in response for tracking",
        "Signature validation per platform (HMAC-SHA256, Stripe v1, Bearer)",
        "Timing-safe signature comparison to prevent timing attacks",
        # Handlers (10)
        "Meta handler: update actp_ad_deployments on ad status changes",
        "TikTok handler: update actp_ad_deployments on ad status changes",
        "Stripe handler: log payment events to actp_performance_logs",
        "WaitlistLab handler: log conversions to actp_performance_logs",
        "MPLite handler: record publish completions in actp_organic_posts",
        "MPLite handler: record publish failures in actp_organic_posts",
        "Generic handler: log events with source/type from headers",
        "Handler result stored in actp_webhooks.handler_result",
        "Mark webhook as handled after successful handler execution",
        "Handler errors logged without failing webhook response",
        # Events API (10)
        "GET /api/events: list with source, status, pagination",
        "GET /api/events/:id: full event detail with payload + headers",
        "POST /api/events/:id/replay: re-process through handler",
        "GET /api/stats: event statistics by source, 24h/7d counts",
        "Filter events by source, event_type, signature_valid, handled",
        "Pagination with limit/offset on events list",
        "Sort events by received_at DESC",
        "Event replay re-runs handler and updates handler_result",
        "Stats endpoint includes invalid signature count",
        "Stats breakdown by source with handled/total/invalid counts",
        # Validators (8)
        "Meta HMAC-SHA256 signature validation with META_APP_SECRET",
        "Meta verification challenge response for webhook setup",
        "TikTok HMAC-SHA256 signature validation with TIKTOK_APP_SECRET",
        "Stripe v1 signature validation with timestamp tolerance",
        "Common Bearer token validation helper",
        "Common HMAC-SHA256 validation helper",
        "Extract event type from Meta/TikTok/Stripe payloads",
        "Validate webhook payload is valid JSON",
        # Dashboard (5)
        "Dashboard /: event feed with source, type, signature, handled columns",
        "Dashboard /events/[id]: event detail with payload, headers, handler result, replay",
        "Dashboard /sources: per-source overview with endpoint URLs and stats",
        "Dashboard /settings: API key management and webhook endpoint display",
        "Real-time event count updates on dashboard",
        # Extra tests (10)
        "Test Meta HMAC-SHA256 validation with known signature",
        "Test Meta verification challenge response",
        "Test Stripe v1 signature validation with known signature",
        "Test Bearer token validation",
        "Test webhook event logged to actp_webhooks",
        "Test event replay re-runs handler",
        "Test stats endpoint returns correct counts",
        "Test invalid signature is rejected with 401",
        "Test handler errors don't fail webhook response",
        "Integration: webhook receive→validate→log→handle→query",
        # CLI (15)
        "CLI entry point with command routing", "CLI help with usage docs",
        "CLI env auth (HOOKLITE_URL, HOOKLITE_KEY)", "CLI tabular output",
        "CLI JSON output", "CLI timeAgo", "CLI error handling", "CLI --json flag",
        "CLI: hooklite health", "CLI: hooklite events", "CLI: hooklite events <source>",
        "CLI: hooklite event <id>", "CLI: hooklite replay <id>",
        "CLI: hooklite stats", "CLI: hooklite sources",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

# ─── MPLite (existing, add more features) ─────────────────
def mplite_features():
    P = "MP"
    f = _common_nextjs(P, "MPLite", "mpl")
    domain = [
        # Queue API (18)
        "POST /api/queue: enqueue new publish job", "GET /api/queue: list queue items with filters",
        "GET /api/queue/next: get next available item for worker", "GET /api/queue/stats: queue statistics",
        "GET /api/queue/:id: item details", "POST /api/queue/:id/claim: worker claims item",
        "POST /api/queue/:id/complete: worker reports success", "POST /api/queue/:id/fail: worker reports failure",
        "POST /api/queue/:id/cancel: cancel queued item", "POST /api/queue/:id/retry: retry failed item",
        "POST /api/queue/:id/reschedule: change scheduled time",
        "Queue priority ordering (1=highest, 10=lowest)", "Filter by status, platform, date range",
        "Pagination on queue list", "Schedule items for future posting",
        "Auto-retry failed items under max_retries", "Track retry_count per item",
        "Store platform_post_id and platform_url on completion",
        # Platform config (8)
        "GET /api/platforms: list configured platforms", "PUT /api/platforms/:id: update platform config",
        "Platform daily limits enforcement", "Platform posting windows (start/end time, timezone)",
        "Platform default hashtags", "Platform accounts management",
        "Global publishing config (videos_per_day, posts_per_day)",
        "Min interval enforcement between posts",
        # Webhooks (5)
        "GET /api/webhooks: list outbound webhook configs", "POST /api/webhooks: create webhook",
        "PUT /api/webhooks/:id: update webhook", "DELETE /api/webhooks/:id: delete webhook",
        "Fire webhooks on publish_complete/fail events",
        # Activity (5)
        "GET /api/activity: list recent activity log entries", "Activity logged on all queue operations",
        "Filter activity by action, entity_type, date", "Activity includes source IP and user agent",
        "Daily counter tracking per platform",
        # Dashboard (8)
        "Dashboard /: queue overview with status breakdown", "Dashboard /queue: full queue list with actions",
        "Dashboard /queue/[id]: item detail with retry/cancel", "Dashboard /platforms: platform config management",
        "Dashboard /schedules: scheduled posts calendar", "Dashboard /activity: activity log viewer",
        "Dashboard /settings: API keys, webhooks, publishing config",
        "Dashboard /analytics: daily publish counts and platform breakdown",
        # Extra tests (10)
        "Test enqueue creates queue item", "Test claim prevents double-claim",
        "Test complete updates status and timestamps", "Test fail increments retry_count",
        "Test cancel only works on queued/scheduled items", "Test platform daily limit enforcement",
        "Test posting window enforcement", "Test webhook fires on completion",
        "Test queue/next returns highest priority unclaimed", "Integration: enqueue→claim→complete→webhook",
        # CLI (15)
        "CLI entry point", "CLI help", "CLI env auth", "CLI tabular output",
        "CLI JSON output", "CLI timeAgo", "CLI error handling", "CLI --json flag",
        "CLI: mplite health", "CLI: mplite queue", "CLI: mplite queue <id>",
        "CLI: mplite enqueue --platform tiktok --video '...'",
        "CLI: mplite claim", "CLI: mplite complete <id>", "CLI: mplite stats",
    ]
    for i, d in enumerate(domain, 1):
        f.append((f"{P}-DOM-{i:03d}", d))
    return f

def get_all_services():
    """Return dict of service_id → (info, features)."""
    generators = {
        "metricslite": metricslite_features,
        "genlite": genlite_features,
        "adlite": adlite_features,
        "actpdash": actpdash_features,
        "actp-worker": worker_features,
        "hooklite": hooklite_features,
        "mediaposter-lite": mplite_features,
    }
    return {k: (SERVICES[k], fn()) for k, fn in generators.items()}
