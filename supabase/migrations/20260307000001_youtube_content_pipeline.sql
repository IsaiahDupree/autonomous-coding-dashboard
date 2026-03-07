-- YouTube Content Pipeline tables
-- Tracks which videos need processing and stores all generated content.

CREATE TABLE IF NOT EXISTS yt_content_queue (
  id              TEXT PRIMARY KEY,
  playlist_id     TEXT,
  title           TEXT,
  channel         TEXT,
  url             TEXT,
  status          TEXT DEFAULT 'pending',  -- pending, processing, done, error
  error_msg       TEXT,
  queued_at       TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS yt_content_queue_status_idx ON yt_content_queue (status);
CREATE INDEX IF NOT EXISTS yt_content_queue_queued_at_idx ON yt_content_queue (queued_at);

CREATE TABLE IF NOT EXISTS yt_content_packages (
  video_id            TEXT PRIMARY KEY,
  playlist_id         TEXT,
  title               TEXT,
  channel             TEXT,
  url                 TEXT,

  -- Raw data
  transcript_text     TEXT,
  transcript_raw      JSONB,

  -- Structured extracts
  insights            TEXT,
  learning_lessons    TEXT,
  key_takeaways       TEXT,
  resources           JSONB,      -- [{name, url, type}]
  claude_skill        TEXT,
  voice_track         TEXT,

  -- Content package
  medium_post_html    TEXT,
  newsletter_text     TEXT,
  community_post      TEXT,
  tweet_thread        TEXT,
  pinterest_caption   TEXT,

  -- Attachments (markdown)
  attachment_summary  TEXT,
  attachment_lessons  TEXT,
  attachment_resources TEXT,

  -- Publish results
  medium_post_id      TEXT,
  medium_post_url     TEXT,
  image_url           TEXT,
  newsletter_queued   BOOLEAN DEFAULT FALSE,
  community_posted    BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  published_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS yt_content_packages_playlist_idx ON yt_content_packages (playlist_id);
CREATE INDEX IF NOT EXISTS yt_content_packages_published_idx ON yt_content_packages (published_at);
