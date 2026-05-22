-- 0006_multi_tenancy.sql
-- Multi-tenant isolation: organization + organization_membership tables,
-- organization_id FK on every data table, RLS policies, helper RPC.
--
-- Catalogs (cc1_country / cc1_region / cc1_city / c_*_group / c_juridical_form
-- / c_admin_position / setting / role / permission / role_permission /
-- audit_log / administration / hotel_balance_computed) stay shared across
-- orgs — they're either pure reference data or cross-tenant infra.
--
-- Existing legacy rows are backfilled to the 'travelplace-ge' org because
-- this entire dataset (397 hotels, 1554 orders, 3226 tourists) is the
-- travelplace.ge legacy migration.

set check_function_bodies = false;

-- ============================================================================
-- organization — root tenant table
-- ============================================================================

create table if not exists organization (
  id bigserial primary key,
  slug text unique not null,
  name text not null,
  domain text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists organization_domain_idx on organization (lower(domain)) where domain is not null;

-- Seed the two known orgs
insert into organization (slug, name, domain) values
  ('travelplace-ge', 'Travelplace', 'travelplace.ge'),
  ('allone-labs',   'AllOne Labs',   'allonelabs.com')
on conflict (slug) do nothing;

-- ============================================================================
-- organization_membership — links a user email to an org with a role
-- ============================================================================

create table if not exists organization_membership (
  id bigserial primary key,
  organization_id bigint not null references organization(id) on delete cascade,
  user_email text not null,
  role_id bigint references role(id),
  joined_at timestamptz default now(),
  unique (organization_id, user_email)
);

create index if not exists organization_membership_email_idx on organization_membership (lower(user_email));

-- ============================================================================
-- set_current_org() RPC — used by the app to set the GUC for RLS
-- ============================================================================

create or replace function set_current_org(org_id bigint) returns void
language sql security definer
as $$ select set_config('app.current_org_id', org_id::text, false) $$;

grant execute on function set_current_org(bigint) to anon, authenticated, service_role;

-- ============================================================================
-- Add organization_id column + backfill + NOT NULL + index, per data table.
-- ============================================================================

-- Disable session replication during backfill so the existing audit_trigger
-- (which has a pre-existing set-returning-bug on the diff branch) doesn't
-- fire on the bulk UPDATEs below. Restored at the end.
set session_replication_role = replica;

do $$
declare
  t text;
  tp_id bigint;
  data_tables text[] := array[
    -- hotels
    'hotel', 'hotel_contact', 'hotel_bank_account', 'hotel_balance',
    'hotel_price_list', 'hotel_price_grid',
    -- avia
    'avia', 'avia_contact', 'avia_bank_account', 'avia_balance',
    -- transfer
    'transfer', 'transfer_contact', 'transfer_bank_account', 'transfer_balance',
    -- consul / visa
    'consul', 'consul_contact', 'consul_bank_account', 'consul_balance',
    -- ensure / insurance
    'ensure', 'ensure_contact', 'ensure_bank_account', 'ensure_balance',
    -- excursion
    'excursion', 'excursion_contact', 'excursion_bank_account', 'excursion_balance',
    -- single-row entity verticals
    'guide', 'transport',
    -- orders
    'p_order', 'p_order_tourist', 'p_order_hotel', 'p_order_avia',
    'p_order_transfer', 'p_order_excursion', 'p_order_ensure',
    'p_order_visa', 'p_order_service',
    -- refunds
    'p_refund', 'p_refund_tourist', 'p_refund_hotel', 'p_refund_avia',
    'p_refund_transfer', 'p_refund_excursion', 'p_refund_ensure',
    'p_refund_visa', 'p_refund_service'
  ];
begin
  select id into tp_id from organization where slug = 'travelplace-ge';
  if tp_id is null then
    raise exception 'travelplace-ge org seed missing';
  end if;

  foreach t in array data_tables loop
    -- Add column if not exists
    execute format(
      'alter table %I add column if not exists organization_id bigint references organization(id)',
      t
    );
    -- Backfill existing rows
    execute format(
      'update %I set organization_id = %L where organization_id is null',
      t, tp_id
    );
    -- Make NOT NULL
    execute format(
      'alter table %I alter column organization_id set not null',
      t
    );
    -- Index for org-scoped queries
    execute format(
      'create index if not exists %I on %I (organization_id)',
      t || '_organization_id_idx', t
    );
  end loop;
end$$;

set session_replication_role = origin;

-- ============================================================================
-- Fix the pre-existing audit_trigger() — `or (jsonb_object_keys(diff_j))::text = ...`
-- was set-returning and crashed any UPDATE inside a SECURITY DEFINER context.
-- The pre-existing intent: skip noop updates that only touched updated_at.
-- ============================================================================

create or replace function audit_trigger() returns trigger
language plpgsql
as $$
declare
  actor text := nullif(current_setting('audit.actor_email', true), '');
  before_j jsonb;
  after_j jsonb;
  diff_j jsonb;
  pk text;
  k text;
begin
  if TG_OP = 'INSERT' then
    after_j := to_jsonb(NEW);
    pk := coalesce(after_j->>'id', '');
    insert into audit_log(actor_email, action, table_name, row_id, before, after, diff)
    values(actor, 'insert', TG_TABLE_NAME, pk, null, after_j, null);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    before_j := to_jsonb(OLD);
    after_j := to_jsonb(NEW);
    pk := coalesce(after_j->>'id', '');
    -- shallow diff: keys whose value changed
    diff_j := '{}'::jsonb;
    for k in select jsonb_object_keys(after_j) loop
      if (before_j->k) is distinct from (after_j->k) then
        diff_j := diff_j || jsonb_build_object(k, jsonb_build_object('before', before_j->k, 'after', after_j->k));
      end if;
    end loop;
    -- skip noop updates (empty diff, or only updated_at changed)
    if (diff_j - 'updated_at') = '{}'::jsonb then
      return NEW;
    end if;
    insert into audit_log(actor_email, action, table_name, row_id, before, after, diff)
    values(actor, 'update', TG_TABLE_NAME, pk, before_j, after_j, diff_j);
    return NEW;
  elsif TG_OP = 'DELETE' then
    before_j := to_jsonb(OLD);
    pk := coalesce(before_j->>'id', '');
    insert into audit_log(actor_email, action, table_name, row_id, before, after, diff)
    values(actor, 'delete', TG_TABLE_NAME, pk, before_j, null, null);
    return OLD;
  end if;
  return null;
end$$;

-- ============================================================================
-- RLS — enable + per-table org_isolation policy (defense in depth).
-- The service-role key bypasses RLS, so the app filter is the real guard.
-- These policies kick in if we ever switch to anon/authenticated roles.
-- ============================================================================

do $$
declare
  t text;
  data_tables text[] := array[
    'hotel', 'hotel_contact', 'hotel_bank_account', 'hotel_balance',
    'hotel_price_list', 'hotel_price_grid',
    'avia', 'avia_contact', 'avia_bank_account', 'avia_balance',
    'transfer', 'transfer_contact', 'transfer_bank_account', 'transfer_balance',
    'consul', 'consul_contact', 'consul_bank_account', 'consul_balance',
    'ensure', 'ensure_contact', 'ensure_bank_account', 'ensure_balance',
    'excursion', 'excursion_contact', 'excursion_bank_account', 'excursion_balance',
    'guide', 'transport',
    'p_order', 'p_order_tourist', 'p_order_hotel', 'p_order_avia',
    'p_order_transfer', 'p_order_excursion', 'p_order_ensure',
    'p_order_visa', 'p_order_service',
    'p_refund', 'p_refund_tourist', 'p_refund_hotel', 'p_refund_avia',
    'p_refund_transfer', 'p_refund_excursion', 'p_refund_ensure',
    'p_refund_visa', 'p_refund_service'
  ];
  policy_name text;
begin
  foreach t in array data_tables loop
    execute format('alter table %I enable row level security', t);
    policy_name := t || '_org_isolation';
    -- Drop and re-create so re-running the migration is idempotent
    execute format('drop policy if exists %I on %I', policy_name, t);
    execute format(
      'create policy %I on %I for all '
      || 'using (organization_id = nullif(current_setting(''app.current_org_id'', true), '''')::bigint) '
      || 'with check (organization_id = nullif(current_setting(''app.current_org_id'', true), '''')::bigint)',
      policy_name, t
    );
  end loop;
end$$;
