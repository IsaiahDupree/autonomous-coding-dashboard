-- Migration: content_publish_log
-- Tracks all content generated from research synthesis and published across platforms

CREATE TABLE IF NOT EXISTS content_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_date date NOT NULL,
  content_type text NOT NULL, -- 'tweet', 'linkedin_post', 'instagram_caption', 'medium_article'
  platform text NOT NULL,
  content_text text,
  topic text,
  blotato_post_id text,
  mplite_queue_id text,
  medium_url text,
  status text DEFAULT 'queued', -- queued, published, failed
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_publish_log_date ON content_publish_log(research_date DESC);
