-- 0004_rbac_audit.sql
-- Role-based access control (permission + role_permission) + audit log.
-- Builds on the legacy `role` table from 0001. Adds discrete permissions, a
-- many-to-many role->permission map, and a generic audit_log + trigger.

set check_function_bodies = false;

-- ============================================================================
-- permission — discrete action codes
-- ============================================================================

create table if not exists permission (
  id bigserial primary key,
  code text unique not null,
  description text
);

create table if not exists role_permission (
  role_id bigint references role(id) on delete cascade,
  permission_id bigint references permission(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Seed permissions. Domain: read / write / delete per vertical, plus
-- orders/refunds/accounting/catalogs/users/audit.
insert into permission(code, description) values
  ('hotels.read',       'Read hotels'),
  ('hotels.write',      'Create or update hotels'),
  ('hotels.delete',     'Delete hotels'),
  ('avia.read',         'Read avia'),
  ('avia.write',        'Create or update avia'),
  ('avia.delete',       'Delete avia'),
  ('transfer.read',     'Read transfer companies'),
  ('transfer.write',    'Create or update transfer companies'),
  ('transfer.delete',   'Delete transfer companies'),
  ('consul.read',       'Read consul / visa providers'),
  ('consul.write',      'Create or update consul / visa providers'),
  ('consul.delete',     'Delete consul / visa providers'),
  ('insurance.read',    'Read insurance providers'),
  ('insurance.write',   'Create or update insurance providers'),
  ('insurance.delete',  'Delete insurance providers'),
  ('excursion.read',    'Read excursion providers'),
  ('excursion.write',   'Create or update excursion providers'),
  ('excursion.delete',  'Delete excursion providers'),
  ('guide.read',        'Read guides'),
  ('guide.write',       'Create or update guides'),
  ('guide.delete',      'Delete guides'),
  ('transport.read',    'Read transport'),
  ('transport.write',   'Create or update transport'),
  ('transport.delete',  'Delete transport'),
  ('orders.read',       'Read orders'),
  ('orders.write',      'Create or update orders'),
  ('orders.delete',     'Delete orders'),
  ('refunds.read',      'Read refunds'),
  ('refunds.write',     'Create or update refunds'),
  ('refunds.delete',    'Delete refunds'),
  ('accounting.read',   'Read accounting / balances'),
  ('accounting.write',  'Create or update accounting / balances'),
  ('catalogs.read',     'Read catalog tables (countries/regions/cities/groups)'),
  ('catalogs.write',    'Create or update catalog tables'),
  ('catalogs.delete',   'Delete catalog rows'),
  ('users.read',        'Read administration / users'),
  ('users.write',       'Create or update administration / users'),
  ('users.delete',      'Delete administration / users'),
  ('audit.read',        'Read audit log'),
  ('admin.all',         'Implicit grant of all permissions')
on conflict (code) do update set description = excluded.description;

-- ============================================================================
-- role — UPSERT the 5 system roles by name (legacy IDs preserved if matched)
-- ============================================================================

insert into role(name) values
  ('admin'),
  ('manager'),
  ('operator'),
  ('accountant'),
  ('read-only')
on conflict do nothing;

-- The role table has no unique constraint on name (legacy schema). Backfill
-- by matching name. If duplicates exist from legacy, the lowest id wins.
do $$
declare
  r_admin bigint;
  r_manager bigint;
  r_operator bigint;
  r_accountant bigint;
  r_readonly bigint;
begin
  select min(id) into r_admin from role where lower(name) = 'admin';
  select min(id) into r_manager from role where lower(name) = 'manager';
  select min(id) into r_operator from role where lower(name) = 'operator';
  select min(id) into r_accountant from role where lower(name) = 'accountant';
  select min(id) into r_readonly from role where lower(name) in ('read-only', 'readonly', 'read_only');

  -- admin: every permission + the admin.all shortcut
  if r_admin is not null then
    insert into role_permission(role_id, permission_id)
    select r_admin, id from permission
    on conflict do nothing;
  end if;

  -- manager: read+write+delete on every vertical + orders/refunds/accounting,
  -- but NOT users + NOT catalogs writes (catalogs read OK).
  if r_manager is not null then
    insert into role_permission(role_id, permission_id)
    select r_manager, id from permission
    where code in (
      'hotels.read','hotels.write','hotels.delete',
      'avia.read','avia.write','avia.delete',
      'transfer.read','transfer.write','transfer.delete',
      'consul.read','consul.write','consul.delete',
      'insurance.read','insurance.write','insurance.delete',
      'excursion.read','excursion.write','excursion.delete',
      'guide.read','guide.write','guide.delete',
      'transport.read','transport.write','transport.delete',
      'orders.read','orders.write','orders.delete',
      'refunds.read','refunds.write','refunds.delete',
      'accounting.read','accounting.write',
      'catalogs.read'
    )
    on conflict do nothing;
  end if;

  -- operator: read+write across booking verticals + orders/refunds, read-only catalogs, no users / no delete.
  if r_operator is not null then
    insert into role_permission(role_id, permission_id)
    select r_operator, id from permission
    where code in (
      'hotels.read','hotels.write',
      'avia.read','avia.write',
      'transfer.read','transfer.write',
      'consul.read','consul.write',
      'insurance.read','insurance.write',
      'excursion.read','excursion.write',
      'guide.read','guide.write',
      'transport.read','transport.write',
      'orders.read','orders.write',
      'refunds.read','refunds.write',
      'accounting.read',
      'catalogs.read'
    )
    on conflict do nothing;
  end if;

  -- accountant: read everything + write orders/refunds + accounting.
  if r_accountant is not null then
    insert into role_permission(role_id, permission_id)
    select r_accountant, id from permission
    where code in (
      'hotels.read',
      'avia.read',
      'transfer.read',
      'consul.read',
      'insurance.read',
      'excursion.read',
      'guide.read',
      'transport.read',
      'orders.read','orders.write',
      'refunds.read','refunds.write',
      'accounting.read','accounting.write',
      'catalogs.read'
    )
    on conflict do nothing;
  end if;

  -- read-only: read on everything.
  if r_readonly is not null then
    insert into role_permission(role_id, permission_id)
    select r_readonly, id from permission
    where code like '%.read'
    on conflict do nothing;
  end if;
end $$;

-- ============================================================================
-- audit_log — capture inserts/updates/deletes
-- ============================================================================

create table if not exists audit_log (
  id bigserial primary key,
  occurred_at timestamptz default now(),
  actor_email text,
  action text not null,
  table_name text not null,
  row_id text,
  before jsonb,
  after jsonb,
  diff jsonb
);

create index if not exists audit_log_table_idx on audit_log(table_name, occurred_at desc);
create index if not exists audit_log_actor_idx on audit_log(actor_email, occurred_at desc);
create index if not exists audit_log_action_idx on audit_log(action, occurred_at desc);

-- ============================================================================
-- audit_trigger — generic plpgsql trigger applied to data-bearing tables
--
-- Reads `audit.actor_email` GUC (set per request via set_actor_email RPC).
-- ============================================================================

create or replace function audit_trigger() returns trigger language plpgsql as $$
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
    -- skip noop updates (only updated_at changed)
    if diff_j = '{}'::jsonb or (jsonb_object_keys(diff_j))::text = 'updated_at' then
      -- check whether there's anything besides updated_at
      if (diff_j - 'updated_at') = '{}'::jsonb then
        return NEW;
      end if;
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
end $$;

-- ============================================================================
-- Attach audit_trigger to whitelisted data-bearing tables
-- ============================================================================

do $$
declare t text;
begin
  for t in select unnest(array[
    -- Catalogs / users
    'administration',
    -- Hotels
    'hotel','hotel_contact','hotel_bank_account','hotel_balance','hotel_price_list',
    -- Avia
    'avia','avia_contact','avia_bank_account','avia_balance',
    -- Transfer
    'transfer','transfer_contact','transfer_bank_account','transfer_balance',
    -- Consul
    'consul','consul_contact','consul_bank_account','consul_balance',
    -- Insurance (table is `ensure`)
    'ensure','ensure_contact','ensure_bank_account','ensure_balance',
    -- Excursion
    'excursion','excursion_contact','excursion_bank_account','excursion_balance',
    -- Guide / transport
    'guide','transport',
    -- Orders + line items + tourists
    'p_order','p_order_tourist',
    'p_order_hotel','p_order_avia','p_order_transfer',
    'p_order_excursion','p_order_ensure','p_order_visa','p_order_service',
    -- Refunds + line items + tourists
    'p_refund','p_refund_tourist',
    'p_refund_hotel','p_refund_avia','p_refund_transfer',
    'p_refund_excursion','p_refund_ensure','p_refund_visa','p_refund_service'
  ]) loop
    if exists (select 1 from pg_tables where tablename = t) then
      if not exists (
        select 1 from pg_trigger
        where tgname = format('%s_audit', t)
          and tgrelid = t::regclass
      ) then
        execute format(
          'create trigger %I after insert or update or delete on %I for each row execute function audit_trigger();',
          t || '_audit', t
        );
      end if;
    end if;
  end loop;
end $$;

-- ============================================================================
-- set_actor_email — RPC called from the Next.js server to thread the actor's
-- email into the GUC so the audit trigger can capture it.
-- ============================================================================

create or replace function set_actor_email(email text) returns void
language sql security definer
as $$ select set_config('audit.actor_email', coalesce(email, ''), false) $$;

-- Public exec for the service-role + authenticated client (service-role has
-- all privileges, but be explicit so dashboard users can also call it).
grant execute on function set_actor_email(text) to anon, authenticated, service_role;
