-- FAQ editorial photos: when a question is opened, a few very small photos
-- appear in the empty margins around the answer. On/off lives in site
-- settings; the photos come from the "faq" portfolio album (falls back to
-- the homepage album while the studio hasn't assigned any).

alter table public.site_settings
  add column if not exists faq_photos boolean not null default true;

insert into public.portfolio_albums (slug, name_en, name_ka, name_ru, sort_order)
select 'faq', 'FAQ page', 'FAQ გვერდი', 'Страница FAQ', 99
where not exists (select 1 from public.portfolio_albums where slug = 'faq');

notify pgrst, 'reload schema';
