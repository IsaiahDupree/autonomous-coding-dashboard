-- shared_users: cross-product user profiles
-- FK to existing users table (or auth.users in Supabase-hosted)
CREATE TABLE IF NOT EXISTS shared_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL, -- FK to auth.users
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  stripe_customer_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_shared_users_email ON shared_users(email);
CREATE INDEX idx_shared_users_stripe ON shared_users(stripe_customer_id);
