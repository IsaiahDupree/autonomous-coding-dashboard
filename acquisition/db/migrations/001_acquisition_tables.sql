-- Autonomous Acquisition Agent — database tables
-- Project: ivhfuhxorppptyuofbgq (Supabase)

-- Niche targeting configurations
CREATE TABLE IF NOT EXISTS acq_niche_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    niche_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    platforms TEXT[] NOT NULL DEFAULT '{}',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    icp_criteria JSONB NOT NULL DEFAULT '{}',
    daily_discovery_limit INT NOT NULL DEFAULT 50,
    daily_dm_limit INT NOT NULL DEFAULT 10,
    warmup_comments_before_dm INT NOT NULL DEFAULT 3,
    warmup_interval_hours INT NOT NULL DEFAULT 24,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discovery run logs
CREATE TABLE IF NOT EXISTS acq_discovery_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    niche_id TEXT NOT NULL REFERENCES acq_niche_configs(niche_id),
    platform TEXT NOT NULL,
    search_query TEXT,
    contacts_found INT NOT NULL DEFAULT 0,
    contacts_new INT NOT NULL DEFAULT 0,
    contacts_skipped INT NOT NULL DEFAULT 0,
    duration_ms INT,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Per-contact warmup comment schedule
CREATE TABLE IF NOT EXISTS acq_warmup_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL,
    platform TEXT NOT NULL,
    post_url TEXT NOT NULL,
    comment_text TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    error TEXT,
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warmup_schedules_contact ON acq_warmup_schedules(contact_id);
CREATE INDEX IF NOT EXISTS idx_warmup_schedules_status ON acq_warmup_schedules(status, scheduled_at);

-- Warmup parameters per niche
CREATE TABLE IF NOT EXISTS acq_warmup_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    niche_id TEXT NOT NULL REFERENCES acq_niche_configs(niche_id),
    platform TEXT NOT NULL,
    comments_required INT NOT NULL DEFAULT 3,
    interval_hours INT NOT NULL DEFAULT 24,
    comment_style TEXT NOT NULL DEFAULT 'helpful',
    comment_templates JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (niche_id, platform)
);

-- Per-contact DM sequence tracking
CREATE TABLE IF NOT EXISTS acq_outreach_sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL,
    platform TEXT NOT NULL,
    sequence_step INT NOT NULL DEFAULT 1,
    message_text TEXT,
    variant_id UUID,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'replied')),
    reply_detected_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_contact ON acq_outreach_sequences(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status ON acq_outreach_sequences(status);

-- Human handoff notification log
CREATE TABLE IF NOT EXISTS acq_human_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID,
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'telegram')),
    subject TEXT,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

-- Per-platform per-action daily limits
CREATE TABLE IF NOT EXISTS acq_daily_caps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL,
    action TEXT NOT NULL,
    cap_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_limit INT NOT NULL,
    current_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (platform, action, cap_date)
);

-- Weekly report storage
CREATE TABLE IF NOT EXISTS acq_weekly_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    funnel_summary JSONB NOT NULL DEFAULT '{}',
    platform_breakdown JSONB NOT NULL DEFAULT '{}',
    recommendations TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A/B message variant tracking
CREATE TABLE IF NOT EXISTS acq_message_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    niche_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    sequence_step INT NOT NULL DEFAULT 1,
    variant_name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    times_sent INT NOT NULL DEFAULT 0,
    times_replied INT NOT NULL DEFAULT 0,
    reply_rate NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE WHEN times_sent > 0 THEN times_replied::NUMERIC / times_sent ELSE 0 END
    ) STORED,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every stage transition event log (immutable audit trail)
CREATE TABLE IF NOT EXISTS acq_funnel_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL,
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    triggered_by TEXT NOT NULL DEFAULT 'automation',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_contact ON acq_funnel_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON acq_funnel_events(created_at);

-- Add pipeline_stage column to crm_contacts if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_contacts' AND column_name = 'pipeline_stage'
    ) THEN
        ALTER TABLE crm_contacts ADD COLUMN pipeline_stage TEXT NOT NULL DEFAULT 'new';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_contacts' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE crm_contacts ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_contacts' AND column_name = 'icp_score'
    ) THEN
        ALTER TABLE crm_contacts ADD COLUMN icp_score NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_contacts' AND column_name = 'niche_id'
    ) THEN
        ALTER TABLE crm_contacts ADD COLUMN niche_id TEXT;
    END IF;
END $$;
