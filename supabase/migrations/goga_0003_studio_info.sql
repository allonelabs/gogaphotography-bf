-- Singleton "studio info" — every piece of contact/branding text that
-- the public site currently has hardcoded in JSX. One row, id=1, easy
-- to upsert from the admin form.
--
-- Locale: fields are intentionally NOT split EN/KA. Phone numbers and
-- social URLs don't translate; address locality keeps the English form
-- since the public site doesn't currently localize it either.

create table if not exists studio_info (
  id                smallint primary key default 1 check (id = 1),
  email             text,
  phone             text,
  whatsapp          text,
  address_locality  text,
  address_country   text,
  instagram_url     text,
  facebook_url      text,
  pinterest_url     text,
  tiktok_url        text,
  hours             text,
  updated_at        timestamptz not null default now()
);

-- Seed the singleton row with the values that were hardcoded in
-- src/app/[locale]/contact/page.tsx + components/seo/JsonLd.tsx, so the
-- public site keeps rendering the same thing on first deploy.
insert into studio_info (id, email, phone, whatsapp,
  address_locality, address_country,
  instagram_url, facebook_url, pinterest_url)
values (
  1,
  'info@goga.photography',
  '+995595148467',
  '+995595148467',
  'Tbilisi',
  'GE',
  'https://www.instagram.com/gogaphotography/',
  'https://www.facebook.com/weddinggogaphotography',
  'https://www.pinterest.com/goga/'
)
on conflict (id) do nothing;

alter table studio_info enable row level security;
revoke all on studio_info from anon, authenticated;
