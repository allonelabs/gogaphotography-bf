-- 0001_hotel_subset.sql
-- Hotel-touching subset of travelpl_tm migrated to Postgres for travelplace-bf.
-- Verbatim column names preserved from mariadb to keep legacy-schema knowledge useful.
-- Real FKs added where they were implicit.

set check_function_bodies = false;

create table if not exists administration (
  id bigserial primary key,
  username text,
  password text, -- migrated as null; users set on first login via Supabase Auth
  first_name text,
  last_name text,
  first_name_en text,
  last_name_en text,
  father_name text,
  pasport_number text,
  gender smallint,
  pasport_number_self text,
  pasport_term date,
  birthday date,
  birth_address text,
  juridical_address text,
  address text,
  phone_home text,
  phone_work text,
  phone_other text,
  mobile1 text,
  mobile2 text,
  mail text, -- not unique: legacy data has duplicate / empty mails
  info text,
  role_id bigint,
  organization_id bigint,
  c_admin_position_id bigint,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists role (
  id bigserial primary key,
  name text not null
);

create table if not exists c_admin_position (
  id bigserial primary key,
  name text not null
);

create table if not exists setting (
  id bigserial primary key,
  key text unique not null,
  value text
);

create table if not exists c_juridical_form (
  id bigserial primary key,
  name text not null
);

create table if not exists c_hotel_group (
  id bigserial primary key,
  name text not null
);

create table if not exists cc1_country (
  id bigserial primary key,
  name text not null,
  code text
);

create table if not exists cc1_region (
  id bigserial primary key,
  cc1_country_id bigint references cc1_country(id),
  name text not null
);

create table if not exists cc1_city (
  id bigserial primary key,
  cc1_region_id bigint references cc1_region(id),
  name text not null
);

create table if not exists hotel (
  id bigserial primary key,
  type smallint default 1, -- 1 = juridical, 0 = natural person
  name text not null,
  c_juridical_form_id bigint references c_juridical_form(id),
  c_hotel_group_id bigint references c_hotel_group(id),
  full_name text,
  identification text,
  cc1_country_id bigint references cc1_country(id),
  cc1_region_id bigint references cc1_region(id),
  cc1_city_id bigint references cc1_city(id),
  comment text,
  hotel_range smallint default 0, -- 0..5 stars
  main_contact_id bigint, -- FK added in 0002 once hotel_contact exists
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists hotel_contact (
  id bigserial primary key,
  hotel_id bigint references hotel(id) on delete cascade,
  name text,
  role text,
  phone text,
  email text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Now we can wire the back-reference
alter table hotel add constraint hotel_main_contact_fk
  foreign key (main_contact_id) references hotel_contact(id);

create table if not exists hotel_bank_account (
  id bigserial primary key,
  hotel_id bigint references hotel(id) on delete cascade,
  bank text,
  account_number text,
  iban text,
  swift text,
  currency text default 'GEL',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists hotel_balance (
  id bigserial primary key,
  hotel_id bigint references hotel(id) on delete cascade,
  amount numeric(14,2) default 0,
  currency text default 'GEL',
  recorded_at timestamptz default now()
);

create table if not exists hotel_price_list (
  id bigserial primary key,
  hotel_id bigint references hotel(id) on delete cascade,
  season_from date,
  season_to date,
  room_type text,
  price numeric(10,2),
  currency text default 'USD',
  created_at timestamptz default now()
);

create table if not exists hotel_price_grid (
  id bigserial primary key,
  hotel_id bigint references hotel(id) on delete cascade,
  data jsonb, -- legacy uses a grid; preserve as JSON for now
  created_at timestamptz default now()
);

-- Index hotspots
create index if not exists hotel_country_idx on hotel(cc1_country_id);
create index if not exists hotel_city_idx on hotel(cc1_city_id);
create index if not exists hotel_group_idx on hotel(c_hotel_group_id);
create index if not exists hotel_name_idx on hotel using gin (to_tsvector('simple', name));
create index if not exists hotel_contact_hotel_idx on hotel_contact(hotel_id);
create index if not exists hotel_bank_hotel_idx on hotel_bank_account(hotel_id);
create index if not exists hotel_balance_hotel_idx on hotel_balance(hotel_id);

-- Updated-at trigger helper
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array['administration','hotel','hotel_contact','hotel_bank_account']) loop
    execute format(
      'create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;
