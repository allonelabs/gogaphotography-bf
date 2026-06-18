-- goga_0008_portfolio_albums.sql — portfolio albums (Prowed) + project↔album join.

create table if not exists portfolio_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null default '',
  name_ka text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_albums (
  project_id uuid not null references projects(id) on delete cascade,
  album_id uuid not null references portfolio_albums(id) on delete cascade,
  primary key (project_id, album_id)
);
create index if not exists idx_project_albums_album on project_albums(album_id);

alter table portfolio_albums enable row level security;
alter table project_albums enable row level security;

drop policy if exists portfolio_albums_public_read on portfolio_albums;
create policy portfolio_albums_public_read on portfolio_albums for select using (true);
drop policy if exists project_albums_public_read on project_albums;
create policy project_albums_public_read on project_albums for select using (true);

insert into portfolio_albums (slug, name_en, name_ka, sort_order) values
  ('awards','Awards','ჯილდოები',10),
  ('best-of-the-day','Best of the Day','დღის საუკეთესო',20),
  ('best-of-the-week','Best of the Week','კვირის საუკეთესო',30),
  ('best-of-the-month','Best of the Month','თვის საუკეთესო',40),
  ('best-of-the-year','Best of the Year','წლის საუკეთესო',50),
  ('bride','Bride','პატარძალი',60),
  ('groom','Groom','სიძე',70),
  ('details','Details','დეტალები',80),
  ('editorial','Editorial','ედიტორიალი',90),
  ('film','Film','ფილმი',100),
  ('black-and-white','Black & White','შავ-თეთრი',110),
  ('party','Party','წვეულება',120),
  ('press','Press','პრესა',130),
  ('more','More','მეტი',140)
on conflict (slug) do nothing;
