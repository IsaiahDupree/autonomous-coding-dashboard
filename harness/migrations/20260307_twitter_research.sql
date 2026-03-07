-- Twitter Research Reports table
-- Stores daily research report records from the twitter-research-agent

CREATE TABLE IF NOT EXISTS twitter_research_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  topics text[] not null,
  raw_batch_path text,
  synthesis jsonb,
  telegram_sent boolean default false,
  obsidian_path text,
  tweet_count int,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS twitter_research_reports_report_date_idx
  ON twitter_research_reports(report_date desc);
