-- Migration: sora_creator_prompts
-- Stores prompts scraped from popular Sora creators' profile pages.
-- Used to discover high-performing prompt patterns for recreation.

CREATE TABLE IF NOT EXISTS sora_creator_prompts (
  id               TEXT PRIMARY KEY,          -- post ID from /p/s_{id}
  username         TEXT NOT NULL,             -- sora.chatgpt.com/profile/{username}
  prompt           TEXT NOT NULL,             -- scraped from post page title
  post_href        TEXT NOT NULL,             -- e.g. /p/s_69a864...
  views            INTEGER,
  likes            INTEGER,
  comments         INTEGER,
  video_url        TEXT,                      -- blob URL if captured
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recreated        BOOLEAN NOT NULL DEFAULT FALSE,
  recreated_at     TIMESTAMPTZ,
  recreation_video_id TEXT                   -- links to sora_mcp state video ID
);

CREATE INDEX IF NOT EXISTS idx_scp_username    ON sora_creator_prompts (username);
CREATE INDEX IF NOT EXISTS idx_scp_views       ON sora_creator_prompts (views DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_scp_recreated   ON sora_creator_prompts (recreated);
CREATE INDEX IF NOT EXISTS idx_scp_scraped_at  ON sora_creator_prompts (scraped_at DESC);
