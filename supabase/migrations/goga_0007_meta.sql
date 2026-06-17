-- goga_0007_meta.sql — Meta (Messenger + Instagram) chatbot: settings, threads, messages.

create table if not exists meta_settings (
  id int primary key default 1 check (id = 1),
  page_id text,
  page_access_token text,
  verify_token text,
  app_secret text,
  ig_user_id text,
  bot_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into meta_settings (id) values (1) on conflict (id) do nothing;

create table if not exists meta_threads (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('messenger','instagram')),
  external_id text not null,
  display_name text,
  last_message_at timestamptz,
  unread int not null default 0,
  handoff boolean not null default false,
  created_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table if not exists meta_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references meta_threads(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  sender text not null check (sender in ('user','bot','agent')),
  text text not null default '',
  meta_message_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_meta_messages_thread on meta_messages(thread_id, created_at);

alter table meta_settings enable row level security;
alter table meta_threads enable row level security;
alter table meta_messages enable row level security;
-- service-role only; no public policies.
