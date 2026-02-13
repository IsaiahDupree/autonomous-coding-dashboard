-- shared_entitlements: product access/plans per user
CREATE TYPE entitlement_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'expired');
CREATE TABLE IF NOT EXISTS shared_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared_users(id) ON DELETE CASCADE,
  product VARCHAR(50) NOT NULL, -- 'portal28', 'remotion', 'waitlistlab', etc.
  plan VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
  status entitlement_status DEFAULT 'active',
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSONB DEFAULT '{}', -- feature flags per entitlement
  usage_limits JSONB DEFAULT '{}', -- {api_calls: 1000, renders: 50, storage_gb: 5}
  current_usage JSONB DEFAULT '{}', -- tracks current period usage
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product)
);
CREATE INDEX idx_entitlements_user ON shared_entitlements(user_id);
CREATE INDEX idx_entitlements_product ON shared_entitlements(product);
CREATE INDEX idx_entitlements_status ON shared_entitlements(status);
CREATE INDEX idx_entitlements_stripe ON shared_entitlements(stripe_subscription_id);
