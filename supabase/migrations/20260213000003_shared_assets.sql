-- shared_assets: cross-product asset storage tracking
CREATE TYPE asset_type AS ENUM ('image', 'video', 'audio', 'document', 'template', 'font', 'other');
CREATE TYPE asset_source AS ENUM ('upload', 'nano_banana', 'dall_e', 'veo', 'ltx_video', 'remotion_render', 'voice_clone', 'sfx', 'screenshot', 'import');
CREATE TABLE IF NOT EXISTS shared_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES shared_users(id) ON DELETE SET NULL,
  type asset_type NOT NULL,
  source asset_source NOT NULL DEFAULT 'upload',
  filename VARCHAR(500),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  url VARCHAR(2000) NOT NULL,
  cdn_url VARCHAR(2000),
  thumbnail_url VARCHAR(2000),
  content_hash VARCHAR(64), -- SHA256 for deduplication
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER, -- for video/audio
  metadata JSONB DEFAULT '{}', -- flexible metadata
  tags TEXT[] DEFAULT '{}',
  source_product VARCHAR(50), -- which product created it
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_assets_user ON shared_assets(user_id);
CREATE INDEX idx_assets_type ON shared_assets(type);
CREATE INDEX idx_assets_source ON shared_assets(source);
CREATE INDEX idx_assets_hash ON shared_assets(content_hash);
CREATE INDEX idx_assets_tags ON shared_assets USING GIN(tags);
CREATE INDEX idx_assets_product ON shared_assets(source_product);
