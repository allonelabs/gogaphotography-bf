-- goga_0005_blog.sql — bilingual blog: categories, tags, posts, post_tags.

create table if not exists blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ka text not null default '',
  name_en text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists blog_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ka text not null default '',
  name_en text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ka text not null default '',
  title_en text not null default '',
  excerpt_ka text not null default '',
  excerpt_en text not null default '',
  body_ka text not null default '',
  body_en text not null default '',
  cover_image_path text,
  category_id uuid references blog_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blog_post_tags (
  post_id uuid not null references blog_posts(id) on delete cascade,
  tag_id uuid not null references blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists idx_blog_posts_published on blog_posts(status, published_at desc) where status = 'published';
create index if not exists idx_blog_posts_category on blog_posts(category_id);
create index if not exists idx_blog_post_tags_tag on blog_post_tags(tag_id);

alter table blog_posts enable row level security;
alter table blog_categories enable row level security;
alter table blog_tags enable row level security;
alter table blog_post_tags enable row level security;

drop policy if exists blog_posts_public_read on blog_posts;
create policy blog_posts_public_read on blog_posts for select using (status = 'published');

drop policy if exists blog_categories_public_read on blog_categories;
create policy blog_categories_public_read on blog_categories for select using (true);

drop policy if exists blog_tags_public_read on blog_tags;
create policy blog_tags_public_read on blog_tags for select using (true);

drop policy if exists blog_post_tags_public_read on blog_post_tags;
create policy blog_post_tags_public_read on blog_post_tags for select using (true);
