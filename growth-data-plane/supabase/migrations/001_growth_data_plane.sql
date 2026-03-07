-- Growth Data Plane: Core Schema
-- All tables prefixed with gdp_ to avoid collisions

-- 1. Person: canonical person (leads + users)
CREATE TABLE IF NOT EXISTS gdp_person (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  source TEXT, -- signup, newsletter, outbound, stripe, manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_person_email ON gdp_person(email);

-- 2. Identity Link: maps external IDs to person
CREATE TABLE IF NOT EXISTS gdp_identity_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES gdp_person(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- posthog, stripe, meta_fbp, meta_fbc, resend
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, external_id)
);
CREATE INDEX IF NOT EXISTS idx_gdp_identity_link_person ON gdp_identity_link(person_id);
CREATE INDEX IF NOT EXISTS idx_gdp_identity_link_lookup ON gdp_identity_link(provider, external_id);

-- 3. Unified Event: normalized events from all sources
CREATE TABLE IF NOT EXISTS gdp_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES gdp_person(id) ON DELETE SET NULL,
  source TEXT NOT NULL, -- resend, stripe, posthog, click_tracker, meta, manual
  event_type TEXT NOT NULL, -- email.delivered, email.opened, email.clicked, checkout.completed, page_view, etc.
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_event_person ON gdp_event(person_id);
CREATE INDEX IF NOT EXISTS idx_gdp_event_type ON gdp_event(event_type);
CREATE INDEX IF NOT EXISTS idx_gdp_event_timestamp ON gdp_event(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gdp_event_source ON gdp_event(source);

-- 4. Email Message: emails sent via Resend
CREATE TABLE IF NOT EXISTS gdp_email_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT UNIQUE,
  person_id UUID REFERENCES gdp_person(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  campaign_id TEXT,
  funnel TEXT,
  tags JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_email_message_resend ON gdp_email_message(resend_id);
CREATE INDEX IF NOT EXISTS idx_gdp_email_message_person ON gdp_email_message(person_id);

-- 5. Email Event: Resend webhook events
CREATE TABLE IF NOT EXISTS gdp_email_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT NOT NULL,
  person_id UUID REFERENCES gdp_person(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- delivered, opened, clicked, bounced, complained
  payload JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_email_event_resend ON gdp_email_event(resend_id);
CREATE INDEX IF NOT EXISTS idx_gdp_email_event_person ON gdp_email_event(person_id);

-- 6. Subscription: Stripe billing snapshot
CREATE TABLE IF NOT EXISTS gdp_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES gdp_person(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL, -- active, past_due, canceled, trialing, incomplete
  plan_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_subscription_person ON gdp_subscription(person_id);
CREATE INDEX IF NOT EXISTS idx_gdp_subscription_stripe ON gdp_subscription(stripe_customer_id);

-- 7. Deal: outbound pipeline stages
CREATE TABLE IF NOT EXISTS gdp_deal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES gdp_person(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'lead', -- lead, contacted, replied, booked, proposal, negotiation, won, lost
  source TEXT, -- linkedin, twitter, email, upwork, referral
  value_cents INTEGER DEFAULT 0,
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_deal_person ON gdp_deal(person_id);
CREATE INDEX IF NOT EXISTS idx_gdp_deal_stage ON gdp_deal(stage);

-- 8. Person Features: computed features for segmentation
CREATE TABLE IF NOT EXISTS gdp_person_features (
  person_id UUID PRIMARY KEY REFERENCES gdp_person(id) ON DELETE CASCADE,
  email_opens_30d INTEGER DEFAULT 0,
  email_clicks_30d INTEGER DEFAULT 0,
  page_views_7d INTEGER DEFAULT 0,
  last_email_open TIMESTAMPTZ,
  last_email_click TIMESTAMPTZ,
  last_page_view TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  signup_date TIMESTAMPTZ,
  activation_date TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_plan TEXT,
  total_sessions_7d INTEGER DEFAULT 0,
  pricing_page_views_7d INTEGER DEFAULT 0,
  checkout_started BOOLEAN DEFAULT false,
  has_bounced BOOLEAN DEFAULT false,
  has_complained BOOLEAN DEFAULT false,
  deal_stage TEXT,
  last_outbound_reply TIMESTAMPTZ,
  outbound_reply_sentiment TEXT, -- positive, negative, neutral
  offer_page_views INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Segment: segment definitions
CREATE TABLE IF NOT EXISTS gdp_segment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  funnel TEXT NOT NULL, -- newsletter, outbound
  query_sql TEXT, -- SQL condition for membership
  priority INTEGER DEFAULT 0,
  automation_type TEXT, -- email, meta_capi, outbound, suppress
  automation_config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdp_segment_funnel ON gdp_segment(funnel);
CREATE INDEX IF NOT EXISTS idx_gdp_segment_slug ON gdp_segment(slug);

-- 10. Segment Member: person <-> segment memberships
CREATE TABLE IF NOT EXISTS gdp_segment_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES gdp_person(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES gdp_segment(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  automation_fired BOOLEAN DEFAULT false,
  automation_fired_at TIMESTAMPTZ,
  UNIQUE(person_id, segment_id)
);
CREATE INDEX IF NOT EXISTS idx_gdp_segment_member_person ON gdp_segment_member(person_id);
CREATE INDEX IF NOT EXISTS idx_gdp_segment_member_segment ON gdp_segment_member(segment_id);
CREATE INDEX IF NOT EXISTS idx_gdp_segment_member_active ON gdp_segment_member(segment_id) WHERE exited_at IS NULL;

-- Enable RLS (service role bypasses, but good practice)
ALTER TABLE gdp_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_identity_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_email_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_email_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_person_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_segment ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdp_segment_member ENABLE ROW LEVEL SECURITY;
