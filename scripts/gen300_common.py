#!/usr/bin/env python3
"""Common AppKit features (~155) shared across all Rork apps."""

COMMON = []
def a(id, cat, pri, desc, crit):
    COMMON.append((id, cat, pri, desc, crit))

# SETUP (20)
for i, (d, c) in enumerate([
    ("Install @supabase/supabase-js and create lib/supabase.ts client", ["Package installed", "Client singleton", "Auth helpers"]),
    ("Create .env.example with all required environment variables", ["SUPABASE_URL", "SUPABASE_ANON_KEY", "STRIPE_KEY", "POSTHOG_KEY"]),
    ("Configure app.json with name, slug, scheme, bundle IDs", ["App name", "URL scheme", "iOS bundleId", "Android package"]),
    ("Install TypeScript strict mode with path aliases", ["tsconfig strict:true", "Path aliases @/", "No implicit any"]),
    ("Install core Expo deps (expo-router, expo-constants, expo-font)", ["Router configured", "Constants available", "Fonts loaded"]),
    ("Configure ESLint and Prettier", ["ESLint config", "Prettier config", "Consistent formatting"]),
    ("Create folder structure: app/, components/, services/, types/, hooks/, providers/, constants/, utils/", ["All dirs created", "Index exports where needed"]),
    ("Install expo-image for optimized image loading", ["Package installed", "Caching configured"]),
    ("Install lucide-react-native for icons", ["Package installed", "Icons rendering"]),
    ("Create constants/colors.ts with light/dark palettes", ["Primary/secondary/accent", "Background/surface", "Text hierarchy", "Status colors"]),
    ("Create constants/config.ts from AppKit with feature flags", ["APP_NAME/SLUG", "DEV_MODE", "Feature flags", "Subscription config"]),
    ("Create constants/typography.ts font scale", ["Font families", "Size scale xs-3xl", "Weights", "Line heights"]),
    ("Install expo-secure-store for credentials", ["Package installed", "Wrapper utility"]),
    ("Configure expo-splash-screen with branding", ["Splash image", "Background color", "Auto-hide"]),
    ("Install react-native-reanimated for animations", ["Package installed", "Babel plugin"]),
    ("Install expo-haptics for tactile feedback", ["Package installed", "Utility functions"]),
    ("Create utils/formatting.ts (date, currency, number)", ["formatDate", "formatCurrency", "formatFileSize", "Locale-aware"]),
    ("Create utils/validation.ts form validators", ["validateEmail", "validatePassword", "validateRequired", "validateUrl"]),
    ("Create utils/storage.ts typed AsyncStorage wrapper", ["getItem<T>", "setItem<T>", "removeItem", "Error handling"]),
    ("Install expo-updates for OTA updates", ["Update check on launch", "Background download", "Apply on restart"]),
], start=1):
    a(f"AK-{i:03d}", "setup", 1, d, c)

# AUTH (15)
for i, (d, c) in enumerate([
    ("Create AuthProvider.tsx with Supabase Auth", ["AuthContext", "useAuth hook", "Session persistence", "Token refresh"]),
    ("Create sign-in screen with email/password", ["Email/password form", "Validation", "Error display", "Links to signup/forgot"]),
    ("Create sign-up screen with registration", ["Email/password/confirm", "Name input", "Terms checkbox", "Validation"]),
    ("Create forgot-password screen", ["Email input", "Send reset link", "Success message"]),
    ("Create reset-password screen from deep link", ["New password + confirm", "Strength indicator", "Success redirect"]),
    ("Create verify-email screen", ["Check status", "Resend button", "Auto-redirect"]),
    ("Implement Google OAuth with expo-auth-session", ["OAuth config", "Token exchange", "Profile import"]),
    ("Implement Apple Sign-In", ["Apple auth config", "Credential exchange", "iOS guard"]),
    ("Create auth navigation guard", ["Check auth on mount", "Redirect if unauthenticated", "Loading state"]),
    ("Implement secure token storage", ["Store access token", "Store refresh token", "Clear on sign-out"]),
    ("Implement biometric auth for app lock", ["FaceID/TouchID", "Fallback to PIN", "Toggle in settings"]),
    ("Create account deletion flow", ["Confirmation dialog", "Password verify", "Data cleanup", "Sign out"]),
    ("Implement auth state change listener", ["onAuthStateChange", "Token refresh", "Multi-device sign-out"]),
    ("Create auth flow layout with navigation", ["Stack navigator", "Clean headers", "Keyboard avoiding"]),
    ("Implement auth rate limiting client-side", ["Track failures", "Exponential backoff", "Lockout after 5"]),
], start=21):
    a(f"AK-{i:03d}", "auth", 1 if i <= 10 else 2, d, c)

# DATABASE (20)
for i, (d, c) in enumerate([
    ("Create users table migration", ["id UUID PK", "email, full_name, avatar_url", "subscription_tier/status", "timestamps"]),
    ("Create subscriptions table migration", ["user_id FK", "tier, status, provider", "period_start/end", "stripe/rc IDs"]),
    ("Create user_preferences table", ["user_id FK", "theme, language", "notifications_enabled", "preferences JSONB"]),
    ("Enable RLS on all tables", ["RLS enabled", "Default deny"]),
    ("Create RLS policies for user-owned data", ["SELECT own", "INSERT own", "UPDATE own", "DELETE own"]),
    ("Create updated_at trigger function", ["moddatetime extension", "Trigger on UPDATE"]),
    ("Create database indexes for query performance", ["user_id indexes", "created_at indexes", "status indexes"]),
    ("Create services/api.ts typed CRUD operations", ["Generic CRUD", "Profile ops", "Pagination", "Error handling"]),
    ("Create types/database.ts Supabase types", ["Row types", "Insert types", "Update types"]),
    ("Configure Supabase Storage bucket for uploads", ["Bucket created", "RLS policies", "Upload utility", "Signed URLs"]),
    ("Create seed script for development", ["Test accounts", "Sample data", "Idempotent"]),
    ("Implement soft delete pattern", ["Status deleted", "Filter in queries", "Restore capability"]),
    ("Create Supabase Edge Function for server ops", ["Auth verification", "Business logic", "CORS headers"]),
    ("Implement optimistic updates", ["Optimistic insert/update", "Rollback on error", "Cache invalidation"]),
    ("Implement cursor-based pagination", ["Cursor pagination util", "Load more/infinite scroll", "Page size config"]),
    ("Create Supabase Realtime subscription", ["Subscribe to tables", "Handle events", "Update local state", "Cleanup"]),
    ("Implement full-text search", ["tsvector columns", "Search function", "Debounced input", "Ranked results"]),
    ("Create types/models.ts with all interfaces", ["User, Subscription", "App entities", "API responses", "Form inputs"]),
    ("Implement data export JSON/CSV", ["Export to JSON", "Export to CSV", "Download/share"]),
    ("Create backup/restore utilities", ["Manual backup", "JSON export", "Import from backup"]),
], start=1):
    a(f"AK-{i+35:03d}", "database", 1 if i <= 9 else 2, d, c)

# PROVIDERS & HOOKS (10)
for i, (d, c) in enumerate([
    ("Create ThemeProvider with dark mode", ["ThemeContext", "useTheme hook", "System preference", "Persist"]),
    ("Create QueryProvider for data fetching", ["React Query", "Default stale time", "Retry config"]),
    ("Create NotificationProvider", ["Permission state", "Push token", "Foreground handler"]),
    ("Create NetworkProvider for connectivity", ["Online/offline state", "Offline banner", "Queue mutations"]),
    ("Create useSubscription hook", ["isPro/isFree", "tier, status", "canAccess(feature)"]),
    ("Create useDebounce hook", ["Generic debounce", "Configurable delay"]),
    ("Create useKeyboard hook", ["Keyboard height", "isVisible state"]),
    ("Create useRefreshControl hook", ["Refreshing state", "onRefresh callback"]),
    ("Create useInfiniteScroll hook", ["Load more on end", "Loading state", "Has more"]),
    ("Create useAppState hook", ["Foreground/background", "onForeground callback", "Refresh on foreground"]),
], start=1):
    a(f"AK-{i+55:03d}", "providers", 1 if i <= 2 else 2, d, c)

# PAYMENTS (15)
for i, (d, c) in enumerate([
    ("Create paywall screen from AppKit", ["Monthly/yearly toggle", "Feature comparison", "Purchase button"]),
    ("Install react-native-purchases (RevenueCat)", ["Package installed", "API key configured", "Sandbox testing"]),
    ("Implement RevenueCat purchase flow", ["Fetch offerings", "Handle purchase", "Update state"]),
    ("Implement purchase restoration", ["Restore button", "Sync with RC", "Update local state"]),
    ("Implement Stripe checkout for web", ["Publishable key", "Checkout session", "Success/cancel redirects"]),
    ("Create Edge Function for Stripe webhooks", ["Verify signature", "Handle checkout.completed", "Update DB"]),
    ("Create Edge Function for RevenueCat webhooks", ["Verify auth", "Handle purchase/renewal/cancel", "Update DB"]),
    ("Implement subscription sync on launch", ["Check RC customer info", "Compare with DB", "Resolve conflicts"]),
    ("Implement free tier limits enforcement", ["Check tier before premium", "Upgrade prompt", "Usage tracking"]),
    ("Implement subscription expiry handling", ["Check on launch", "Grace period", "Downgrade to free"]),
    ("Create subscription management screen", ["Current plan", "Upgrade/downgrade", "Cancel flow"]),
    ("Implement trial periods and promo pricing", ["Free trial config", "Intro pricing", "Expiry notification"]),
    ("Implement receipt validation", ["Server-side validation", "Prevent reuse"]),
    ("Create paywall A/B test support", ["Multiple layouts", "Random assignment", "Track conversion"]),
    ("Implement lifetime purchase option", ["One-time product", "Lifetime flag", "Non-consumable"]),
], start=1):
    a(f"AK-{i+65:03d}", "payments", 2, d, c)

# UI COMPONENTS (25)
for i, (d, c) in enumerate([
    ("Update root _layout.tsx with all providers", ["Auth>Theme>Query>Notification", "DevModeOverlay", "Splash management"]),
    ("Create tab navigation layout", ["Tab bar with icons", "Active states", "Badge support", "Haptic feedback"]),
    ("Create settings screen from AppKit", ["Account section", "Preferences", "Support", "Logout"]),
    ("Create Button component with variants", ["Primary/secondary/outline/ghost/destructive", "Sizes", "Loading", "Icon"]),
    ("Create Input component with validation", ["Label/placeholder/helper", "Error state", "Password toggle", "Icons"]),
    ("Create Card container component", ["Rounded/shadow", "Header/body/footer", "Pressable variant", "Skeleton"]),
    ("Create Modal bottom sheet and center", ["Bottom sheet drag", "Center with backdrop", "Close button"]),
    ("Create Avatar with image and fallback", ["Image source", "Initials fallback", "Sizes", "Online dot"]),
    ("Create Badge status indicators", ["Color variants", "Size variants", "Dot/text variants"]),
    ("Create Toast notification component", ["Success/error/warning/info", "Auto-dismiss", "Swipe dismiss"]),
    ("Create LoadingSpinner component", ["Size/color variants", "Full screen overlay", "Inline"]),
    ("Create EmptyState component", ["Icon", "Title/description", "Action button"]),
    ("Create SearchBar with debounce", ["Search icon", "Clear button", "Debounced onChange"]),
    ("Create SegmentedControl component", ["Multiple segments", "Animated indicator"]),
    ("Create Skeleton loading placeholder", ["Rectangle/circle/text", "Shimmer animation"]),
    ("Create TabView swipeable tabs", ["Tab headers", "Swipeable content", "Lazy rendering"]),
    ("Create Chip component for tags", ["Selected/unselected", "Close button", "Icon variant"]),
    ("Create ProgressBar component", ["Percentage", "Animated fill", "Color variants"]),
    ("Create ActionSheet for contextual actions", ["Action list", "Destructive style", "Cancel"]),
    ("Create FloatingActionButton", ["Bottom-right", "Icon", "Sub-actions expand"]),
    ("Create ListItem for consistent rows", ["Left icon/avatar", "Title/subtitle", "Right accessory"]),
    ("Create DatePicker wrapper", ["Date/time modes", "Min/max", "Platform UI"]),
    ("Create ImagePicker for photo selection", ["Camera/gallery", "Cropping", "Compression"]),
    ("Create ConfirmDialog for destructive actions", ["Title/message", "Confirm/cancel", "Loading"]),
    ("Create Divider with optional label", ["Horizontal line", "Center label option"]),
], start=1):
    a(f"AK-{i+80:03d}", "ui", 1 if i <= 3 else 2, d, c)

# SCREENS (10)
for i, (d, c) in enumerate([
    ("Create onboarding multi-step welcome", ["3-4 slides", "Skip/Get Started", "First launch only"]),
    ("Create profile screen", ["Avatar upload", "Name edit", "Email display", "Delete account"]),
    ("Create privacy policy screen", ["Policy content", "ScrollView formatted"]),
    ("Create terms of service screen", ["Terms content", "Formatted display"]),
    ("Create help/FAQ screen", ["FAQ accordion", "Contact support", "Email button"]),
    ("Create notification settings screen", ["Push toggle", "Per-type toggles", "Quiet hours"]),
    ("Create appearance settings screen", ["Light/dark/system", "Font size", "Preview"]),
    ("Create about screen", ["App icon/name", "Version", "Licenses"]),
    ("Create feedback form screen", ["Category", "Description", "Screenshot attach"]),
    ("Create changelog/what's new screen", ["Version history", "Feature highlights"]),
], start=1):
    a(f"AK-{i+105:03d}", "screens", 2, d, c)

# NOTIFICATIONS (7)
for i, (d, c) in enumerate([
    ("Install and configure expo-notifications", ["Package installed", "Channels (Android)", "Permission function"]),
    ("Implement push permission request flow", ["Request on trigger", "Handle denied", "Settings redirect"]),
    ("Register push token with Supabase", ["push_tokens table", "Store with device info", "Delete on sign-out"]),
    ("Implement foreground notification display", ["In-app banner", "Auto-dismiss", "Tap to navigate"]),
    ("Implement notification tap navigation", ["Parse data", "Navigate to screen", "Deep link format"]),
    ("Implement local notifications for reminders", ["Schedule notifications", "Repeating", "Cancel/update"]),
    ("Create Edge Function to send push notifications", ["Accept user_id + message", "Fetch token", "Expo Push API"]),
], start=1):
    a(f"AK-{i+115:03d}", "notifications", 2, d, c)

# ANALYTICS (8)
for i, (d, c) in enumerate([
    ("Install posthog-react-native", ["Package installed", "API key", "Auto-capture screens"]),
    ("Implement screen view tracking", ["Track navigation", "Screen name/params"]),
    ("Implement key event tracking", ["Sign up/in events", "Feature usage", "Purchases", "Errors"]),
    ("Implement user property tracking", ["Subscription tier", "Account age", "Platform/version"]),
    ("Implement funnel tracking", ["Onboarding funnel", "Purchase funnel", "Feature adoption"]),
    ("Implement A/B test with PostHog feature flags", ["Flag checks", "Variant assignment", "Track per variant"]),
    ("Implement crash and error reporting", ["Global handler", "Unhandled rejections", "Stack traces"]),
    ("Implement session recording consent", ["Consent prompt", "Enable/disable", "Respect preference"]),
], start=1):
    a(f"AK-{i+122:03d}", "analytics", 2 if i <= 4 else 3, d, c)

# QUALITY (10)
for i, (d, c) in enumerate([
    ("Create ErrorBoundary component", ["Catch render errors", "Fallback UI", "Report to analytics"]),
    ("Implement offline detection and banner", ["NetInfo check", "Persistent banner", "Queue mutations"]),
    ("Implement error handling with friendly messages", ["API error mapping", "Network errors", "Auth errors"]),
    ("Implement image caching strategy", ["Cache images", "Preload on scroll", "Placeholder", "Error fallback"]),
    ("Implement FlashList for list performance", ["Replace FlatList", "Estimated item size", "Key extractor"]),
    ("Implement keyboard avoiding on forms", ["KeyboardAvoidingView", "Platform behavior", "Auto-scroll"]),
    ("Implement safe area handling", ["SafeAreaProvider", "useSafeAreaInsets", "Tab bar safe area"]),
    ("Implement memory leak prevention", ["Unsubscribe on unmount", "Cancel requests", "Clear timers"]),
    ("Implement retry logic for API calls", ["Exponential backoff", "Max retries", "User retry button"]),
    ("Implement app state persistence", ["Save nav state", "Save form drafts", "Restore on reopen"]),
], start=1):
    a(f"AK-{i+130:03d}", "quality", 2 if i <= 7 else 3, d, c)

# SECURITY (5)
for i, (d, c) in enumerate([
    ("Ensure no API keys in client code", ["All secrets in .env", "Anon key only client-side"]),
    ("Implement input sanitization", ["Trim whitespace", "Strip HTML", "Length limits"]),
    ("Implement secure deep link handling", ["Validate URLs", "Auth check", "Sanitize params"]),
    ("Implement session timeout", ["Configurable timeout", "Re-auth prompt", "Biometric option"]),
    ("Implement SSL pinning awareness", ["Document approach", "API validation"]),
], start=1):
    a(f"AK-{i+140:03d}", "security", 2, d, c)

# A11Y (5)
for i, (d, c) in enumerate([
    ("Add accessibility labels to all interactive elements", ["accessibilityLabel", "accessibilityHint", "accessibilityRole"]),
    ("Implement dynamic font scaling", ["Relative sizes", "Test at 200%", "No layout break"]),
    ("Ensure WCAG AA color contrast", ["Text >= 4.5:1", "Large text >= 3:1", "Both themes"]),
    ("Implement screen reader navigation", ["Logical focus order", "Group elements"]),
    ("Respect reduce motion preference", ["Check preference", "Disable animations"]),
], start=1):
    a(f"AK-{i+145:03d}", "a11y", 2 if i <= 3 else 3, d, c)

# DEEP LINKING (5)
for i, (d, c) in enumerate([
    ("Configure URL scheme and deep linking", ["Custom scheme", "Linking config", "Handle incoming"]),
    ("Implement universal links / app links", ["AASF file", "assetlinks.json", "Domain verify"]),
    ("Implement share with expo-sharing", ["Share text", "Share URLs", "Share files"]),
    ("Implement dynamic link generation", ["Shareable URLs", "Preview metadata", "Track opens"]),
    ("Implement clipboard copy with feedback", ["expo-clipboard", "Copy utility", "Toast confirm"]),
], start=1):
    a(f"AK-{i+150:03d}", "linking", 2 if i <= 3 else 3, d, c)

print(f"Total common features: {len(COMMON)}")
