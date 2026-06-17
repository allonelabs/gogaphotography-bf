-- goga_0004_store.sql — digital store: products, orders, items, downloads.

create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('album','preset')),
  title text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'GEL',
  cover_image_path text,
  preview_image_paths text[] not null default '{}',
  file_path text,                       -- private store-files bucket key
  file_size_bytes bigint,
  license_terms text,
  metadata jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'GEL',
  tbc_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store_orders(id) on delete cascade,
  product_id uuid not null references store_products(id),
  title_snapshot text not null,
  price_cents_snapshot integer not null
);

create table if not exists store_downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store_orders(id) on delete cascade,
  product_id uuid not null references store_products(id),
  token text not null unique,
  downloads_used integer not null default 0,
  max_downloads integer not null default 5,
  expires_at timestamptz not null,
  last_downloaded_at timestamptz
);

create index if not exists idx_store_products_published on store_products(published) where published;
create index if not exists idx_store_order_items_order on store_order_items(order_id);
create index if not exists idx_store_downloads_token on store_downloads(token);
create index if not exists idx_store_orders_tbc on store_orders(tbc_payment_id);

-- RLS: anon may read only published products; everything else service-role only.
alter table store_products enable row level security;
alter table store_orders enable row level security;
alter table store_order_items enable row level security;
alter table store_downloads enable row level security;

drop policy if exists store_products_public_read on store_products;
create policy store_products_public_read on store_products
  for select using (published = true);

-- Private bucket for deliverable files (public covers/previews stay in `projects`).
insert into storage.buckets (id, name, public)
values ('store-files','store-files', false)
on conflict (id) do nothing;
