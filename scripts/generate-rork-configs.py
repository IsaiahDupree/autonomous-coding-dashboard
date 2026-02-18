#!/usr/bin/env python3
"""Generate PRDs, feature lists, and prompts for all Rork apps."""

import json
import os

BASE = '/Users/isaiahdupree/Documents/Software'
ACD = os.path.join(BASE, 'autonomous-coding-dashboard')

# Common AppKit integration features (applied to ALL apps)
COMMON_FEATURES = [
    ("AK-001", "setup", 1, "Install Supabase dependencies and create lib/supabase.ts", ["@supabase/supabase-js installed", "Supabase client configured", "Auth helpers setup"]),
    ("AK-002", "setup", 1, "Create .env.example with all required environment variables", ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_STRIPE_KEY"]),
    ("AK-003", "auth", 1, "Install AuthProvider from AppKit with Supabase Auth", ["AuthProvider wraps app", "useAuth hook available", "Session persistence with AsyncStorage"]),
    ("AK-004", "auth", 1, "Create sign-in screen with email/password", ["Email + password form", "Validation", "Error handling", "Link to sign-up"]),
    ("AK-005", "auth", 1, "Create sign-up screen with email/password", ["Registration form", "Email confirmation flow", "Terms acceptance"]),
    ("AK-006", "auth", 1, "Create forgot-password flow", ["Email input", "Reset email sent", "New password screen"]),
    ("AK-007", "auth", 2, "Implement social login (Google + Apple)", ["expo-auth-session", "Google OAuth", "Apple Sign-In", "Account linking"]),
    ("AK-008", "providers", 1, "Install ThemeProvider with dark mode support", ["ThemeProvider wraps app", "useTheme hook", "System preference detection"]),
    ("AK-009", "providers", 1, "Install QueryProvider for data fetching", ["React Query or custom", "Cache management", "Optimistic updates"]),
    ("AK-010", "config", 1, "Create constants/config.ts from AppKit template", ["APP_NAME and APP_SLUG set", "Feature flags configured", "Subscription tiers defined"]),
    ("AK-011", "types", 1, "Create types/models.ts with app-specific entities", ["User and Subscription interfaces", "App entity interfaces", "API response types"]),
    ("AK-012", "api", 1, "Create services/api.ts with Supabase CRUD operations", ["Entity CRUD functions", "User profile operations", "Pagination support"]),
    ("AK-013", "ui", 2, "Install paywall screen from AppKit", ["Plan selection monthly/yearly", "Feature comparison table", "Purchase flow", "Terms text"]),
    ("AK-014", "payments", 2, "Implement RevenueCat for iOS/Android subscriptions", ["react-native-purchases installed", "Product configuration", "Purchase restoration"]),
    ("AK-015", "payments", 2, "Implement Stripe for web payments", ["stripe-react-native", "Checkout flow", "Webhook handling concept"]),
    ("AK-016", "ui", 1, "Install settings screen from AppKit with subscription management", ["Profile section", "Subscription status/upgrade", "Preferences", "Logout"]),
    ("AK-017", "ui", 2, "Create privacy policy and terms of service screens", ["Privacy policy content", "Terms content", "WebView or native text"]),
    ("AK-018", "notifications", 2, "Implement push notifications with Expo", ["expo-notifications installed", "Permission request flow", "Token registration with Supabase"]),
    ("AK-019", "analytics", 2, "Implement analytics with PostHog", ["posthog-react-native installed", "Event tracking", "User identification"]),
    ("AK-020", "layout", 1, "Update root _layout.tsx with all AppKit providers", ["AuthProvider > ThemeProvider > QueryProvider", "DevModeOverlay in dev", "Navigation structure"]),
    ("AK-021", "ui", 2, "Create onboarding flow for first-time users", ["Welcome screens", "Feature highlights", "Auth redirect"]),
    ("AK-022", "ui", 2, "Create user profile screen", ["Avatar upload", "Name editing", "Email display", "Account deletion option"]),
    ("AK-023", "database", 1, "Create Supabase database migrations for users/subscriptions", ["users table", "subscriptions table", "RLS policies"]),
    ("AK-024", "config", 2, "Configure deep linking and URL scheme", ["app.json scheme", "Universal links setup", "Route handling"]),
    ("AK-025", "quality", 2, "Add error boundaries and offline handling", ["ErrorBoundary component", "Network status detection", "Graceful offline mode"]),
]

APPS = [
    {
        "dir": "rork-crm-superwall", "name": "AI-Enhanced Personal CRM", "slug": "rork-crm",
        "category": "business/crm",
        "desc": "AI-powered personal CRM for managing contacts, relationships, and communication",
        "entities": ["Contact", "Interaction", "MessageTemplate", "Goal"],
        "features": [
            ("CRM-001", "database", 2, "Create Supabase contacts table with RLS", ["user_id FK", "name, email, phone", "tags, notes", "warmth_score"]),
            ("CRM-002", "database", 2, "Create interactions table tracking all touchpoints", ["FK to contacts", "type (call, text, email, meeting)", "notes, sentiment"]),
            ("CRM-003", "api", 2, "Implement contact sync from device contacts", ["Permission handling", "Merge duplicates", "Background sync"]),
            ("CRM-004", "api", 2, "Implement AI message generation with real API", ["OpenAI/Claude integration", "Context-aware suggestions", "Tone selection"]),
            ("CRM-005", "api", 2, "Implement warmth scoring algorithm", ["Decay over time", "Boost on interaction", "Configurable thresholds"]),
            ("CRM-006", "ui", 3, "Implement contact import from CSV/vCard", ["File picker", "Field mapping", "Preview before import"]),
            ("CRM-007", "api", 3, "Implement push notification reminders for contact warmth", ["Schedule notifications", "Warmth decay alerts", "Birthday reminders"]),
            ("CRM-008", "api", 2, "Implement contact search and filtering", ["Full-text search via Supabase", "Filter by tags/warmth", "Sort options"]),
            ("CRM-009", "ui", 3, "Create relationship timeline view", ["Chronological interactions", "Visual timeline", "Quick add interaction"]),
            ("CRM-010", "api", 3, "Implement data export (contacts, interactions)", ["CSV export", "vCard export", "JSON backup"]),
        ]
    },
    {
        "dir": "kawaii-coffee-timer", "name": "Kawaii Coffee Timer", "slug": "kawaii-coffee",
        "category": "lifestyle",
        "desc": "Cute kawaii-themed coffee brewing timer with brew method presets and customization",
        "entities": ["BrewMethod", "BrewSession", "CoffeeBean"],
        "features": [
            ("COF-001", "database", 2, "Create Supabase brew_sessions table", ["user_id FK", "method, grind, ratio", "duration, temperature", "rating, notes"]),
            ("COF-002", "database", 2, "Create coffee_beans table for bean library", ["origin, roast level", "flavor notes", "purchase info"]),
            ("COF-003", "api", 2, "Implement brew history with statistics", ["Total brews count", "Favorite method", "Average rating trends"]),
            ("COF-004", "api", 2, "Implement cloud sync for brew presets", ["Custom timer presets", "Sync across devices", "Share presets"]),
            ("COF-005", "ui", 3, "Add brew method recommendation engine", ["Based on bean type", "Time of day", "User preferences"]),
            ("COF-006", "ui", 3, "Implement achievements/badges system", ["Brew milestones", "Method explorer", "Streak tracking"]),
            ("COF-007", "api", 3, "Implement social sharing of brew results", ["Share card generation", "Instagram story format"]),
            ("COF-008", "shop", 3, "Implement in-app shop with premium themes", ["RevenueCat consumables", "Unlock kawaii themes", "Special timer sounds"]),
        ]
    },
    {
        "dir": "rork-voice-chat-pdf", "name": "Voice Chat PDF", "slug": "voice-chat-pdf",
        "category": "productivity",
        "desc": "Voice-based chat interface for interacting with PDF documents using AI",
        "entities": ["PDF", "ChatSession", "Collection"],
        "features": [
            ("PDF-001", "database", 2, "Create Supabase pdfs table with storage", ["user_id FK", "Supabase Storage for files", "metadata extraction"]),
            ("PDF-002", "database", 2, "Create chat_sessions table", ["FK to pdfs", "messages JSONB", "context window tracking"]),
            ("PDF-003", "api", 2, "Implement PDF text extraction pipeline", ["pdf-parse or pdfjs", "Chunk into embeddings", "Store in pgvector"]),
            ("PDF-004", "api", 2, "Implement RAG chat with real AI API", ["OpenAI/Claude integration", "Vector similarity search"]),
            ("PDF-005", "api", 2, "Implement voice-to-text with Whisper API", ["Real speech recognition", "Streaming transcription"]),
            ("PDF-006", "api", 3, "Implement text-to-speech for responses", ["ElevenLabs or OpenAI TTS", "Voice selection"]),
            ("PDF-007", "ui", 3, "Implement PDF viewer with highlight sync", ["Page navigation", "Highlight referenced sections"]),
            ("PDF-008", "api", 3, "Implement collection organization", ["Group PDFs", "Shared context across collection"]),
            ("PDF-009", "api", 3, "Implement chat history export", ["Markdown export", "PDF summary generation"]),
            ("PDF-010", "storage", 2, "Implement Supabase Storage for PDF uploads", ["Upload with progress", "Size limits per tier"]),
        ]
    },
    {
        "dir": "rork-youtube-quiz-generator", "name": "YouTube Quiz Generator", "slug": "youtube-quiz",
        "category": "education",
        "desc": "Generate quizzes from YouTube videos for learning and retention",
        "entities": ["Quiz", "Question", "UserProgress"],
        "features": [
            ("QZ-001", "database", 2, "Create Supabase quizzes table", ["user_id FK", "youtube_url, video_title", "questions JSONB"]),
            ("QZ-002", "database", 2, "Create user_progress table", ["FK to quizzes", "score, attempts", "streak tracking"]),
            ("QZ-003", "api", 2, "Implement YouTube transcript extraction", ["Real YouTube API or yt-dlp", "Caption extraction"]),
            ("QZ-004", "api", 2, "Implement AI quiz generation from transcript", ["OpenAI/Claude for question gen", "Multiple choice + open ended"]),
            ("QZ-005", "api", 3, "Implement spaced repetition algorithm", ["SM-2 or similar", "Review scheduling"]),
            ("QZ-006", "ui", 3, "Implement learning path creation", ["Group quizzes by topic", "Progress tracking"]),
            ("QZ-007", "api", 3, "Implement quiz sharing and leaderboards", ["Share quiz via link", "Public leaderboard"]),
            ("QZ-008", "api", 3, "Implement offline quiz support", ["Cache quizzes locally", "Sync scores when online"]),
        ]
    },
    {
        "dir": "rork-ai-calculator-builder", "name": "AI Calculator Builder", "slug": "ai-calculator",
        "category": "tools",
        "desc": "Build custom calculators using AI-powered formula generation",
        "entities": ["Calculator", "Formula", "CalculationHistory"],
        "features": [
            ("CALC-001", "database", 2, "Create Supabase calculators table", ["user_id FK", "name, description", "formula_config JSONB"]),
            ("CALC-002", "api", 2, "Implement AI formula generation", ["Natural language to formula", "OpenAI/Claude integration"]),
            ("CALC-003", "api", 3, "Implement calculator sharing marketplace", ["Public gallery", "Copy/fork calculators"]),
            ("CALC-004", "api", 2, "Implement calculation history with cloud sync", ["Save past calculations", "Favorites"]),
            ("CALC-005", "ui", 3, "Implement custom calculator builder UI", ["Drag-drop fields", "Formula editor"]),
            ("CALC-006", "api", 3, "Implement unit conversion support", ["Standard unit library", "Custom units"]),
        ]
    },
    {
        "dir": "rork-client-portal-system", "name": "Client Portal System", "slug": "client-portal",
        "category": "business",
        "desc": "Client-facing portal for project management, invoicing, and communication",
        "entities": ["Client", "Project", "Invoice", "Message"],
        "features": [
            ("CP-001", "database", 2, "Create Supabase clients table with RLS", ["user_id (owner)", "client info fields", "status, tier"]),
            ("CP-002", "database", 2, "Create projects table linked to clients", ["FK to clients", "status workflow", "milestones JSONB"]),
            ("CP-003", "database", 2, "Create invoices table", ["FK to projects/clients", "line items JSONB", "status"]),
            ("CP-004", "api", 2, "Implement invoice generation and PDF export", ["Template system", "PDF generation"]),
            ("CP-005", "api", 2, "Implement client messaging system", ["Supabase Realtime", "File attachments"]),
            ("CP-006", "api", 3, "Implement project milestone tracking", ["Status updates", "Due dates"]),
            ("CP-007", "api", 3, "Implement Stripe payment integration for invoices", ["Payment links", "Webhook handling"]),
            ("CP-008", "ui", 3, "Implement client-facing read-only view", ["Shareable link", "Project progress"]),
        ]
    },
    {
        "dir": "rork-collaborative-ai-workos", "name": "Collaborative AI WorkOS", "slug": "collab-ai-workos",
        "category": "productivity",
        "desc": "Collaborative AI workspace for team productivity and project management",
        "entities": ["Workspace", "Task", "AIAssistant"],
        "features": [
            ("WK-001", "database", 2, "Create Supabase workspaces table with team support", ["owner_id, team members", "workspace settings"]),
            ("WK-002", "database", 2, "Create tasks table with real-time sync", ["FK to workspace", "assignee, status", "priority"]),
            ("WK-003", "api", 2, "Implement real-time collaboration via Supabase Realtime", ["Presence indicators", "Live updates"]),
            ("WK-004", "api", 2, "Implement AI task assistant with real API", ["OpenAI/Claude integration", "Task breakdown"]),
            ("WK-005", "api", 3, "Implement team invitation system", ["Email invites", "Role-based access"]),
            ("WK-006", "api", 3, "Implement workspace analytics", ["Task completion rates", "Team productivity"]),
        ]
    },
    {
        "dir": "rork-couples-habit-tracker", "name": "Couples Habit Tracker", "slug": "couples-habits",
        "category": "lifestyle",
        "desc": "Shared habit tracking app for couples with accountability features",
        "entities": ["Habit", "HabitLog", "Partner"],
        "features": [
            ("CH-001", "database", 2, "Create Supabase habits table with partner sharing", ["user_id + partner_id", "shared habits flag"]),
            ("CH-002", "database", 2, "Create habit_logs table", ["FK to habits", "completed_at", "notes, mood"]),
            ("CH-003", "api", 2, "Implement partner linking system", ["Invite code generation", "Partner acceptance flow"]),
            ("CH-004", "api", 2, "Implement streak tracking with notifications", ["Daily reminder push", "Streak milestones"]),
            ("CH-005", "api", 3, "Implement shared analytics dashboard", ["Both partners progress", "Weekly trends"]),
            ("CH-006", "ui", 3, "Implement celebration animations for milestones", ["Streak achievements", "Shared goal completion"]),
        ]
    },
    {
        "dir": "rork-ig-research---lead-finder", "name": "IG Research and Lead Finder", "slug": "ig-lead-finder",
        "category": "marketing",
        "desc": "Instagram research tool for finding and managing leads",
        "entities": ["Lead", "SearchQuery", "Campaign"],
        "features": [
            ("IG-001", "database", 2, "Create Supabase leads table", ["user_id FK", "ig_handle, bio, followers", "tags, status"]),
            ("IG-002", "database", 2, "Create search_queries table for saved searches", ["search params JSONB", "results count"]),
            ("IG-003", "api", 2, "Implement Instagram profile data fetching", ["Real API or scraping service", "Rate limiting"]),
            ("IG-004", "api", 2, "Implement lead scoring algorithm", ["Engagement rate analysis", "Niche relevance"]),
            ("IG-005", "api", 3, "Implement lead list management and export", ["Tag/categorize leads", "CSV export"]),
            ("IG-006", "api", 3, "Implement campaign tracking", ["Outreach templates", "Response tracking"]),
            ("IG-007", "api", 3, "Implement AI-powered niche analysis", ["Competitor analysis", "Content gap identification"]),
        ]
    },
    {
        "dir": "rork-learning-to-gigs-app", "name": "Learning-to-Gigs", "slug": "learning-gigs",
        "category": "education",
        "desc": "Bridge learning skills to freelance gig opportunities",
        "entities": ["Skill", "Gig", "LearningPath"],
        "features": [
            ("LG-001", "database", 2, "Create Supabase skills table with proficiency tracking", ["user_id FK", "skill name, category", "proficiency 1-10"]),
            ("LG-002", "database", 2, "Create gigs table", ["FK to skills", "platform, rate", "status, client"]),
            ("LG-003", "api", 2, "Implement skill-to-gig matching algorithm", ["Map skills to platforms", "Rate estimation"]),
            ("LG-004", "api", 2, "Implement learning path generation with AI", ["OpenAI/Claude for curriculum", "Milestone tracking"]),
            ("LG-005", "api", 3, "Implement earnings tracking and projections", ["Log gig earnings", "Monthly trends"]),
            ("LG-006", "ui", 3, "Implement portfolio builder", ["Showcase skills", "Gig history", "Shareable link"]),
            ("LG-007", "api", 3, "Implement gig platform integration", ["Fiverr, Upwork API hooks", "Job alerts"]),
        ]
    },
    {
        "dir": "rork-media-ai-schema---app", "name": "Media AI Schema", "slug": "media-ai-schema",
        "category": "media",
        "desc": "AI-powered media schema management and content organization",
        "entities": ["MediaAsset", "Schema", "AITag"],
        "features": [
            ("MAS-001", "database", 2, "Create Supabase media_assets table with storage", ["user_id FK", "Supabase Storage", "metadata JSONB"]),
            ("MAS-002", "database", 2, "Create schemas table for content organization", ["schema definition JSONB", "applied_to assets"]),
            ("MAS-003", "api", 2, "Implement AI auto-tagging with vision API", ["Google Vision or OpenAI Vision", "Auto-categorize"]),
            ("MAS-004", "api", 3, "Implement media search with vector embeddings", ["Supabase pgvector", "Semantic search"]),
            ("MAS-005", "api", 3, "Implement batch media processing", ["Queue-based processing", "Thumbnail generation"]),
            ("MAS-006", "api", 3, "Implement schema templates marketplace", ["Share schemas", "Import/export"]),
        ]
    },
    {
        "dir": "rork-meta-content-growth-hub", "name": "Meta Content Growth Hub", "slug": "meta-growth-hub",
        "category": "marketing",
        "desc": "Content growth analytics and strategy for Meta platforms",
        "entities": ["ContentPiece", "GrowthMetric", "Strategy"],
        "features": [
            ("MCG-001", "database", 2, "Create Supabase content_pieces table", ["user_id FK", "platform, type", "metrics JSONB"]),
            ("MCG-002", "api", 2, "Implement Meta Graph API integration", ["OAuth flow", "Page insights"]),
            ("MCG-003", "api", 2, "Implement content performance scoring", ["Engagement rate calc", "Reach analysis"]),
            ("MCG-004", "api", 3, "Implement AI content strategy suggestions", ["Best posting times", "Content type recommendations"]),
            ("MCG-005", "api", 3, "Implement growth tracking dashboard data", ["Follower trends", "Engagement trends"]),
            ("MCG-006", "api", 3, "Implement content calendar with scheduling", ["Plan posts", "Reminder notifications"]),
        ]
    },
    {
        "dir": "rork-promap-rf-indoor-mapper", "name": "ProMap RF Indoor Mapper", "slug": "promap-rf",
        "category": "tools",
        "desc": "Indoor RF signal mapping and WiFi coverage analysis tool",
        "entities": ["FloorPlan", "ScanPoint", "HeatMap"],
        "features": [
            ("RF-001", "database", 2, "Create Supabase floor_plans table with storage", ["user_id FK", "Image upload to Supabase Storage"]),
            ("RF-002", "database", 2, "Create scan_points table", ["FK to floor_plans", "x,y coordinates", "signal_strength, ssid"]),
            ("RF-003", "api", 2, "Implement WiFi scanning with device APIs", ["expo-network or native module", "Signal capture"]),
            ("RF-004", "api", 2, "Implement heatmap generation algorithm", ["Interpolation from scan points", "Color gradient"]),
            ("RF-005", "api", 3, "Implement floor plan annotation tools", ["Add walls, obstacles", "Mark access points"]),
            ("RF-006", "api", 3, "Implement scan report generation", ["PDF report with heatmap", "Coverage statistics"]),
        ]
    },
    {
        "dir": "rork-pulselense", "name": "PulseLense", "slug": "pulselense",
        "category": "analytics",
        "desc": "Real-time analytics and monitoring dashboard for digital presence",
        "entities": ["Dashboard", "Metric", "Alert"],
        "features": [
            ("PL-001", "database", 2, "Create Supabase dashboards table", ["user_id FK", "layout config JSONB"]),
            ("PL-002", "database", 2, "Create metrics table with time-series data", ["FK to dashboards", "metric_type, value", "timestamp"]),
            ("PL-003", "database", 2, "Create alerts table", ["FK to metrics", "threshold, condition"]),
            ("PL-004", "api", 2, "Implement data source connectors", ["Google Analytics", "Social media APIs"]),
            ("PL-005", "api", 2, "Implement real-time metric updates via Supabase Realtime", ["Live dashboard updates", "WebSocket"]),
            ("PL-006", "api", 3, "Implement alert engine with push notifications", ["Threshold monitoring", "Anomaly detection"]),
            ("PL-007", "ui", 3, "Implement customizable dashboard builder", ["Widget library", "Chart types"]),
            ("PL-008", "api", 3, "Implement scheduled report generation", ["Daily/weekly digests", "PDF reports"]),
        ]
    },
    {
        "dir": "rork-simulive---multistream-studio", "name": "Simulive Multistream Studio", "slug": "simulive-studio",
        "category": "streaming",
        "desc": "Simulive broadcasting and multi-platform streaming management",
        "entities": ["Stream", "Destination", "Schedule"],
        "features": [
            ("SIM-001", "database", 2, "Create Supabase streams table", ["user_id FK", "title, description", "video_url, status"]),
            ("SIM-002", "database", 2, "Create destinations table for multi-platform", ["FK to streams", "platform, stream_key encrypted"]),
            ("SIM-003", "api", 2, "Implement stream scheduling system", ["Calendar integration", "Recurring schedules"]),
            ("SIM-004", "api", 2, "Implement multi-destination RTMP management", ["Stream key storage encrypted", "Health monitoring"]),
            ("SIM-005", "api", 3, "Implement pre-recorded video simulive playback", ["Upload to Supabase Storage", "Timed playback"]),
            ("SIM-006", "api", 3, "Implement stream analytics aggregation", ["Viewer counts per platform", "Engagement metrics"]),
        ]
    },
    {
        "dir": "rork-social-media-campaign-manager", "name": "Social Media Campaign Manager", "slug": "social-campaigns",
        "category": "marketing",
        "desc": "Plan, execute, and track social media marketing campaigns",
        "entities": ["Campaign", "Post", "Analytics"],
        "features": [
            ("SC-001", "database", 2, "Create Supabase campaigns table", ["user_id FK", "name, objective", "budget, date range"]),
            ("SC-002", "database", 2, "Create posts table linked to campaigns", ["FK to campaigns", "content, media_urls", "scheduled_at"]),
            ("SC-003", "api", 2, "Implement multi-platform posting", ["Meta, TikTok, X APIs", "Media upload"]),
            ("SC-004", "api", 3, "Implement campaign analytics aggregation", ["Cross-platform metrics", "ROI calculation"]),
            ("SC-005", "api", 2, "Implement AI caption and hashtag generation", ["OpenAI/Claude integration", "Platform-optimized"]),
            ("SC-006", "api", 3, "Implement content calendar with drag-drop", ["Visual calendar", "Bulk scheduling"]),
            ("SC-007", "api", 3, "Implement budget tracking and alerts", ["Spend tracking", "Budget pacing"]),
        ]
    },
    {
        "dir": "rork-sora-watermark-remover", "name": "Sora Watermark Remover", "slug": "sora-watermark",
        "category": "tools",
        "desc": "Remove watermarks from Sora AI-generated videos",
        "entities": ["Video", "ProcessingJob"],
        "features": [
            ("SWR-001", "database", 2, "Create Supabase videos table with storage", ["user_id FK", "Supabase Storage", "original_url, processed_url"]),
            ("SWR-002", "api", 2, "Implement video upload with progress tracking", ["Chunked upload", "Progress bar"]),
            ("SWR-003", "api", 2, "Implement watermark detection algorithm", ["Frame analysis", "Watermark region detection"]),
            ("SWR-004", "api", 2, "Implement video processing pipeline", ["FFmpeg or cloud processing", "Quality preservation"]),
            ("SWR-005", "api", 3, "Implement processing queue with status updates", ["Background job queue", "Supabase Realtime status"]),
            ("SWR-006", "storage", 3, "Implement processed video download and sharing", ["Download link generation", "Auto-cleanup after 30 days"]),
        ]
    },
    {
        "dir": "rork-strongface", "name": "StrongFace", "slug": "strongface",
        "category": "fitness",
        "desc": "Facial exercise and fitness app with guided routines",
        "entities": ["Exercise", "Routine", "Progress"],
        "features": [
            ("SF-001", "database", 2, "Create Supabase exercises table", ["name, description", "muscle_group", "video_url, duration"]),
            ("SF-002", "database", 2, "Create routines table with exercise sequences", ["user_id FK", "exercises JSONB array", "total_duration"]),
            ("SF-003", "database", 2, "Create user_progress table", ["FK to routines", "completed_at", "streak tracking"]),
            ("SF-004", "api", 2, "Implement guided routine player with timer", ["Step-by-step instructions", "Rest periods"]),
            ("SF-005", "api", 3, "Implement progress tracking with before/after photos", ["Supabase Storage for photos", "Timeline view"]),
            ("SF-006", "api", 3, "Implement custom routine builder", ["Select exercises", "Set order and reps"]),
            ("SF-007", "api", 2, "Implement streak and achievement system", ["Daily streak tracking", "Push notification reminders"]),
            ("SF-008", "api", 3, "Implement AI form analysis via camera", ["Real-time face detection", "Form correction suggestions"]),
        ]
    },
    {
        "dir": "rork-unified-media-gallery-app", "name": "Unified Media Gallery", "slug": "unified-media",
        "category": "media",
        "desc": "Aggregate and manage media from multiple platforms in one gallery",
        "entities": ["MediaItem", "Source", "Album"],
        "features": [
            ("UMG-001", "database", 2, "Create Supabase media_items table", ["user_id FK", "source_platform", "media_url, metadata JSONB"]),
            ("UMG-002", "database", 2, "Create sources table for connected platforms", ["user_id FK", "platform, auth_token encrypted"]),
            ("UMG-003", "api", 2, "Implement Google Photos API integration", ["OAuth flow", "Album sync"]),
            ("UMG-004", "api", 2, "Implement Instagram media sync", ["Graph API integration", "Media download"]),
            ("UMG-005", "api", 3, "Implement unified search across all sources", ["Supabase full-text search", "Filter by source/date"]),
            ("UMG-006", "api", 3, "Implement smart album creation with AI", ["Auto-categorize by content", "Face grouping"]),
            ("UMG-007", "api", 3, "Implement media backup to Supabase Storage", ["Selective backup", "Storage quota per tier"]),
        ]
    },
    {
        "dir": "rork-vlogflow--plan---film", "name": "VlogFlow Plan and Film", "slug": "vlogflow",
        "category": "media/video",
        "desc": "Plan, script, and film vlogs with AI-assisted workflow",
        "entities": ["Vlog", "Shot", "Script"],
        "features": [
            ("VF-001", "database", 2, "Create Supabase vlogs table", ["user_id FK", "title, description", "status workflow"]),
            ("VF-002", "database", 2, "Create shots table (shot list)", ["FK to vlogs", "description, type", "duration, order"]),
            ("VF-003", "api", 2, "Implement AI script generation", ["OpenAI/Claude integration", "Topic to outline"]),
            ("VF-004", "api", 2, "Implement shot list management", ["Reorder shots", "Assign clips"]),
            ("VF-005", "api", 3, "Implement filming checklist with GPS locations", ["Location tracking", "Equipment checklist"]),
            ("VF-006", "api", 3, "Implement vlog analytics after publish", ["Views, engagement", "Content insights"]),
        ]
    },
    {
        "dir": "rork-voice-to-letter-love-notes", "name": "Voice-to-Letter Love Notes", "slug": "voice-love-notes",
        "category": "lifestyle",
        "desc": "Convert voice recordings into beautifully formatted love letters",
        "entities": ["VoiceNote", "Letter", "Template"],
        "features": [
            ("VL-001", "database", 2, "Create Supabase voice_notes table with storage", ["user_id FK", "Supabase Storage for audio", "transcription"]),
            ("VL-002", "database", 2, "Create letters table", ["FK to voice_notes", "formatted_text", "template_id"]),
            ("VL-003", "api", 2, "Implement voice-to-text transcription", ["Whisper API integration", "Real-time transcription"]),
            ("VL-004", "api", 2, "Implement AI letter formatting and enhancement", ["OpenAI/Claude for style", "Multiple writing styles"]),
            ("VL-005", "api", 3, "Implement letter template system", ["Beautiful templates", "Custom fonts/colors"]),
            ("VL-006", "api", 3, "Implement letter delivery options", ["Email delivery", "PDF download", "Share link"]),
            ("VL-007", "ui", 3, "Implement letter preview with handwriting fonts", ["Handwriting style rendering", "Stationery backgrounds"]),
        ]
    },
]


def generate_prd(app):
    return f"""# PRD: {app['name']}

## Overview
{app['desc']}

## Category
{app['category']}

## Tech Stack
- **Framework**: React Native + Expo (Expo Router)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Payments**: Stripe (web) + RevenueCat (iOS/Android)
- **Analytics**: PostHog
- **AI**: OpenAI / Claude API (where applicable)

## AppKit Integration
This app will be upgraded with the EverReach AppKit, providing:
- Supabase authentication (email/password + social login)
- Subscription management (free/pro tiers)
- Push notifications
- Analytics tracking
- Settings and profile screens
- Paywall with plan selection
- Error boundaries and offline support

## Core Entities
{chr(10).join(f'- **{e}**' for e in app['entities'])}

## App-Specific Features
{chr(10).join(f'- {f[0]}: {f[3]}' for f in app['features'])}

## Subscription Tiers
### Free
- Basic app functionality
- Limited storage/usage

### Pro ($9.99/mo or $99.99/yr)
- Unlimited usage
- Cloud sync
- Priority features
- Export capabilities
"""


def generate_feature_list(app):
    features = []
    for fid, cat, pri, desc, criteria in COMMON_FEATURES:
        features.append({
            "id": fid, "category": cat, "priority": pri,
            "description": desc, "acceptance_criteria": criteria, "passes": False
        })
    for fid, cat, pri, desc, criteria in app['features']:
        features.append({
            "id": fid, "category": cat, "priority": pri,
            "description": desc, "acceptance_criteria": criteria, "passes": False
        })
    return {
        "project": app['name'],
        "description": f"AppKit integration + app-specific features for {app['name']}",
        "version": "1.0", "created": "2026-02-14",
        "total_features": len(features), "features": features
    }


def generate_prompt(app):
    return f"""# {app['name']} - ACD Harness Prompt

## AUTONOMOUS MODE
You are operating autonomously. Do NOT ask what to work on.
Read the feature_list.json, find the first feature where "passes": false, implement it, then move to the next.

## Project Context
{app['desc']}

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
{chr(10).join(f'- {e}' for e in app['entities'])}

## Rules
1. NO mock data, mock providers, placeholder stubs, or TODO returns in production code
2. All API integrations must use real endpoints (Supabase, OpenAI, etc.)
3. All database operations must use Supabase with proper RLS policies
4. Environment variables for all secrets (never hardcode API keys)
5. TypeScript strict mode - no any types
6. Follow existing code style and patterns in the project
7. Test each feature works before marking as complete
"""


# Main generation
total_features = 0
for app in APPS:
    d = app['dir']
    app_path = os.path.join(BASE, d)
    
    if not os.path.isdir(app_path):
        print(f"  SKIP {d} - directory not found")
        continue
    
    # PRD
    with open(os.path.join(app_path, 'PRD.md'), 'w') as f:
        f.write(generate_prd(app))
    
    # Feature list
    fl = generate_feature_list(app)
    with open(os.path.join(app_path, 'feature_list.json'), 'w') as f:
        json.dump(fl, f, indent=2)
    
    # Prompt
    with open(os.path.join(ACD, 'harness', 'prompts', f'{app["slug"]}.md'), 'w') as f:
        f.write(generate_prompt(app))
    
    n = fl['total_features']
    total_features += n
    print(f"  OK {d}: PRD + {n} features + {app['slug']}.md")

print(f"\nGenerated for {len(APPS)} apps, {total_features} total features")
