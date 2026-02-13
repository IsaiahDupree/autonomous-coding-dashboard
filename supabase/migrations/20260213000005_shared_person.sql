-- shared.person: cross-product lead/contact data for Meta CAPI integration
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE IF NOT EXISTS shared.person (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255),
  email_hash VARCHAR(64), -- SHA256 for Meta CAPI
  phone VARCHAR(50),
  phone_hash VARCHAR(64),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(100),
  zip VARCHAR(20),
  country VARCHAR(10),
  date_of_birth DATE,
  gender VARCHAR(10),
  -- Meta-specific fields
  fbp VARCHAR(255), -- _fbp cookie
  fbc VARCHAR(255), -- _fbc click ID
  external_id VARCHAR(255), -- your system's ID
  -- UTM tracking
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  -- Source tracking
  source_product VARCHAR(50),
  source_form_id VARCHAR(255),
  lead_status VARCHAR(50) DEFAULT 'new',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared.identity_link (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES shared.person(id) ON DELETE CASCADE,
  system VARCHAR(50) NOT NULL, -- 'supabase', 'stripe', 'meta', 'tiktok', 'waitlistlab'
  external_id VARCHAR(500) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(system, external_id)
);

CREATE INDEX idx_person_email ON shared.person(email);
CREATE INDEX idx_person_email_hash ON shared.person(email_hash);
CREATE INDEX idx_person_phone ON shared.person(phone);
CREATE INDEX idx_person_fbp ON shared.person(fbp);
CREATE INDEX idx_person_source ON shared.person(source_product);
CREATE INDEX idx_identity_person ON shared.identity_link(person_id);
CREATE INDEX idx_identity_system ON shared.identity_link(system, external_id);
