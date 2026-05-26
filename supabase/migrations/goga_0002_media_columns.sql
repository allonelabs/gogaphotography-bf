-- Media columns for surfaces the photographer needs to manage on the
-- public site: homepage hero background, per-package thumbnail,
-- per-service thumbnail, per-page OG share image.
--
-- All paths reference objects inside the existing `projects` Supabase
-- storage bucket (public-read).

alter table hero
  add column if not exists hero_image_path text;

alter table packages
  add column if not exists hero_image_path text;

alter table services
  add column if not exists hero_image_path text;

alter table pages
  add column if not exists og_image_path text;

-- About / studio "portrait" image lives on the hero singleton too —
-- it's a single asset, not per-page.
alter table hero
  add column if not exists portrait_image_path text;
