-- Intrinsic dimensions for gallery images.
--
-- The public site reserves each tile's height before the image loads so the
-- grid doesn't reflow. Until now those ratios came from data/home-dims.json,
-- a static file keyed by the "NNN-" filename prefix of the photos we imported
-- — so anything Goga uploads through the admin has no entry and its tile
-- jumps as it loads.
--
-- uploadProjectImage() reads width/height from sharp while generating the
-- thumbnail, so it can fill these in at upload time. Nullable: rows predating
-- this migration keep falling back to home-dims.json / a default ratio.

alter table project_images
  add column if not exists width  integer,
  add column if not exists height integer;

comment on column project_images.width  is 'Intrinsic pixel width, EXIF rotation applied. Null = unknown.';
comment on column project_images.height is 'Intrinsic pixel height, EXIF rotation applied. Null = unknown.';
