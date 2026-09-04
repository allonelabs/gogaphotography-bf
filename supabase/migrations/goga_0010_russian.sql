-- Russian copy for every admin-authored table.
--
-- The public site is trilingual: data/i18n.js carries [ka, en, ru] triples and
-- the language switcher offers RU. But that dictionary only covers the static
-- chrome — menus, buttons, labels. Everything Goga writes in the Studio admin
-- was stored as _en and _ka only, with no _ru at all, so a visitor choosing RU
-- got Russian navigation wrapped around Georgian content: FAQ answers, blog
-- posts, service descriptions, package names, project captions.
--
-- That is the whole "Russian is messed up on the entire site" report. It is not
-- a rendering bug; the column the site would read was never there.
--
-- Nullable on purpose. Existing rows stay valid, and the site falls back per
-- field (ru -> ka -> en), so a partially translated page keeps working instead
-- of rendering blank while Goga fills it in.

alter table public.pages
  add column if not exists title_ru text,
  add column if not exists body_ru  text;

alter table public.blog_posts
  add column if not exists title_ru   text,
  add column if not exists excerpt_ru text,
  add column if not exists body_ru    text;

alter table public.services
  add column if not exists title_ru       text,
  add column if not exists description_ru text;

alter table public.packages
  add column if not exists name_ru         text,
  add column if not exists short_desc_ru   text,
  add column if not exists deliverables_ru text;

alter table public.hero
  add column if not exists headline_ru text,
  add column if not exists subtitle_ru text;

alter table public.projects
  add column if not exists title_ru       text,
  add column if not exists location_ru    text,
  add column if not exists description_ru text;

alter table public.portfolio_albums
  add column if not exists name_ru text;

comment on column public.pages.body_ru is
  'Russian page body (markdown). Null falls back to KA, then EN.';
comment on column public.blog_posts.body_ru is
  'Russian post body (markdown). Null falls back to KA, then EN.';
