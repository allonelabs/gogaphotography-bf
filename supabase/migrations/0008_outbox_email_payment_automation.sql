-- 0008_outbox_email_payment_automation.sql
--
-- Lifts four production-grade infrastructure modules from Business Forge
-- into travelplace-bf, adapted to our single-org-per-row tenancy model:
--
--   1. outbox_event   — durable async delivery (FOR UPDATE SKIP LOCKED)
--   2. email_log      — Resend delivery tracking (linked to outbox)
--   3. payment_intent — Stripe checkout / charge state
--   4. automation_rule — declarative trigger→action rules
--   5. adapter_cost   — per-org cost meter (ADR-038 in BF)
--
-- All five carry `organization_id BIGINT NOT NULL REFERENCES organization(id)`
-- and the same `org_isolation` RLS policy pattern used in 0006. The audit
-- trigger from 0006 is wired only on the user-facing tables
-- (`automation_rule`); infra tables (outbox / email_log / payment_intent /
-- adapter_cost) are excluded so they don't flood audit_log with internal
-- state churn.

set check_function_bodies = false;

-- ============================================================================
-- 1. outbox_event — durable async event delivery
-- ============================================================================

create table if not exists outbox_event (
  id bigserial primary key,
  organization_id bigint not null references organization(id),
  kind text not null,
  payload jsonb not null,
  idempotency_key text,
  status text not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz default now(),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Status whitelist
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'outbox_event_status_chk'
  ) then
    alter table outbox_event add constraint outbox_event_status_chk
      check (status in ('pending', 'processing', 'sent', 'failed', 'dead'));
  end if;
end$$;

-- Idempotency: same key within an org collapses to one row.
create unique index if not exists outbox_event_idempotency_idx
  on outbox_event (organization_id, idempotency_key)
  where idempotency_key is not null;

-- Hot path: the drain query.
create index if not exists outbox_event_pending_idx
  on outbox_event (next_attempt_at)
  where status = 'pending';

-- Per-org listing.
create index if not exists outbox_event_org_idx
  on outbox_event (organization_id, created_at desc);

-- ============================================================================
-- 2. email_log — Resend delivery tracking
-- ============================================================================

create table if not exists email_log (
  id bigserial primary key,
  outbox_event_id bigint references outbox_event(id) on delete set null,
  organization_id bigint not null references organization(id),
  to_email text not null,
  from_email text,
  subject text not null,
  status text not null default 'queued',
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists email_log_org_idx
  on email_log (organization_id, created_at desc);

create index if not exists email_log_provider_idx
  on email_log (provider_id)
  where provider_id is not null;

-- ============================================================================
-- 3. payment_intent — Stripe checkout / payment state
-- ============================================================================

create table if not exists payment_intent (
  id bigserial primary key,
  organization_id bigint not null references organization(id),
  p_order_id bigint references p_order(id) on delete set null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  description text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists payment_intent_session_idx
  on payment_intent (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists payment_intent_org_idx
  on payment_intent (organization_id, created_at desc);

create index if not exists payment_intent_order_idx
  on payment_intent (p_order_id)
  where p_order_id is not null;

-- ============================================================================
-- 4. automation_rule — declarative trigger→action rules
-- ============================================================================

create table if not exists automation_rule (
  id bigserial primary key,
  organization_id bigint not null references organization(id),
  name text not null,
  description text,
  trigger_event text not null,
  conditions jsonb,
  actions jsonb not null,
  enabled boolean default true,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists automation_rule_event_idx
  on automation_rule (organization_id, trigger_event) where enabled;

-- ============================================================================
-- 5. adapter_cost — per-org cost meter (ADR-038)
-- ============================================================================

create table if not exists adapter_cost (
  id bigserial primary key,
  organization_id bigint not null references organization(id),
  adapter text not null,
  usd numeric(12, 6) not null default 0,
  units int not null default 1,
  fingerprint text,
  outbox_event_id bigint references outbox_event(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists adapter_cost_org_idx
  on adapter_cost (organization_id, created_at desc);

create index if not exists adapter_cost_adapter_idx
  on adapter_cost (organization_id, adapter, created_at desc);

-- ============================================================================
-- RLS — org_isolation on all five tables (defense in depth)
-- ============================================================================

do $$
declare
  t text;
  infra_tables text[] := array[
    'outbox_event', 'email_log', 'payment_intent',
    'automation_rule', 'adapter_cost'
  ];
  policy_name text;
begin
  foreach t in array infra_tables loop
    execute format('alter table %I enable row level security', t);
    policy_name := t || '_org_isolation';
    execute format('drop policy if exists %I on %I', policy_name, t);
    execute format(
      'create policy %I on %I for all '
      || 'using (organization_id = nullif(current_setting(''app.current_org_id'', true), '''')::bigint) '
      || 'with check (organization_id = nullif(current_setting(''app.current_org_id'', true), '''')::bigint)',
      policy_name, t
    );
  end loop;
end$$;

-- ============================================================================
-- Audit trigger — only on user-facing tables (automation_rule).
-- Infra tables (outbox/email_log/payment_intent/adapter_cost) write very
-- frequently and would drown audit_log; their state is observable via the
-- table itself.
-- ============================================================================

drop trigger if exists automation_rule_audit on automation_rule;
create trigger automation_rule_audit
  after insert or update or delete on automation_rule
  for each row execute function audit_trigger();

-- ============================================================================
-- updated_at touch trigger for the tables that carry it
-- ============================================================================

create or replace function _touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists outbox_event_touch on outbox_event;
create trigger outbox_event_touch before update on outbox_event
  for each row execute function _touch_updated_at();

drop trigger if exists payment_intent_touch on payment_intent;
create trigger payment_intent_touch before update on payment_intent
  for each row execute function _touch_updated_at();

drop trigger if exists automation_rule_touch on automation_rule;
create trigger automation_rule_touch before update on automation_rule
  for each row execute function _touch_updated_at();

-- ============================================================================
-- claim_outbox_events(p_limit) — atomic FOR UPDATE SKIP LOCKED claim.
-- Marks the claimed rows as 'processing' in the same transaction so other
-- drain workers don't see them. The drain handler then updates each row
-- to 'sent' / 'pending' (retry) / 'dead' based on the outcome.
-- ============================================================================

create or replace function claim_outbox_events(p_limit int default 50)
returns table (
  id bigint,
  organization_id bigint,
  kind text,
  payload jsonb,
  attempts int,
  status text
)
language plpgsql
security definer
as $$
begin
  return query
  with claimed as (
    select e.id
    from outbox_event e
    where e.status = 'pending'
      and e.next_attempt_at <= now()
    order by e.next_attempt_at
    for update skip locked
    limit p_limit
  )
  update outbox_event o
  set status = 'processing', updated_at = now()
  from claimed
  where o.id = claimed.id
  returning o.id, o.organization_id, o.kind, o.payload, o.attempts, o.status;
end$$;

grant execute on function claim_outbox_events(int) to anon, authenticated, service_role;

-- ============================================================================
-- Seed: one demo automation for travelplace-ge
-- "When order.created, send booking-received email to client"
-- ============================================================================

do $$
declare
  tp_id bigint;
begin
  select id into tp_id from organization where slug = 'travelplace-ge';
  if tp_id is null then return; end if;

  insert into automation_rule (
    organization_id, name, description, trigger_event,
    conditions, actions, enabled, created_by
  )
  select
    tp_id,
    'Booking received — client confirmation',
    'When a new order is created, send a confirmation email to the client.',
    'order.created',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'send_email',
        'to',   '{{order.client_phone}}',
        'to_field', 'client_email',
        'subject', 'Booking received',
        'body', 'Hello {{order.client_first_name}}, we have received your booking #{{order.id}}. We will be in touch shortly with payment details.'
      )
    ),
    true,
    'system-seed'
  where not exists (
    select 1 from automation_rule
    where organization_id = tp_id
      and trigger_event = 'order.created'
      and name = 'Booking received — client confirmation'
  );
end$$;
