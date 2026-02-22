"""Mobile common features for expansion to ~300."""

def mobile_common_features(prefix):
    F = []
    idx = 1
    def add(cat, name, desc, crit):
        nonlocal idx
        F.append({"id": f"{prefix}-MC-{idx:03d}", "name": name, "description": desc,
                  "category": cat, "priority": "P2", "passes": False, "effort": "4h", "criteria": crit})
        idx += 1

    # TESTING (30)
    tests = [
        ("Unit tests for auth provider", "Test AuthProvider, useAuth, session", ["Sign-in", "Sign-out", "Session", "Refresh"]),
        ("Unit tests for API services", "Test CRUD service functions", ["Create", "Read", "Update", "Delete"]),
        ("Unit tests for form validation", "Test validation functions", ["Email", "Password", "Required", "Custom"]),
        ("Unit tests for formatting utils", "Test date/currency/number helpers", ["Date", "Currency", "Relative", "Edge"]),
        ("Unit tests for state management", "Test stores/context/reducers", ["State", "Actions", "Selectors"]),
        ("Unit tests for navigation guards", "Test auth-based navigation", ["Redirect", "Access", "Roles"]),
        ("Integration tests for sign-up", "Full sign-up flow", ["Form", "Validation", "Redirect", "Profile"]),
        ("Integration tests for entity CRUD", "Create/read/update/delete entity", ["Create", "Update", "Delete"]),
        ("Integration tests for search/filter", "Search, filter, sort combos", ["Search", "Filter", "Sort"]),
        ("Integration tests for real-time", "Supabase Realtime subscription", ["Subscribe", "Event", "Update"]),
        ("Integration tests for payments", "Purchase and subscription flow", ["Offerings", "Purchase", "Verify"]),
        ("Integration tests for file upload", "Upload to Supabase Storage", ["Select", "Upload", "Display"]),
        ("Integration tests for push notifications", "Notification registration", ["Permission", "Token", "Receive"]),
        ("Integration tests for offline mode", "Offline behavior testing", ["Detect", "Cache", "Queue", "Sync"]),
        ("Integration tests for deep links", "Deep link handling", ["Scheme URL", "Navigate", "Params"]),
        ("Performance test: cold start < 3s", "Optimize cold start time", ["Measure", "Lazy load", "Optimize"]),
        ("Performance test: list scroll 60fps", "Smooth list scrolling", ["FlashList", "Optimize", "No jank"]),
        ("Performance test: memory usage", "Profile memory usage", ["No leaks", "Cache limits", "Cleanup"]),
        ("A11y test: VoiceOver/TalkBack", "Screen reader testing", ["Labels", "Focus order", "Announcements"]),
        ("A11y test: dynamic type", "Large font testing", ["Scales", "No break", "No truncation"]),
        ("Snapshot tests for screens", "Component snapshots", ["Home", "Detail", "Forms", "Settings"]),
        ("Mock service layer", "Test doubles for services", ["Auth", "DB", "AI", "Storage"]),
        ("Test data factory", "Factory functions for fixtures", ["User", "Entities", "Relations"]),
        ("E2E test for onboarding", "Full onboarding flow", ["Welcome", "Permissions", "Setup", "Home"]),
        ("E2E test for settings", "Settings toggles and prefs", ["Theme", "Notifications", "Account"]),
        ("Regression test suite", "Tests for fixed bugs", ["Per-bug", "Edge cases", "Prevent"]),
        ("CI test configuration", "Jest/Detox in CI", ["Config", "Commands", "Env", "Reports"]),
        ("Test coverage reports", "Coverage config/thresholds", ["Config", "Thresholds", "HTML", "CI"]),
        ("API contract tests", "Response shape validation", ["Shapes", "Errors", "Pagination"]),
        ("Security test: secure storage", "Verify SecureStore usage", ["Tokens", "No AsyncStorage secrets"]),
    ]
    for name, desc, crit in tests:
        add("testing", name, desc, crit)

    # SECURITY (10)
    sec = [
        ("Secure credential storage", "All tokens in SecureStore", ["Access token", "Refresh token", "No hardcoded"]),
        ("Certificate pinning", "SSL cert pinning for API", ["Pin config", "Fallback", "Rotation"]),
        ("Biometric app lock", "FaceID/TouchID with fallback", ["Biometric", "PIN fallback", "Settings"]),
        ("Input sanitization", "Sanitize all text inputs", ["Strip HTML", "Trim", "Length limits"]),
        ("Jailbreak/root detection", "Detect compromised devices", ["Detection", "Warning", "Optional block"]),
        ("API key protection", "No keys in binary", ["Keys in .env", "Server proxy", "No hardcoded"]),
        ("Deep link validation", "Validate incoming links", ["URL check", "Param sanitize", "Auth check"]),
        ("Session timeout", "Auto-lock after inactivity", ["Timeout", "Timer", "Re-auth", "Biometric"]),
        ("Local data encryption", "Encrypt cached data", ["Encrypt", "Decrypt", "Key management"]),
        ("Privacy compliance", "GDPR/CCPA controls", ["Export", "Deletion", "Consent", "Policy"]),
    ]
    for name, desc, crit in sec:
        add("security", name, desc, crit)

    # PERFORMANCE (15)
    perf = [
        ("FlashList for all lists", "Replace FlatList with FlashList", ["Migration", "Item size", "Keys"]),
        ("Image caching expo-image", "Cached image loading", ["Cache config", "Placeholder", "Fallback"]),
        ("Lazy loading tab screens", "Lazy load tab content", ["Lazy config", "Placeholder", "Keep mounted"]),
        ("Bundle size optimization", "Reduce bundle size", ["Analyzer", "Remove unused", "Dynamic imports"]),
        ("Memory leak prevention", "Cleanup on unmount", ["useEffect cleanup", "Unsubscribe", "Clear timers"]),
        ("Optimistic updates", "Immediate UI with rollback", ["Optimistic insert", "Update", "Rollback"]),
        ("Offline-first data layer", "Cache data locally", ["AsyncStorage", "SWR", "Sync"]),
        ("Request dedup and cancel", "Prevent duplicate requests", ["AbortController", "Dedup", "Cancel"]),
        ("Animation performance", "Native driver animations", ["useNativeDriver", "Reanimated", "No JS"]),
        ("Startup optimization", "Optimize startup sequence", ["Defer init", "Lazy screens", "Splash"]),
        ("List item memoization", "Memoize list items", ["React.memo", "Stable keys", "Callbacks"]),
        ("Background fetch", "Refresh on foreground", ["AppState", "Background refresh", "Stale detect"]),
        ("Infinite scroll pagination", "Cursor pagination auto-load", ["onEndReached", "Indicator", "Has more"]),
        ("Hermes engine optimization", "Enable and optimize Hermes", ["Enabled", "Bytecode", "Profiling"]),
        ("Network request batching", "Batch API calls", ["Queue", "Debounced flush", "Per-item error"]),
    ]
    for name, desc, crit in perf:
        add("performance", name, desc, crit)

    # UI POLISH (20)
    ui = [
        ("Skeleton loading screens", "Skeleton placeholders", ["Home", "List", "Detail"]),
        ("Empty states all lists", "Contextual empty states", ["Component", "Messaging", "Action"]),
        ("Error boundary with recovery", "Global error boundary", ["Catch", "UI", "Retry", "Report"]),
        ("Toast notification system", "In-app toasts", ["Variants", "Auto-dismiss", "Swipe"]),
        ("Pull-to-refresh all lists", "Pull-to-refresh gesture", ["Indicator", "Reload", "State"]),
        ("Swipe-to-delete on items", "Swipe to reveal delete", ["Swipe", "Confirm", "Undo"]),
        ("Haptic feedback", "Haptics on interactions", ["Buttons", "Toggles", "Success", "Nav"]),
        ("Bottom sheet modals", "Draggable bottom sheets", ["Handle", "Snap points", "Backdrop"]),
        ("Dark mode system pref", "Light/dark/system theme", ["Toggle", "System", "Persist"]),
        ("Form keyboard handling", "Keyboard avoiding forms", ["Avoiding", "Auto-scroll", "Dismiss"]),
        ("Safe area handling", "Proper safe area insets", ["Provider", "Headers", "Tab bar"]),
        ("Animated transitions", "Smooth screen transitions", ["Stack", "Modal", "Shared element"]),
        ("Search with debounce", "Debounced search input", ["Debounce", "Loading", "Clear", "Recent"]),
        ("Action sheet component", "Native action sheet", ["Actions", "Destructive", "Cancel"]),
        ("Image picker camera/gallery", "Select or capture images", ["Camera", "Gallery", "Crop"]),
        ("Date/time picker", "Platform-native pickers", ["Date", "Time", "DateTime", "Min/max"]),
        ("Segmented control", "Tab-like segment control", ["Segments", "Animated", "Controlled"]),
        ("Floating action button", "FAB for primary action", ["Position", "Primary", "Sub-actions"]),
        ("Onboarding walkthrough", "First-launch onboarding", ["Slides", "Skip", "Get Started"]),
        ("App review prompt", "Store review request", ["Trigger", "Rate limit", "StoreKit"]),
    ]
    for name, desc, crit in ui:
        add("ui", name, desc, crit)

    # NOTIFICATIONS (8)
    notif = [
        ("Configure expo-notifications", "Push notification infra", ["Package", "Channels", "Permission"]),
        ("Push permission request", "Smart permission ask", ["Trigger", "Denied handling", "Settings"]),
        ("Register push token", "Store token in DB", ["Token table", "Registration", "Delete on logout"]),
        ("Foreground notification", "In-app notification banner", ["Banner", "Auto-dismiss", "Navigate"]),
        ("Notification tap navigation", "Navigate on tap", ["Parse data", "Navigate", "Deep links"]),
        ("Local notification scheduling", "Schedule local notifs", ["Schedule", "Repeat", "Cancel"]),
        ("Notification preferences screen", "Per-type toggles", ["UI", "Persist", "Respect in send"]),
        ("Badge count management", "App icon badge", ["Set count", "Clear", "Increment"]),
    ]
    for name, desc, crit in notif:
        add("notifications", name, desc, crit)

    # ANALYTICS (8)
    analytics = [
        ("Configure PostHog", "PostHog RN SDK setup", ["SDK", "API key", "Auto-capture"]),
        ("Screen view tracking", "Track navigations", ["Listener", "Name", "Params"]),
        ("Key event tracking", "Track auth/purchase/features", ["Auth", "Purchase", "Features"]),
        ("User property syncing", "Sync user properties", ["Tier", "Age", "Platform"]),
        ("Funnel tracking", "Conversion funnels", ["Onboarding", "Purchase", "Adoption"]),
        ("Crash/error reporting", "Global error handler", ["JS errors", "Native crashes", "Traces"]),
        ("A/B testing feature flags", "PostHog flags", ["Evaluation", "Tracking", "Consistent"]),
        ("Session recording consent", "Optional recording", ["Consent", "Toggle", "Respect"]),
    ]
    for name, desc, crit in analytics:
        add("analytics", name, desc, crit)

    # DEEP LINKING (5)
    linking = [
        ("URL scheme deep linking", "Custom URL scheme", ["Scheme", "Config", "Handle"]),
        ("Universal links", "Apple/Android universal links", ["AASA", "assetlinks", "Verify"]),
        ("Share functionality", "Native share sheet", ["Text", "URLs", "Files"]),
        ("Dynamic link generation", "Shareable deep links", ["Generate", "Preview", "Track"]),
        ("Clipboard copy feedback", "Copy with toast", ["Clipboard", "Utility", "Toast"]),
    ]
    for name, desc, crit in linking:
        add("linking", name, desc, crit)

    # PAYMENTS (10)
    payments = [
        ("RevenueCat SDK integration", "Install react-native-purchases", ["SDK", "API key", "Sandbox"]),
        ("Paywall screen", "Subscription paywall UI", ["Prices", "Features", "Purchase"]),
        ("Purchase flow", "Handle in-app purchase", ["Offerings", "Process", "Update"]),
        ("Purchase restoration", "Restore purchases", ["Button", "Sync", "Update"]),
        ("Subscription status sync", "Sync on launch", ["RC check", "Compare DB", "Resolve"]),
        ("Free tier enforcement", "Gate premium features", ["Check tier", "Prompt", "Track"]),
        ("Subscription management", "View/manage subscription", ["Plan", "Upgrade", "Cancel"]),
        ("Webhook handler for subs", "Edge Function for webhooks", ["Verify", "Handle", "Update DB"]),
        ("Trial period support", "Free trial handling", ["Config", "Countdown", "Expiry"]),
        ("Receipt validation", "Server-side validation", ["Validate", "Prevent reuse", "RC check"]),
    ]
    for name, desc, crit in payments:
        add("payments", name, desc, crit)

    # DEVOPS (10)
    devops = [
        ("EAS Build config", "iOS and Android builds", ["eas.json", "Profiles", "Credentials"]),
        ("EAS Submit config", "App store submission", ["Apple", "Google", "Auto-submit"]),
        ("OTA updates", "expo-updates for JS bundle", ["Check", "Download", "Apply"]),
        ("CI/CD for mobile", "GitHub Actions builds", ["Test", "Build", "Submit"]),
        ("Environment management", "Dev/staging/prod envs", [".env files", "EAS secrets", "Build-time"]),
        ("Crash reporting Sentry", "Sentry RN SDK", ["Installed", "Source maps", "Native"]),
        ("Version automation", "Auto version bump", ["Semver", "Build number", "Changelog"]),
        ("Code signing", "iOS/Android signing", ["Certificates", "Keystore", "CI secrets"]),
        ("Beta testing", "TestFlight/Internal track", ["TestFlight", "Internal", "Feedback"]),
        ("App store metadata", "Listing assets", ["Screenshots", "Description", "Keywords"]),
    ]
    for name, desc, crit in devops:
        add("devops", name, desc, crit)

    # DOCS (5)
    docs = [
        ("Comprehensive README", "Setup and architecture", ["Quick start", "Architecture", "Contributing"]),
        ("Document environment variables", "All env vars listed", ["All vars", "Required/optional", "How to get"]),
        ("Deployment guide", "Build and submit guide", ["Build", "Submit", "Troubleshoot"]),
        ("Integration docs", "External service guides", ["Supabase", "AI", "Payments"]),
        ("Testing strategy docs", "How to test", ["Commands", "Writing tests", "CI"]),
    ]
    for name, desc, crit in docs:
        add("documentation", name, desc, crit)

    # DATABASE (20)
    db = [
        ("Database RLS policies audit", "Verify RLS on all tables", ["RLS enabled", "Policies", "Tested"]),
        ("Database indexes for performance", "Indexes on FK/query columns", ["FK indexes", "Status", "Composite"]),
        ("Soft delete pattern", "Status-based soft delete", ["Status field", "Filter queries", "Restore"]),
        ("Audit trail table", "Track all data mutations", ["Action type", "Changed fields", "Attribution"]),
        ("Database seed script", "Idempotent dev data", ["Accounts", "Sample data", "Idempotent"]),
        ("Optimistic locking", "Prevent concurrent overwrites", ["Version field", "Check update", "Conflict"]),
        ("Full-text search columns", "tsvector on searchable tables", ["tsvector", "Index", "Function"]),
        ("Database backup strategy", "Backup and restore", ["PITR", "Manual backup", "Restore test"]),
        ("Cascading delete policies", "Proper FK cascade rules", ["ON DELETE", "Orphan prevention", "Tested"]),
        ("Database type generation", "Auto-generate TS types", ["Supabase CLI", "Regenerate script"]),
        ("User preferences table", "Typed user preferences", ["user_id FK", "theme", "notifications JSONB"]),
        ("Activity log table", "Track user actions", ["user_id", "action", "entity_ref", "timestamp"]),
        ("File uploads table", "Track Storage uploads", ["bucket", "path", "size", "mime_type"]),
        ("Push tokens table", "Store device push tokens", ["user_id", "token", "platform", "active"]),
        ("Feature flags table", "Remote feature config", ["flag_name", "enabled", "rollout_pct"]),
        ("Feedback table", "User feedback storage", ["category", "message", "screenshot_url"]),
        ("Search history table", "Recent search tracking", ["user_id", "query", "entity_type"]),
        ("Saved filters table", "Custom view filters", ["user_id", "name", "filter_config JSONB"]),
        ("Export jobs table", "Async export tracking", ["user_id", "type", "status", "file_url"]),
        ("Notifications log table", "Notification history", ["user_id", "type", "title", "read_at"]),
    ]
    for name, desc, crit in db:
        add("database", name, desc, crit)

    # API/SERVICES (20)
    api = [
        ("Real-time updates via Supabase", "Subscribe to table changes", ["Subscribe", "Handle events", "Update UI"]),
        ("Activity logging for mutations", "Log all data changes", ["Action type", "Entity ref", "User"]),
        ("Batch create/update/delete", "Bulk operations", ["Accept arrays", "Transaction", "Progress"]),
        ("Tagging system across entities", "Universal tags", ["Create tags", "Apply", "Filter by tag"]),
        ("Favorites/bookmarks system", "Toggle favorites", ["Toggle", "List favorites", "Sort"]),
        ("Data export JSON and CSV", "Export user data", ["Select fields", "Generate", "Share"]),
        ("Data import from CSV", "Import with mapping", ["Upload", "Column map", "Validate"]),
        ("Sharing via generated links", "Shareable links", ["Generate URL", "Permissions", "Expiry"]),
        ("Dashboard summary statistics", "Key metrics aggregation", ["Metrics", "Period compare", "Trends"]),
        ("Notification triggers", "Auto-notify on events", ["Define rules", "Create notif", "Push"]),
        ("AI-powered suggestions", "LLM integration for suggestions", ["Context-aware", "Accept/reject"]),
        ("Sorting preferences persistence", "Save sort per list", ["Save sort", "Restore", "Per-list"]),
        ("Feedback submission", "In-app feedback to DB", ["Category", "Message", "Screenshot"]),
        ("Entity duplication/clone", "Deep copy entities", ["Clone", "Rename", "Relations"]),
        ("Entity archival", "Hide without delete", ["Archive toggle", "Filter", "Restore"]),
        ("Onboarding progress tracking", "Track user onboarding", ["Steps", "Resume", "Skip"]),
        ("Rate limiting client-side", "Prevent API abuse", ["Track calls", "Backoff", "Error"]),
        ("Data backup to JSON", "Full user data export", ["Export all", "Selective", "GDPR"]),
        ("Recent search tracking", "Save recent searches", ["Store", "Display", "Clear"]),
        ("Feature flag client checking", "Check flags on launch", ["Fetch", "Cache", "Override"]),
    ]
    for name, desc, crit in api:
        add("api", name, desc, crit)

    # AUTH (10)
    auth = [
        ("Magic link authentication", "Passwordless email sign-in", ["Send link", "Verify", "Session"]),
        ("Social OAuth Google", "Google sign-in with expo-auth-session", ["Config", "Exchange", "Profile"]),
        ("Social OAuth Apple", "Apple Sign-In", ["Config", "Credential exchange", "iOS guard"]),
        ("Auth navigation guard", "Redirect unauthenticated", ["Check mount", "Redirect", "Loading"]),
        ("Account deletion flow", "Full account delete", ["Confirm", "Verify password", "Cleanup"]),
        ("Auth state listener", "onAuthStateChange handler", ["Listen", "Token refresh", "Multi-device"]),
        ("Auth rate limiting", "Client-side auth throttle", ["Track failures", "Backoff", "Lockout"]),
        ("Password change screen", "Change password flow", ["Current password", "New password", "Confirm"]),
        ("Email verification screen", "Check and resend verification", ["Check status", "Resend", "Redirect"]),
        ("Forgot password screen", "Password reset request", ["Email input", "Send link", "Success"]),
    ]
    for name, desc, crit in auth:
        add("auth", name, desc, crit)

    # INTEGRATIONS (10)
    integ = [
        ("OpenAI/Claude AI integration", "LLM-powered features", ["Client", "Prompts", "Streaming"]),
        ("Supabase Edge Functions", "Server-side logic", ["Auth verify", "Business logic", "CORS"]),
        ("File upload to Storage", "Upload with validation", ["Upload", "Type check", "Signed URLs"]),
        ("CSV data import", "Import from spreadsheets", ["Upload", "Map columns", "Validate"]),
        ("Share card image generation", "Generate shareable images", ["Template", "Dynamic data", "Save"]),
        ("Calendar reminders", "Local calendar integration", ["Calendar permission", "Create events"]),
        ("Contacts import", "Device contacts access", ["Permission", "Read", "Merge"]),
        ("In-app browser", "Open links in-app", ["WebBrowser API", "Custom styling"]),
        ("App links and QR codes", "Generate QR codes for sharing", ["QR generation", "Scan", "Deep link"]),
        ("Webhook outgoing", "Notify external services", ["Events trigger", "Retry", "Signing"]),
    ]
    for name, desc, crit in integ:
        add("integrations", name, desc, crit)

    # MONITORING (10)
    mon = [
        ("Performance monitoring", "Track app performance", ["Startup time", "Screen load", "API latency"]),
        ("Error tracking with Sentry", "Capture errors in production", ["JS errors", "Native crashes", "Breadcrumbs"]),
        ("Network quality detection", "Detect connection quality", ["Bandwidth estimate", "Latency", "Adapt requests"]),
        ("Memory usage monitoring", "Profile memory usage", ["Track allocations", "Detect leaks", "Alert"]),
        ("Bundle size tracking", "Monitor app size", ["Size per update", "Asset sizes", "Optimization"]),
        ("User session analytics", "Track session behavior", ["Duration", "Screen flow", "Drop-off"]),
        ("API call monitoring", "Track API usage", ["Counts", "Latency", "Errors"]),
        ("Storage usage tracking", "Monitor device storage", ["Cache size", "Data size", "Cleanup"]),
        ("Battery impact monitoring", "Minimize battery drain", ["Background tasks", "Location", "Network"]),
        ("App update adoption tracking", "Track update rollout", ["Version distribution", "Update rate"]),
    ]
    for name, desc, crit in mon:
        add("monitoring", name, desc, crit)

    # SCREENS (10)
    screens = [
        ("Profile screen with avatar", "User profile management", ["Avatar upload", "Name edit", "Email"]),
        ("Privacy policy screen", "Display privacy policy", ["Content", "ScrollView", "Formatted"]),
        ("Terms of service screen", "Display ToS", ["Content", "Formatted display"]),
        ("Help/FAQ screen", "FAQ with accordion", ["Accordion", "Contact support", "Email"]),
        ("About screen", "App info display", ["Icon/name", "Version", "Licenses"]),
        ("Feedback form screen", "Submit feedback", ["Category", "Description", "Screenshot"]),
        ("Changelog screen", "Version history", ["Versions", "Features", "Highlights"]),
        ("Appearance settings", "Theme preferences", ["Light/dark/system", "Font size", "Preview"]),
        ("Data management screen", "Export/import/delete", ["Export data", "Import", "Clear cache"]),
        ("Linked accounts screen", "Manage OAuth connections", ["Connected providers", "Link/unlink"]),
    ]
    for name, desc, crit in screens:
        add("screens", name, desc, crit)

    return F
