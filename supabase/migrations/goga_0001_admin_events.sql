-- Admin audit log for the photographer studio.
--
-- Records every consequential admin action: row changes, contract sends,
-- delivery uploads, payment links, archive/delete. Append-only.
--
-- entity_type+entity_id let the UI filter by what changed; payload is a
-- free JSONB blob the producer fills with whatever's useful (e.g. before
-- → after stage on a lead). actor is the operator's email (today: only
-- the single shared GOGA admin login, but storing it future-proofs).

create table if not exists admin_events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  entity_type text,
  entity_id   text,
  payload     jsonb not null default '{}'::jsonb,
  actor       text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_events_created_at_idx
  on admin_events (created_at desc);

create index if not exists admin_events_entity_idx
  on admin_events (entity_type, entity_id, created_at desc);

create index if not exists admin_events_kind_idx
  on admin_events (kind, created_at desc);

-- Single-tenant admin: no RLS needed beyond "service-role only". Default
-- Supabase posture (RLS off, public role denied via PostgREST schema
-- cache) is sufficient since nothing under /api/** exposes this table
-- to anon/auth roles.
alter table admin_events enable row level security;
revoke all on admin_events from anon, authenticated;
