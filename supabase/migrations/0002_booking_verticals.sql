-- 0002_booking_verticals.sql
-- The 7 booking verticals beyond hotel:
--   - avia, transfer, consul, ensure (= "insurance"), excursion: company-like
--   - guide: person-like
--   - transport: vehicle
-- Legacy column names from travelpl_tm.sql preserved verbatim so the original
-- domain knowledge is still useful when reading code.
-- Real FKs added where they were implicit in mariadb.

set check_function_bodies = false;

-- ============================================================================
-- Per-vertical catalog (one-name lookup) tables
-- ============================================================================

create table if not exists c_avia_group (
  id bigserial primary key,
  name text not null
);

create table if not exists c_transfer_group (
  id bigserial primary key,
  name text not null
);

create table if not exists c_consul_group (
  id bigserial primary key,
  name text not null
);

create table if not exists c_ensure_group (
  id bigserial primary key,
  name text not null
);

-- Legacy dump only has c_excursion_type — we expose it as the canonical
-- "excursion group" in our schema so the new vertical lines up with the
-- others. Same one-name shape.
create table if not exists c_excursion_group (
  id bigserial primary key,
  name text not null
);

create table if not exists c_guide_category (
  id bigserial primary key,
  name text not null
);

create table if not exists cc2_transport_mark (
  id bigserial primary key,
  name text not null
);

create table if not exists cc2_transport_model (
  id bigserial primary key,
  cc2_transport_mark_id bigint references cc2_transport_mark(id) on delete cascade,
  name text not null
);

create table if not exists c_transport_hydro (
  id bigserial primary key,
  name text not null
);

create table if not exists c_transport_color (
  id bigserial primary key,
  name text not null
);

create table if not exists c_transport_door (
  id bigserial primary key,
  name text not null
);

create table if not exists c_transport_category (
  id bigserial primary key,
  name text not null
);

-- ============================================================================
-- avia  — company-like vertical
-- ============================================================================

create table if not exists avia (
  id bigserial primary key,
  type smallint default 1, -- 1 = juridical, 0 = natural
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_avia_group_id bigint references c_avia_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  code text,
  main_contact_id bigint, -- wired after avia_contact below
  main_bank_account_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists avia_contact (
  id bigserial primary key,
  avia_id bigint references avia(id) on delete cascade,
  name text,
  company text,
  position text,
  mail text,
  address text,
  juridical_address text,
  mobile text,
  phone text,
  info text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists avia_bank_account (
  id bigserial primary key,
  avia_id bigint references avia(id) on delete cascade,
  bank_code text,
  a_a text,
  currency text,
  bank_name text,
  swift text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists avia_balance (
  id bigserial primary key,
  avia_id bigint references avia(id) on delete cascade,
  set_date date,
  c_pay_prescript text,
  arrears numeric(14,2),
  pay numeric(14,2),
  document_number text,
  type smallint,
  pay_type smallint,
  invoice_number text,
  p_order_id bigint,
  currency_id bigint,
  currency_name text,
  currency_cource numeric(14,4),
  recorded_at timestamptz default now()
);

alter table avia add constraint avia_main_contact_fk
  foreign key (main_contact_id) references avia_contact(id);
alter table avia add constraint avia_main_bank_fk
  foreign key (main_bank_account_id) references avia_bank_account(id);

-- ============================================================================
-- transfer  — company-like + a few extra freetext / list columns
-- ============================================================================

create table if not exists transfer (
  id bigserial primary key,
  type smallint default 1,
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_transfer_group_id bigint references c_transfer_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  code text,
  main_contact_id bigint,
  main_bank_account_id bigint,
  text_en text,
  text_ge text,
  main_transfer_list_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transfer_contact (
  id bigserial primary key,
  transfer_id bigint references transfer(id) on delete cascade,
  name text,
  company text,
  position text,
  mail text,
  address text,
  juridical_address text,
  mobile text,
  phone text,
  info text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transfer_bank_account (
  id bigserial primary key,
  transfer_id bigint references transfer(id) on delete cascade,
  bank_code text,
  a_a text,
  currency text,
  bank_name text,
  swift text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transfer_balance (
  id bigserial primary key,
  transfer_id bigint references transfer(id) on delete cascade,
  set_date date,
  c_pay_prescript text,
  arrears numeric(14,2),
  pay numeric(14,2),
  document_number text,
  type smallint,
  pay_type smallint,
  invoice_number text,
  p_order_id bigint,
  currency_id bigint,
  currency_name text,
  currency_cource numeric(14,4),
  recorded_at timestamptz default now()
);

alter table transfer add constraint transfer_main_contact_fk
  foreign key (main_contact_id) references transfer_contact(id);
alter table transfer add constraint transfer_main_bank_fk
  foreign key (main_bank_account_id) references transfer_bank_account(id);

-- ============================================================================
-- consul  — company-like (no `code` in legacy; keep schema consistent)
-- ============================================================================

create table if not exists consul (
  id bigserial primary key,
  type smallint default 1,
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_consul_group_id bigint references c_consul_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  main_contact_id bigint,
  main_bank_account_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists consul_contact (
  id bigserial primary key,
  consul_id bigint references consul(id) on delete cascade,
  name text,
  company text,
  position text,
  mail text,
  address text,
  juridical_address text,
  mobile text,
  phone text,
  info text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists consul_bank_account (
  id bigserial primary key,
  consul_id bigint references consul(id) on delete cascade,
  bank_code text,
  a_a text,
  currency text,
  bank_name text,
  swift text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists consul_balance (
  id bigserial primary key,
  consul_id bigint references consul(id) on delete cascade,
  set_date date,
  c_pay_prescript text,
  arrears numeric(14,2),
  pay numeric(14,2),
  document_number text,
  type smallint,
  pay_type smallint,
  invoice_number text,
  p_order_id bigint,
  currency_id bigint,
  currency_name text,
  currency_cource numeric(14,4),
  recorded_at timestamptz default now()
);

alter table consul add constraint consul_main_contact_fk
  foreign key (main_contact_id) references consul_contact(id);
alter table consul add constraint consul_main_bank_fk
  foreign key (main_bank_account_id) references consul_bank_account(id);

-- ============================================================================
-- ensure  — company-like (insurance). Table name kept as `ensure` (legacy).
-- ============================================================================

create table if not exists ensure (
  id bigserial primary key,
  type smallint default 1,
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_ensure_group_id bigint references c_ensure_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  code text,
  main_contact_id bigint,
  main_bank_account_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ensure_contact (
  id bigserial primary key,
  ensure_id bigint references ensure(id) on delete cascade,
  name text,
  company text,
  position text,
  mail text,
  address text,
  juridical_address text,
  mobile text,
  phone text,
  info text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ensure_bank_account (
  id bigserial primary key,
  ensure_id bigint references ensure(id) on delete cascade,
  bank_code text,
  a_a text,
  currency text,
  bank_name text,
  swift text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ensure_balance (
  id bigserial primary key,
  ensure_id bigint references ensure(id) on delete cascade,
  set_date date,
  c_pay_prescript text,
  arrears numeric(14,2),
  pay numeric(14,2),
  document_number text,
  type smallint,
  pay_type smallint,
  invoice_number text,
  p_order_id bigint,
  currency_id bigint,
  currency_name text,
  currency_cource numeric(14,4),
  recorded_at timestamptz default now()
);

alter table ensure add constraint ensure_main_contact_fk
  foreign key (main_contact_id) references ensure_contact(id);
alter table ensure add constraint ensure_main_bank_fk
  foreign key (main_bank_account_id) references ensure_bank_account(id);

-- ============================================================================
-- excursion  — modeled after hotel (no legacy `excursion` company table existed)
-- ============================================================================

create table if not exists excursion (
  id bigserial primary key,
  type smallint default 1,
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_excursion_group_id bigint references c_excursion_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  code text,
  main_contact_id bigint,
  main_bank_account_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists excursion_contact (
  id bigserial primary key,
  excursion_id bigint references excursion(id) on delete cascade,
  name text,
  company text,
  position text,
  mail text,
  address text,
  juridical_address text,
  mobile text,
  phone text,
  info text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists excursion_bank_account (
  id bigserial primary key,
  excursion_id bigint references excursion(id) on delete cascade,
  bank_code text,
  a_a text,
  currency text,
  bank_name text,
  swift text,
  main boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists excursion_balance (
  id bigserial primary key,
  excursion_id bigint references excursion(id) on delete cascade,
  set_date date,
  c_pay_prescript text,
  arrears numeric(14,2),
  pay numeric(14,2),
  document_number text,
  type smallint,
  pay_type smallint,
  invoice_number text,
  p_order_id bigint,
  currency_id bigint,
  currency_name text,
  currency_cource numeric(14,4),
  recorded_at timestamptz default now()
);

alter table excursion add constraint excursion_main_contact_fk
  foreign key (main_contact_id) references excursion_contact(id);
alter table excursion add constraint excursion_main_bank_fk
  foreign key (main_bank_account_id) references excursion_bank_account(id);

-- ============================================================================
-- guide  — person-like (no sub-entities)
-- ============================================================================

create table if not exists guide (
  id bigserial primary key,
  username text,
  type smallint,
  first_name text,
  last_name text,
  first_name_en text,
  last_name_en text,
  self_number text,
  pasport_number text,
  gender smallint,
  birthday date,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  c_guide_category_id bigint references c_guide_category(id),
  address text,
  phone_home text,
  phone_work text,
  phone_mobile text,
  mobile text,
  fax text,
  mail text,
  info1 text,
  info2 text,
  message text,
  ok_message boolean,
  start_date date,
  start_balance numeric(14,2),
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- transport  — vehicle (no sub-entities)
-- ============================================================================

create table if not exists transport (
  id bigserial primary key,
  holder_name text,
  phone text,
  holder_contact1 text,
  holder_contact2 text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  cc2_transport_mark_id bigint references cc2_transport_mark(id),
  cc2_transport_model_id bigint references cc2_transport_model(id),
  year text,
  c_transport_hydro_id bigint references c_transport_hydro(id),
  c_transport_color_id bigint references c_transport_color(id),
  c_transport_door_id bigint references c_transport_door(id),
  rudder smallint,
  c_transport_category_id bigint references c_transport_category(id),
  parameter1 boolean,
  parameter2 boolean,
  parameter3 boolean,
  parameter4 boolean,
  parameter5 boolean,
  parameter6 boolean,
  fuel_count numeric(8,2),
  commuter_count bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- Indexes (hot lookup paths + name search)
-- ============================================================================

create index if not exists avia_country_idx on avia(cc1_country_id);
create index if not exists avia_city_idx on avia(cc1_city_id);
create index if not exists avia_group_idx on avia(c_avia_group_id);
create index if not exists avia_name_idx on avia using gin (to_tsvector('simple', name));

create index if not exists transfer_country_idx on transfer(cc1_country_id);
create index if not exists transfer_city_idx on transfer(cc1_city_id);
create index if not exists transfer_group_idx on transfer(c_transfer_group_id);
create index if not exists transfer_name_idx on transfer using gin (to_tsvector('simple', name));

create index if not exists consul_country_idx on consul(cc1_country_id);
create index if not exists consul_city_idx on consul(cc1_city_id);
create index if not exists consul_group_idx on consul(c_consul_group_id);
create index if not exists consul_name_idx on consul using gin (to_tsvector('simple', name));

create index if not exists ensure_country_idx on ensure(cc1_country_id);
create index if not exists ensure_city_idx on ensure(cc1_city_id);
create index if not exists ensure_group_idx on ensure(c_ensure_group_id);
create index if not exists ensure_name_idx on ensure using gin (to_tsvector('simple', name));

create index if not exists excursion_country_idx on excursion(cc1_country_id);
create index if not exists excursion_city_idx on excursion(cc1_city_id);
create index if not exists excursion_group_idx on excursion(c_excursion_group_id);
create index if not exists excursion_name_idx on excursion using gin (to_tsvector('simple', name));

create index if not exists guide_country_idx on guide(cc1_country_id);
create index if not exists guide_category_idx on guide(c_guide_category_id);
create index if not exists guide_last_name_idx on guide(last_name);

create index if not exists transport_mark_idx on transport(cc2_transport_mark_id);
create index if not exists transport_model_idx on transport(cc2_transport_model_id);
create index if not exists transport_holder_idx on transport using gin (to_tsvector('simple', coalesce(holder_name,'')));

-- Sub-entity parent indexes
create index if not exists avia_contact_idx on avia_contact(avia_id);
create index if not exists avia_bank_idx on avia_bank_account(avia_id);
create index if not exists avia_balance_idx on avia_balance(avia_id);

create index if not exists transfer_contact_idx on transfer_contact(transfer_id);
create index if not exists transfer_bank_idx on transfer_bank_account(transfer_id);
create index if not exists transfer_balance_idx on transfer_balance(transfer_id);

create index if not exists consul_contact_idx on consul_contact(consul_id);
create index if not exists consul_bank_idx on consul_bank_account(consul_id);
create index if not exists consul_balance_idx on consul_balance(consul_id);

create index if not exists ensure_contact_idx on ensure_contact(ensure_id);
create index if not exists ensure_bank_idx on ensure_bank_account(ensure_id);
create index if not exists ensure_balance_idx on ensure_balance(ensure_id);

create index if not exists excursion_contact_idx on excursion_contact(excursion_id);
create index if not exists excursion_bank_idx on excursion_bank_account(excursion_id);
create index if not exists excursion_balance_idx on excursion_balance(excursion_id);

create index if not exists cc2_transport_model_mark_idx on cc2_transport_model(cc2_transport_mark_id);

-- ============================================================================
-- updated_at triggers — reuse set_updated_at() from 0001
-- ============================================================================

do $$
declare t text;
begin
  for t in select unnest(array[
    'avia','avia_contact','avia_bank_account',
    'transfer','transfer_contact','transfer_bank_account',
    'consul','consul_contact','consul_bank_account',
    'ensure','ensure_contact','ensure_bank_account',
    'excursion','excursion_contact','excursion_bank_account',
    'guide','transport'
  ]) loop
    -- guard against re-applying on re-run
    if not exists (
      select 1 from pg_trigger
      where tgname = format('%I_set_updated_at', t)::text
        and tgrelid = t::regclass
    ) then
      execute format(
        'create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at();',
        t, t
      );
    end if;
  end loop;
end $$;
