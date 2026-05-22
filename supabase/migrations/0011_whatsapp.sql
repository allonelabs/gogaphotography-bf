-- 0011_whatsapp.sql
--
-- WhatsApp Business API integration tables.
--
-- Three new tables, all org-scoped (RLS + app-layer filter, same pattern as
-- 0006 / 0008 / 0010):
--
--   1. org_integration — generic per-org integration credentials bucket
--      (kind = 'whatsapp' for now; future kinds slot in alongside).
--   2. whatsapp_thread — one row per contact phone, per organization.
--   3. whatsapp_message — every inbound + outbound message, with provider id
--      and status tracking.
--
-- Adds two RBAC permissions (`whatsapp.read`, `whatsapp.send`) and grants
-- them to admin/manager/operator by default.
--
-- The outbox (table from 0008) drains `whatsapp.send` events via the
-- handler in `app/lib/whatsapp/handler.ts`. Same dura-async pattern as
-- email.send.

set check_function_bodies = false;

-- ============================================================================
-- 1. org_integration — per-org credentials bucket (generic; WhatsApp first)
-- ============================================================================
-- Why generic? Future integrations (Telegram, Stripe Connect per-org,
-- intercom, …) can land here without another table. The `config` jsonb
-- carries kind-specific fields:
--   whatsapp:
--     phone_number_id        — Meta's id for the sender number
--     access_token           — long-lived system-user token
--     business_account_id    — WABA id (for template lookups, billing)
--     phone_display          — pretty E.164 for UI ("+995 555 123 456")
--     webhook_verify_token   — operator-chosen string for the GET handshake
--     webhook_app_secret     — Meta App Secret, used to verify X-Hub-Sig-256

create table if not exists org_integration (
  id bigserial primary key,
  organization_id bigint not null references organization(id) on delete cascade,
  kind text not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, kind)
);

create index if not exists org_integration_kind_idx
  on org_integration (kind);

-- Index on phone_number_id (webhook lookup hot-path) — partial, only for
-- whatsapp integrations that have a number set.
create index if not exists org_integration_whatsapp_pnid_idx
  on org_integration ((config->>'phone_number_id'))
  where kind = 'whatsapp';

-- ============================================================================
-- 2. whatsapp_thread — one row per (org, contact_phone)
-- ============================================================================

create table if not exists whatsapp_thread (
  id bigserial primary key,
  organization_id bigint not null references organization(id) on delete cascade,
  contact_phone text not null,
  contact_name text,
  matched_entity text,    -- 'hotel_contact' | 'order_client' | null
  matched_entity_id bigint,
  unread_count int default 0,
  last_message_at timestamptz default now(),
  last_message_preview text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, contact_phone)
);

create index if not exists whatsapp_thread_org_idx
  on whatsapp_thread (organization_id, last_message_at desc);
create index if not exists whatsapp_thread_phone_idx
  on whatsapp_thread (contact_phone);

-- ============================================================================
-- 3. whatsapp_message — every message in/out
-- ============================================================================

create table if not exists whatsapp_message (
  id bigserial primary key,
  organization_id bigint not null references organization(id) on delete cascade,
  thread_id bigint not null references whatsapp_thread(id) on delete cascade,
  wa_message_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text,
  media_url text,
  media_mime text,
  status text not null default 'queued',
  status_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_message_status_chk'
  ) then
    alter table whatsapp_message add constraint whatsapp_message_status_chk
      check (status in ('queued', 'sent', 'delivered', 'read', 'failed'));
  end if;
end$$;

create index if not exists whatsapp_message_thread_idx
  on whatsapp_message (thread_id, created_at desc);
create index if not exists whatsapp_message_wa_id_idx
  on whatsapp_message (wa_message_id)
  where wa_message_id is not null;
create index if not exists whatsapp_message_org_idx
  on whatsapp_message (organization_id, created_at desc);

-- ============================================================================
-- RLS — same org_isolation pattern as 0006 / 0010
-- ============================================================================

alter table org_integration   enable row level security;
alter table whatsapp_thread   enable row level security;
alter table whatsapp_message  enable row level security;

drop policy if exists org_integration_isolation on org_integration;
create policy org_integration_isolation on org_integration
  for all
  using (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint)
  with check (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint);

drop policy if exists whatsapp_thread_isolation on whatsapp_thread;
create policy whatsapp_thread_isolation on whatsapp_thread
  for all
  using (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint)
  with check (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint);

drop policy if exists whatsapp_message_isolation on whatsapp_message;
create policy whatsapp_message_isolation on whatsapp_message
  for all
  using (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint)
  with check (organization_id = nullif(current_setting('app.current_org_id', true), '')::bigint);

-- ============================================================================
-- updated_at triggers (reuse set_updated_at from 0001)
-- ============================================================================

drop trigger if exists org_integration_set_updated_at on org_integration;
create trigger org_integration_set_updated_at
  before update on org_integration
  for each row execute function set_updated_at();

drop trigger if exists whatsapp_thread_set_updated_at on whatsapp_thread;
create trigger whatsapp_thread_set_updated_at
  before update on whatsapp_thread
  for each row execute function set_updated_at();

-- ============================================================================
-- Audit triggers — user-facing tables only.
-- org_integration is excluded: tokens churn there and would spam audit_log
-- with secret-bearing payloads. whatsapp_thread + whatsapp_message ARE
-- user-facing comms data, so they get audited like p_order.
-- ============================================================================

drop trigger if exists whatsapp_thread_audit on whatsapp_thread;
create trigger whatsapp_thread_audit
  after insert or update or delete on whatsapp_thread
  for each row execute function audit_trigger();

drop trigger if exists whatsapp_message_audit on whatsapp_message;
create trigger whatsapp_message_audit
  after insert or update or delete on whatsapp_message
  for each row execute function audit_trigger();

-- ============================================================================
-- RBAC — whatsapp.read + whatsapp.send permissions
-- ============================================================================

insert into permission (code, description) values
  ('whatsapp.read', 'Read WhatsApp threads and messages'),
  ('whatsapp.send', 'Send WhatsApp messages')
on conflict (code) do nothing;

insert into role_permission (role_id, permission_id)
select r.id, p.id
  from role r, permission p
  where r.name in ('admin', 'manager', 'operator')
    and p.code in ('whatsapp.read', 'whatsapp.send')
on conflict do nothing;

notify pgrst, 'reload schema';
