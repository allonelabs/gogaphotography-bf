-- goga_0006_pinterest.sql — Pinterest settings (singleton) + pin queue.

create table if not exists pinterest_settings (
  id int primary key default 1 check (id = 1),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_account text,
  default_board_id text,
  board_map jsonb not null default '{}'::jsonb,
  pins_per_run int not null default 1,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into pinterest_settings (id) values (1) on conflict (id) do nothing;

create table if not exists pinterest_pins (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('blog','product','project')),
  content_id uuid not null,
  board_id text,
  status text not null default 'queued' check (status in ('queued','posted','failed','skipped')),
  scheduled_for timestamptz not null default now(),
  attempts int not null default 0,
  pin_id text,
  error text,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (content_type, content_id)
);

create index if not exists idx_pinterest_pins_due on pinterest_pins(status, scheduled_for);

alter table pinterest_settings enable row level security;
alter table pinterest_pins enable row level security;
-- No public policies: service-role only (admin + cron).
