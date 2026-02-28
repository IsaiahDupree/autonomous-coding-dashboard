# AAG Agent 01 — Foundation: Database & Query Layer

## Mission
Build the entire database layer for the Autonomous Acquisition Agent system. Every other agent depends on these tables existing. Build this first — nothing else can run without it.

## Features to Build
AAG-001, AAG-002, AAG-003, AAG-121, AAG-122, AAG-151, AAG-152, AAG-179

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/db/migrations/001_acquisition_tables.sql` — all tables
- `acquisition/db/migrations/002_crm_contacts_columns.sql` — ALTER TABLE additions
- `acquisition/db/queries.py` — all typed async query functions
- `acquisition/config.py` — all config constants + env var loading
- `acquisition/__init__.py` — package init

## Tables to Create (all in one migration file)
```sql
-- From PRD-022
acq_niche_configs       (id, name, service_slug, platforms[], keywords[], icp_min_score, skip_warmup_min_score, scoring_prompt, max_weekly, is_active, created_at)
acq_discovery_runs      (id, niche_config_id, platform, keyword, discovered, deduplicated, seeded, errors jsonb, duration_ms, run_at)

-- From PRD-023
acq_warmup_configs      (id, niche_config_id, comments_target, window_days, min_gap_hours, use_ai_comments, comment_tone, platforms_priority[], created_at)
acq_warmup_schedules    (id, contact_id, platform, post_url, scheduled_at, comment_text, sent_at, comment_id, status, skip_reason, created_at)

-- From PRD-024
acq_outreach_sequences  (id, contact_id, service_slug, touch_number, message_text, platform, scheduled_at, sent_at, message_id uuid, status, skip_reason, created_at)
acq_human_notifications (id, contact_id, trigger, summary, context_url, notified_via[], notified_at, actioned_at, created_at)

-- From PRD-025
acq_daily_caps          (id, action_type, platform, daily_limit, sent_today, reset_at, updated_at)
acq_funnel_events       (id, contact_id, from_stage, to_stage, triggered_by, metadata jsonb, occurred_at)

-- From PRD-026
acq_weekly_reports      (id, week_start, week_end, discovered, qualified, warmup_sent, dms_sent, replies_received, calls_booked, closed_won, qualify_rate, reply_rate, close_rate, top_platform, top_niche, insights jsonb, report_md, delivered_at, created_at)
acq_message_variants    (id, variant_name, service_slug, touch_number, template_text, sends, replies, reply_rate, is_active, created_at)

-- From PRD-027
acq_email_sequences     (id, contact_id, service_slug, touch_number, subject, body_text, body_html, from_email, to_email, scheduled_at, sent_at, opened_at, clicked_at, resend_id, status, created_at)
acq_email_discoveries   (id, contact_id, email, source, confidence, verified, mx_valid, discovered_at)
acq_email_unsubscribes  (id, email UNIQUE, contact_id, reason, unsubscribed_at)

-- From PRD-028
acq_entity_associations (id, contact_id, known_platform, known_handle, found_platform, found_handle, found_url, association_type, confidence, confirmed, evidence_sources[], claude_reasoning, resolved_at, created_at)
acq_resolution_runs     (id, contact_id, associations_found, associations_confirmed, platforms_resolved[], email_found, linkedin_found, duration_ms, run_at)
acq_resolution_queue    (id, contact_id, priority, queued_at)
acq_api_usage           (id, api_name, request_count, estimated_cost_usd, date)
```

## ALTER TABLE crm_contacts (002 migration)
```sql
ADD COLUMN IF NOT EXISTS twitter_handle text;
ADD COLUMN IF NOT EXISTS instagram_handle text;
ADD COLUMN IF NOT EXISTS tiktok_handle text;
ADD COLUMN IF NOT EXISTS linkedin_url text;
ADD COLUMN IF NOT EXISTS website_url text;
ADD COLUMN IF NOT EXISTS email text;
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ADD COLUMN IF NOT EXISTS email_source text;
ADD COLUMN IF NOT EXISTS active_channel text DEFAULT 'dm';
ADD COLUMN IF NOT EXISTS email_opted_out boolean DEFAULT false;
ADD COLUMN IF NOT EXISTS entity_resolved boolean DEFAULT false;
ADD COLUMN IF NOT EXISTS resolution_score integer;
ADD COLUMN IF NOT EXISTS niche_label text;
ADD COLUMN IF NOT EXISTS source_niche_config_id uuid;
ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new';
ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz;
ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;
ADD COLUMN IF NOT EXISTS archived_at timestamptz;
```

## queries.py Requirements
- Async httpx-based Supabase REST client (follow crm_brain.py pattern exactly)
- One function per query, typed with Pydantic or TypedDict return types
- Include: upsert_contact, get_unscored_contacts, get_qualified_contacts, get_warming_contacts, get_ready_for_dm, get_contacts_by_stage, update_pipeline_stage, get_daily_cap, increment_daily_cap, reset_daily_caps, insert_funnel_event, get_recent_discovery_runs, insert_warmup_schedule, get_pending_warmup, insert_outreach_sequence, get_pending_outreach, insert_email_sequence, get_pending_email, upsert_entity_association, get_unresolved_contacts

## config.py Requirements
```python
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "outreach@example.com")
ENABLE_ACQUISITION = os.environ.get("ENABLE_ACQUISITION", "false").lower() == "true"

DM_SERVICE_PORTS = {"instagram": 3001, "twitter": 3003, "tiktok": 3102, "linkedin": 3105}
COMMENT_SERVICE_PORTS = {"instagram": 3005, "twitter": 3007, "tiktok": 3006, "threads": 3004}
MARKET_RESEARCH_PORT = 3106

DEFAULT_DAILY_CAPS = {
    ("dm", "instagram"): 20, ("dm", "twitter"): 50,
    ("dm", "tiktok"): 30, ("dm", "linkedin"): 50,
    ("comment", "instagram"): 25, ("comment", "twitter"): 40,
    ("comment", "tiktok"): 25, ("comment", "threads"): 30,
    ("email", "email"): 30,
}
```

## Seed Data (in queries.py or a seed script)
Seed `acq_daily_caps` with DEFAULT_DAILY_CAPS on first run.
Seed 3 default `acq_niche_configs`:
1. name="ai-automation-coaches", platforms=["instagram","twitter","tiktok"], keywords=["ai automation","solopreneur","ai tools"], service_slug="ai-content-engine", icp_min_score=65
2. name="agency-owners-b2b", platforms=["linkedin","twitter"], keywords=["agency owner","social media agency","digital marketing agency"], service_slug="linkedin-lead-gen", icp_min_score=72
3. name="content-creators-growth", platforms=["tiktok","instagram","threads"], keywords=["content creator","grow on social","content strategy"], service_slug="social-outreach", icp_min_score=60
