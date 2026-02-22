"""Web common features for expansion to ~300."""

def web_common_features(prefix):
    F = []
    idx = 1
    def add(cat, name, desc, crit):
        nonlocal idx
        F.append({"id": f"{prefix}-WC-{idx:03d}", "name": name, "description": desc,
                  "category": cat, "priority": "P2", "passes": False, "effort": "4h", "criteria": crit})
        idx += 1

    # TESTING (30)
    tests = [
        ("Unit tests for auth flows", "Unit tests for sign-in, sign-up, password reset", ["Sign-in", "Sign-up", "Reset", "Session"]),
        ("Unit tests for API route handlers", "Unit tests for all API routes", ["All routes", "Error cases", "Auth middleware"]),
        ("Unit tests for database queries", "Unit tests for CRUD helpers", ["Create/read/update/delete", "Pagination", "Search"]),
        ("Unit tests for form validation", "Unit tests for validation rules", ["Required", "Email", "Password", "Custom"]),
        ("Unit tests for utility functions", "Unit tests for formatting and helpers", ["Date", "Currency", "String", "Edge cases"]),
        ("Unit tests for state management", "Unit tests for stores/context", ["Initial state", "Actions", "Selectors"]),
        ("Integration tests for primary workflow", "Full workflow: sign-up through core action", ["Account", "Onboard", "Action", "Verify"]),
        ("Integration tests for payment flow", "Stripe checkout and webhook test", ["Checkout", "Webhook", "Subscription"]),
        ("Integration tests for import/export", "CSV/JSON import and export", ["Upload", "Map", "Import", "Export"]),
        ("Integration tests for search/filter", "Search, filter, and pagination", ["Text search", "Filters", "Pagination"]),
        ("E2E tests for auth with Playwright", "Playwright auth tests", ["Login", "Signup", "Protected routes"]),
        ("E2E tests for CRUD operations", "Playwright CRUD tests", ["Create", "View", "Edit", "Delete"]),
        ("E2E tests for settings", "Playwright settings tests", ["Profile", "Preferences", "Persistence"]),
        ("E2E tests for responsive layouts", "Playwright breakpoint tests", ["Mobile", "Tablet", "Desktop"]),
        ("E2E tests for error states", "Playwright error/edge tests", ["404", "Error boundary", "Empty state"]),
        ("Performance test: page load < 3s", "Page load optimization", ["LCP < 2.5s", "FID < 100ms", "CLS < 0.1"]),
        ("Performance test: API < 500ms", "API response times", ["List < 500ms", "Detail < 300ms", "Search < 500ms"]),
        ("Performance test: DB queries", "Query optimization", ["No seq scans", "Indexes", "Plans checked"]),
        ("Load test: concurrent users", "50+ concurrent user simulation", ["No errors", "Response < 2x", "No leaks"]),
        ("Accessibility audit with axe-core", "Automated a11y scan", ["No critical", "No serious", "ARIA correct"]),
        ("Visual regression tests", "Screenshot comparison", ["Dashboard", "Lists", "Forms", "Settings"]),
        ("API contract tests", "Response shape validation", ["Shapes match", "Errors typed", "Pagination"]),
        ("Security test: auth bypass", "Unauthenticated rejection", ["401 on API", "Redirect pages", "No leaks"]),
        ("Security test: injection prevention", "XSS and SQL injection tests", ["Script sanitized", "SQL blocked"]),
        ("Test coverage reports", "Coverage config and thresholds", ["Config", "HTML report", "Thresholds"]),
        ("Snapshot tests for components", "Snapshot critical components", ["Dashboard", "Forms", "Modals"]),
        ("Test seed script", "Idempotent test data seeding", ["Accounts", "Entities", "Relations"]),
        ("Mock service layer", "Mock external services", ["Auth", "DB", "Payment", "Email"]),
        ("CI test configuration", "Tests in CI pipeline", ["Commands", "Env vars", "Parallel", "Reports"]),
        ("Regression test suite", "Tests for fixed bugs", ["Per-bug tests", "Edge cases", "Prevent regressions"]),
    ]
    for name, desc, crit in tests:
        add("testing", name, desc, crit)

    # SECURITY (15)
    sec = [
        ("CSRF protection on mutations", "CSRF tokens on POST/PUT/DELETE", ["Token gen", "Validation", "Cookie"]),
        ("Rate limiting on auth endpoints", "Rate limit sign-in/up/reset", ["Per-IP", "Per-account", "429", "Backoff"]),
        ("Rate limiting on API endpoints", "Rate limit all APIs", ["Per-user", "Per-tier", "Headers"]),
        ("Input sanitization", "Sanitize all user inputs", ["Strip HTML", "Escape chars", "Trim", "Length"]),
        ("SQL injection prevention audit", "Verify parameterized queries", ["No concatenation", "Parameterized"]),
        ("Secure HTTP headers", "CSP, HSTS, X-Frame-Options", ["CSP", "HSTS", "X-Frame", "X-Content-Type"]),
        ("Environment variable security", "No secrets in client bundles", ["No client secrets", "No .env in git"]),
        ("Auth token security", "Secure token storage/rotation", ["HttpOnly", "Secure", "SameSite", "Rotation"]),
        ("File upload security", "Validate uploads", ["MIME check", "Size limit", "Whitelist", "Isolation"]),
        ("API authorization checks", "Auth on every endpoint", ["Own data only", "Admin protected", "Role checks"]),
        ("Dependency vulnerability scanning", "Automated CVE scanning", ["npm audit", "Dependabot", "Alerts"]),
        ("Sensitive data encryption", "Encrypt PII at rest", ["PII identified", "Encrypted", "Key mgmt"]),
        ("Audit logging", "Log security-relevant actions", ["Auth events", "Data access", "Admin actions"]),
        ("Session hardening", "Secure sessions with timeouts", ["Timeout", "Limits", "Revocation"]),
        ("GDPR/privacy compliance", "Data export/deletion/consent", ["Export", "Deletion", "Consent"]),
    ]
    for name, desc, crit in sec:
        add("security", name, desc, crit)

    # PERFORMANCE (15)
    perf = [
        ("Server-side caching", "Cache expensive queries", ["Headers", "SWR", "Invalidation"]),
        ("Client-side data caching", "React Query/SWR config", ["Stale time", "Persistence", "Optimistic"]),
        ("Code splitting and lazy loading", "Split bundles per route", ["Dynamic imports", "Suspense"]),
        ("Image optimization", "next/image, WebP, responsive", ["next/image", "WebP", "Responsive"]),
        ("Database query optimization", "Indexes and pooling", ["Indexes", "Analysis", "Pooling"]),
        ("API response compression", "gzip/brotli", ["Compression", "Negotiation", "Threshold"]),
        ("Pagination on all lists", "Cursor/offset pagination", ["Cursor", "Size limits", "Total count"]),
        ("Request deduplication", "Prevent duplicate calls", ["Debounce", "Cancel", "Dedup"]),
        ("Static asset caching", "CDN with long-term cache", ["Cache-Control", "Hashing", "CDN"]),
        ("Connection pooling", "DB connection pool config", ["Pool size", "Timeout", "Recycling"]),
        ("Memory optimization", "Fix memory leaks", ["SSR leaks", "Cleanup", "Listeners"]),
        ("Bundle size monitoring", "Track bundle regressions", ["Analyzer", "Budgets", "CI check"]),
        ("Navigation prefetching", "Prefetch routes/data", ["Link prefetch", "Data prefetch"]),
        ("Web vitals monitoring", "Track Core Web Vitals", ["LCP", "FID", "CLS", "Dashboard"]),
        ("Streaming SSR", "React streaming for TTFB", ["Suspense", "Streaming", "Progressive"]),
    ]
    for name, desc, crit in perf:
        add("performance", name, desc, crit)

    # SEO (10)
    seo = [
        ("Dynamic meta tags", "Title/desc/OG on all pages", ["Titles", "Descriptions", "OG", "Twitter"]),
        ("XML sitemap generation", "Auto-generate sitemap.xml", ["All routes", "Priority", "Auto-update"]),
        ("robots.txt configuration", "Proper robots.txt", ["Allow public", "Disallow admin"]),
        ("Structured data JSON-LD", "Schema.org rich results", ["Organization", "Product", "Breadcrumbs"]),
        ("Canonical URLs", "Prevent duplicate content", ["Canonical tags", "Query params"]),
        ("OG image generation", "Dynamic social images", ["Dynamic text", "Branded", "Cached"]),
        ("Error page SEO", "Proper status codes", ["404 status", "Custom page", "No-index"]),
        ("Breadcrumb navigation", "Breadcrumbs with structured data", ["Visual", "JSON-LD"]),
        ("PageSpeed > 90", "Google PageSpeed optimization", ["Performance", "A11y", "Best practices"]),
        ("Social share preview testing", "Verify share previews", ["Facebook", "Twitter", "LinkedIn"]),
    ]
    for name, desc, crit in seo:
        add("seo", name, desc, crit)

    # A11Y (10)
    a11y = [
        ("ARIA labels on interactives", "Proper ARIA attributes", ["Buttons", "Inputs", "Icons", "Roles"]),
        ("Keyboard navigation", "All features via keyboard", ["Tab order", "Focus visible", "Escape"]),
        ("Focus management on routes", "Focus on route change", ["Main content", "Skip nav", "Announce"]),
        ("Color contrast WCAG AA", "Meet contrast ratios", ["Normal 4.5:1", "Large 3:1", "Both themes"]),
        ("Screen reader compatibility", "Readable by SR", ["Alt text", "Tables", "Forms", "Live regions"]),
        ("Responsive text scaling", "Support 200% zoom", ["No scroll", "No overlap", "No hidden"]),
        ("Form error announcements", "Announce validation errors", ["Summary", "Inline", "Focus to first"]),
        ("Reduced motion support", "Respect prefers-reduced-motion", ["Disable animations", "Simplify"]),
        ("High contrast mode", "Usable in high contrast", ["Borders", "Focus indicators"]),
        ("Accessible data tables", "Proper table markup", ["Headers", "Scope", "Caption"]),
    ]
    for name, desc, crit in a11y:
        add("a11y", name, desc, crit)

    # UI POLISH (20)
    ui = [
        ("Loading skeletons all pages", "Skeleton loading states", ["Dashboard", "List", "Detail", "Form"]),
        ("Empty states all lists", "Helpful empty states", ["Component", "Message", "Action"]),
        ("Error boundary with recovery", "Global error UI", ["Catch", "Message", "Retry", "Report"]),
        ("Toast notification system", "Global toasts", ["Variants", "Auto-dismiss", "Stack"]),
        ("Confirmation dialogs", "Confirm destructive actions", ["Delete", "Cancel", "Clear"]),
        ("Responsive sidebar nav", "Collapsible sidebar", ["Desktop", "Mobile drawer", "Toggle"]),
        ("Dark mode with system pref", "Light/dark/system theme", ["Toggle", "System", "Persist"]),
        ("Form autosave with drafts", "Auto-save form progress", ["Interval", "Indicator", "Restore"]),
        ("Infinite scroll", "Auto-load on scroll", ["Auto-load", "Spinner", "End indicator"]),
        ("Keyboard shortcuts", "Power user shortcuts", ["Cmd+/ help", "Nav shortcuts", "Actions"]),
        ("Breadcrumb component", "Navigation breadcrumbs", ["Auto-generate", "Clickable", "Current"]),
        ("Responsive data tables", "Tables on mobile", ["Desktop table", "Mobile cards", "Sort"]),
        ("Drag-and-drop upload", "File drag-drop zone", ["Overlay", "Validation", "Progress"]),
        ("Command palette Cmd+K", "Quick search/nav", ["Search", "Navigate", "Actions"]),
        ("Multi-step form wizard", "Stepped form with progress", ["Steps", "Back/next", "Validation"]),
        ("Notification dropdown", "Bell with dropdown", ["Badge", "List", "Mark read"]),
        ("Avatar with upload", "Avatar display and upload", ["Image", "Initials", "Upload", "Remove"]),
        ("Copy-to-clipboard", "Click-to-copy with feedback", ["Copy button", "Toast", "Clipboard API"]),
        ("Bulk action toolbar", "Multi-select with actions", ["Checkbox", "Select all", "Bulk ops"]),
        ("Print-friendly styles", "Print stylesheet", ["Hide nav", "Clean layout", "Print button"]),
    ]
    for name, desc, crit in ui:
        add("ui", name, desc, crit)

    # DEVOPS (15)
    devops = [
        ("CI/CD pipeline", "GitHub Actions for test/deploy", ["Test on PR", "Lint", "Build", "Deploy"]),
        ("Environment variable management", "Structured env with validation", [".env.example", "Runtime check"]),
        ("Error monitoring Sentry", "Production error tracking", ["SDK", "Source maps", "Alerts"]),
        ("Database migrations workflow", "Migration system", ["CLI", "Version tracking", "Rollback"]),
        ("Staging environment", "Staging matching prod", ["Staging DB", "Staging env", "Preview URLs"]),
        ("Automated backups", "DB backup with retention", ["Daily", "Retention", "Restore tested"]),
        ("Log aggregation", "Centralized structured logging", ["JSON logs", "Request ID", "Levels"]),
        ("Health check endpoints", "Monitoring endpoints", ["/api/health", "DB check", "Dependencies"]),
        ("Feature flags system", "Remote feature flags", ["Management", "Targeting", "Rollout"]),
        ("Automated dependency updates", "Dependabot/Renovate", ["Config", "Auto-merge patch"]),
        ("Docker containerization", "Dockerfile and compose", ["Multi-stage", "Compose", "Optimized"]),
        ("API documentation generation", "Auto-gen API docs", ["Endpoints", "Schemas", "Examples"]),
        ("Schema documentation", "DB schema docs", ["ER diagram", "Descriptions", "Relations"]),
        ("Uptime monitoring", "External uptime checks", ["HTTP checks", "Alerts", "Status page"]),
        ("Secrets rotation", "Key rotation procedure", ["Procedure", "Zero-downtime", "Audit"]),
    ]
    for name, desc, crit in devops:
        add("devops", name, desc, crit)

    # NOTIFICATIONS (10)
    notif = [
        ("Transactional email system", "Email via Resend/SendGrid", ["Service", "Templates", "Retry"]),
        ("Welcome email on sign-up", "Branded welcome email", ["Triggered", "Template", "Links"]),
        ("Password reset email", "Secure reset link", ["Token", "Expiry", "Template"]),
        ("Email verification flow", "Verify email address", ["Token", "Confirm", "Resend"]),
        ("Notification preferences", "User controls", ["Per-type", "Frequency", "Persist"]),
        ("In-app notification center", "Notification list UI", ["Model", "Read/unread", "Real-time"]),
        ("Email templates with branding", "Consistent branded emails", ["Header", "Footer", "Responsive"]),
        ("Webhook notifications", "Webhooks for events", ["Configurable", "Selection", "Retry"]),
        ("Digest summary emails", "Periodic summaries", ["Daily/weekly", "Summary", "Unsubscribe"]),
        ("Bounce/complaint handling", "Handle bounced emails", ["Bounce hook", "Complaint hook", "Suppress"]),
    ]
    for name, desc, crit in notif:
        add("notifications", name, desc, crit)

    # ANALYTICS (10)
    analytics = [
        ("Analytics event tracking", "Track key events", ["Page views", "Features", "Conversions"]),
        ("User behavior funnels", "Conversion funnels", ["Onboarding", "Purchase", "Adoption"]),
        ("A/B testing framework", "Feature flag A/B tests", ["Assignment", "Tracking", "Significance"]),
        ("Data export for users", "User data export JSON/CSV", ["All data", "Format", "Download"]),
        ("Admin analytics dashboard", "Admin metrics view", ["Growth", "Revenue", "Usage", "Errors"]),
        ("Data retention policies", "Automated cleanup", ["Periods", "Cleanup", "Audit excluded"]),
        ("Usage tracking per tier", "Feature usage limits", ["Counters", "Enforcement", "Upgrade prompt"]),
        ("Search analytics", "Track search queries", ["Logging", "No-result", "Popular"]),
        ("Error rate monitoring", "Track error spikes", ["Rate calc", "Alerts", "Categories"]),
        ("User feedback collection", "In-app feedback widget", ["Form", "Categories", "Screenshots"]),
    ]
    for name, desc, crit in analytics:
        add("analytics", name, desc, crit)

    # DOCS (5)
    docs = [
        ("Comprehensive README", "Setup and architecture", ["Quick start", "Architecture", "Contributing"]),
        ("API documentation", "All endpoints documented", ["Endpoints", "Examples", "Auth"]),
        ("Database schema docs", "Schema with relationships", ["Tables", "Columns", "Relations"]),
        ("Deployment guide", "Step-by-step deploy", ["Prerequisites", "Build", "Deploy", "Rollback"]),
        ("Testing strategy docs", "How to test", ["Categories", "Commands", "Writing tests"]),
    ]
    for name, desc, crit in docs:
        add("documentation", name, desc, crit)

    # INTEGRATIONS (15)
    integ = [
        ("Stripe billing integration", "Subscriptions and payments", ["Checkout", "Webhooks", "Sync"]),
        ("Supabase Edge Functions", "Server-side logic", ["Auth verify", "Business logic", "CORS"]),
        ("File upload to Supabase Storage", "Upload with validation", ["Upload", "Type check", "Signed URLs"]),
        ("Real-time subscriptions", "Live data updates", ["Subscribe", "Events", "UI update"]),
        ("OpenAI/Claude AI integration", "LLM-powered features", ["API client", "Prompts", "Streaming"]),
        ("Social OAuth providers", "Google/GitHub OAuth", ["Config", "Callback", "Profile import"]),
        ("CSV/Excel data import", "Import from spreadsheets", ["Upload", "Column map", "Validate"]),
        ("PDF report generation", "Server-side PDF generation", ["Templates", "Data", "Download"]),
        ("Slack/Discord notifications", "Team notification hooks", ["Webhooks", "Formatting", "Events"]),
        ("Calendar integration", "Calendar sync", ["Google Calendar", "iCal export", "Events"]),
        ("Email template system", "Branded transactional email", ["Templates", "Variables", "Preview"]),
        ("Webhook incoming handler", "Process external webhooks", ["Verify signature", "Parse payload", "Route"]),
        ("S3/Storage CDN for assets", "Asset delivery pipeline", ["Upload", "Transform", "CDN serve"]),
        ("Search with Supabase FTS", "Full-text search implementation", ["tsvector", "Ranking", "Debounced"]),
        ("Cron/scheduled jobs", "Scheduled background tasks", ["Edge Function cron", "Job queue", "Retry"]),
    ]
    for name, desc, crit in integ:
        add("integrations", name, desc, crit)

    # DATABASE (15)
    db = [
        ("Database RLS policies audit", "Verify RLS on all tables", ["RLS enabled", "Policies per table", "Tested"]),
        ("Database indexes for performance", "Add indexes on FK and query columns", ["FK indexes", "Status indexes", "Composite"]),
        ("Soft delete pattern", "Status-based soft delete", ["Status field", "Filter queries", "Restore"]),
        ("Audit trail table", "Track all data mutations", ["Action type", "Changed fields", "User attribution"]),
        ("Database seed script", "Idempotent dev seed data", ["Test accounts", "Sample data", "Idempotent"]),
        ("Optimistic locking", "Prevent concurrent overwrites", ["Version field", "Check on update", "Conflict error"]),
        ("Full-text search columns", "tsvector columns on searchable tables", ["tsvector trigger", "Index", "Search function"]),
        ("JSON schema validation", "Validate JSONB columns", "Check constraint on JSONB fields"),
        ("Database backup strategy", "Backup and restore procedures", ["PITR config", "Manual backup", "Restore test"]),
        ("Multi-tenant data isolation", "Ensure tenant data separation", ["RLS per org", "No cross-tenant", "Tested"]),
        ("Database connection monitoring", "Monitor pool and connections", ["Pool metrics", "Slow query log", "Alerts"]),
        ("Cascading delete policies", "Proper FK cascade rules", ["ON DELETE rules", "Orphan prevention", "Tested"]),
        ("Data migration versioning", "Track schema migrations", ["Version table", "Up/down scripts", "CI check"]),
        ("Database type generation", "Auto-generate TS types from schema", ["Supabase CLI types", "Regenerate script"]),
        ("Read replica configuration", "Configure read replicas for performance", ["Replica setup", "Read routing", "Lag monitoring"]),
    ]
    for name, desc, crit in db:
        add("database", name, desc, crit)

    # AUTH (10)
    auth = [
        ("Magic link authentication", "Passwordless email sign-in", ["Send link", "Verify token", "Session create"]),
        ("Multi-factor authentication", "TOTP-based 2FA", ["Enable/disable", "QR setup", "Verify code"]),
        ("OAuth account linking", "Link multiple OAuth providers", ["Link flow", "Unlink flow", "Conflict handling"]),
        ("Role-based access control", "User roles and permissions", ["Role model", "Permission checks", "Admin UI"]),
        ("API key management", "User-managed API keys", ["Generate key", "Revoke key", "Rate limit per key"]),
        ("Impersonation for admin", "Admin can impersonate users", ["Impersonate endpoint", "Audit log", "Exit flow"]),
        ("Password strength requirements", "Enforce password policy", ["Min length", "Complexity rules", "Strength meter"]),
        ("Account lockout policy", "Lock after failed attempts", ["Attempt tracking", "Lockout duration", "Unlock flow"]),
        ("Session management UI", "View and revoke sessions", ["Active sessions list", "Revoke button", "Current indicator"]),
        ("Auth event webhooks", "Notify on auth events", ["Sign-up hook", "Sign-in hook", "Password change hook"]),
    ]
    for name, desc, crit in auth:
        add("auth", name, desc, crit)

    # MONITORING (10)
    mon = [
        ("Application performance monitoring", "Track response times and throughput", ["P95 latency", "Throughput", "Error rate"]),
        ("Real user monitoring", "Track actual user experience", ["Page load", "Interaction delay", "Navigation"]),
        ("Alerting rules for incidents", "Configure alerts on key metrics", ["Error spike", "Latency spike", "Downtime"]),
        ("Structured logging with context", "Request-scoped structured logs", ["Request ID", "User ID", "Action"]),
        ("Database query performance", "Monitor slow queries", ["Slow query log", "EXPLAIN analysis", "Index suggestions"]),
        ("API endpoint analytics", "Track usage per endpoint", ["Request counts", "Latency", "Error rates"]),
        ("Cost monitoring for services", "Track API and infra costs", ["Supabase usage", "AI API costs", "Storage costs"]),
        ("User session analytics", "Track session duration and paths", ["Session length", "Page flow", "Drop-off points"]),
        ("Deployment tracking", "Track deployments and correlate with metrics", ["Deploy markers", "Rollback trigger", "Change log"]),
        ("SLA compliance tracking", "Monitor uptime SLA compliance", ["Uptime percentage", "Incident count", "MTTR"]),
    ]
    for name, desc, crit in mon:
        add("monitoring", name, desc, crit)

    return F
