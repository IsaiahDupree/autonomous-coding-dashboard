create table if not exists public.dm_contacts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  platform_username text not null,
  pipeline_stage text not null default 'first_touch',
  first_touch_at timestamptz default now(),
  last_message_at timestamptz,
  total_messages_sent int not null default 0,
  total_messages_received int not null default 0,
  relationship_score int default 0,
  created_at timestamptz default now(),
  unique(platform, platform_username)
);
