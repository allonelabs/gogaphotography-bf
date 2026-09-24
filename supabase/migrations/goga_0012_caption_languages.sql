-- Georgian and Russian photo captions.
--
-- Every project image carries one caption, written in English. The site
-- (api/portfolio on gogaphotography) had nothing per-image to show in KA or
-- RU, so it fell back to the project's title - and the homepage album's
-- project is titled "Homepage - landing photos". A Georgian or Russian
-- visitor saw "მთავარი გვერდი - ფოტოები" under all hundred landing tiles,
-- and "Salome & Andro" in place of "Ceremony detail" in the other albums.
--
-- Nullable, same as goga_0010: the site falls back per field (ru -> ka -> en)
-- so a caption Goga has not translated yet keeps showing something sensible
-- rather than the project name.

alter table public.project_images
  add column if not exists caption_ka text,
  add column if not exists caption_ru text;

comment on column public.project_images.caption is
  'English caption. Shown when the KA/RU one is null.';
comment on column public.project_images.caption_ka is
  'Georgian caption. Null falls back to EN.';
comment on column public.project_images.caption_ru is
  'Russian caption. Null falls back to KA, then EN.';
