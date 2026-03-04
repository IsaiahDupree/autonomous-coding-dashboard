create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.dm_contacts(id),
  platform text not null,
  platform_username text not null,
  message_text text,
  message_type text default 'text',
  is_outbound boolean default true,
  sent_by_automation boolean default true,
  ai_generated boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
