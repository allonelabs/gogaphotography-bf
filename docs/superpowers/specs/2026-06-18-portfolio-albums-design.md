# Portfolio Albums — Design Spec

**Date:** 2026-06-18
**Projects:** gogaphotography-bf (admin) + gogaphotography-next (public site)
**Shared DB:** Supabase `bsmgqgcoilzghdnmafua` (both repos use the same `projects` table)
**Status:** Approved design, pre-implementation

## Summary

Group the photography portfolio into the **14 "Prowed" albums** (Awards, Best of
the day/week/month/year, Black And White, Bride, Groom, Details, Editorial, Film,
Party, Press, More). A project can belong to many albums (many-to-many). The bf
admin manages album assignment; the public next site shows an album index +
per-album pages + a filterable grid. Both repos share one Supabase DB, so this is
one feature with one migration.

Reference structure (folders/naming) from `/Users/macintoshi/Downloads/Prowed.rar`:
a flat set of 14 named folders, no nesting (the five "Best of…" tiers count as
five of the 14).

## Decisions (locked)

| Decision       | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| Target         | **Both** repos — bf (manage) + next (display)                     |
| Photos         | **Restructure existing** — no bulk import from the .rar           |
| Membership     | **Many-to-many** (a project in multiple albums)                   |
| Public display | **Both** — album index + per-album pages + filterable grid        |
| Album set      | Fixed **14**, seeded; names editable, not add/remove via UI in v1 |

## The 15 albums (seed)

| slug              | EN                | KA               | sort |
| ----------------- | ----------------- | ---------------- | ---- |
| awards            | Awards            | ჯილდოები         | 10   |
| best-of-the-day   | Best of the Day   | დღის საუკეთესო   | 20   |
| best-of-the-week  | Best of the Week  | კვირის საუკეთესო | 30   |
| best-of-the-month | Best of the Month | თვის საუკეთესო   | 40   |
| best-of-the-year  | Best of the Year  | წლის საუკეთესო   | 50   |
| bride             | Bride             | პატარძალი        | 60   |
| groom             | Groom             | სიძე             | 70   |
| details           | Details           | დეტალები         | 80   |
| editorial         | Editorial         | ედიტორიალი       | 90   |
| film              | Film              | ფილმი            | 100  |
| black-and-white   | Black & White     | შავ-თეთრი        | 110  |
| party             | Party             | წვეულება         | 120  |
| press             | Press             | პრესა            | 130  |
| more              | More              | მეტი             | 140  |

(14 distinct folders observed in the archive; the five "Best of…" tiers are 5 of
them — total 14 named folders → 14 seed rows. New albums can be added later with
the same row shape.)

## Data model — new migration `goga_0008_portfolio_albums.sql`

### `portfolio_albums`

- `id` (uuid pk)
- `slug` (text unique)
- `name_en` (text), `name_ka` (text)
- `sort_order` (int default 0)
- `created_at` (timestamptz default now())

### `project_albums` (join)

- `project_id` (uuid fk → projects on delete cascade)
- `album_id` (uuid fk → portfolio_albums on delete cascade)
- primary key (`project_id`, `album_id`)
- index on `album_id`

RLS: anon **select** on both `portfolio_albums` and `project_albums` (public site
reads them); inserts/updates/deletes service-role only.

Seed: insert the rows above (idempotent `on conflict (slug) do nothing`).

## gogaphotography-bf (admin)

- **Types:** `app/lib/db/portfolio-types.ts` (`PortfolioAlbumRow`, `ProjectAlbumRow`)
  added to `GogaDatabase`.
- **Queries** (`app/lib/goga/portfolio-albums.ts`): `listAlbums()`,
  `getProjectAlbumIds(projectId)`, `setProjectAlbums(projectId, albumIds)`.
- **Project form:** add an **album multi-select** (15 checkboxes, KA/EN label) to
  the existing project create/edit form; on submit, the project action calls
  `setProjectAlbums`. (Mirror the blog tag-assignment pattern.)
- **Albums admin** (`/app/projects/albums`): list the 15 albums; rename KA/EN +
  reorder (`sort_order`). No add/remove in v1.
- **Restructure existing:** seed-assign the current demo projects to sensible
  albums (wedding → bride/groom/details/party; fashion → editorial; awards →
  awards/best-of-the-year) via a one-off SQL/script step in the plan.

## gogaphotography-next (public site)

- **Content lib** (`src/lib/content.ts` additions): `listAlbums()`,
  `listPublishedProjects()` already exists or add; `listProjectsByAlbumSlug(slug)`;
  `listProjectsWithAlbumSlugs()` (for client-side filtering on the index).
- **`/[locale]/portfolio`** — album **index**: a grid of the 15 album cards (each
  shows album name + a cover image = first published project's hero in that album)
  linking to `/[locale]/album/<slug>`, **plus** a filterable "All work" grid below
  with chips (All + albums) using `?album=<slug>`.
- **`/[locale]/album/[slug]`** — per-album page: album title (localized) + grid of
  that album's published projects (each links to the existing `project/[slug]`).
  `generateMetadata` for SEO.
- **Nav:** add a "Portfolio" link in the site navigation (localized).
- Localization via the existing `next-intl` `[locale]` setup; album names come
  from `name_ka`/`name_en` chosen by locale.

## Testing

- **bf Vitest:** `setProjectAlbums` replace semantics (pure mapping helper
  `diffAlbumIds`/insert payload builder); album list ordering.
- **next:** production build succeeds; smoke: `/en/portfolio` and an
  `/en/album/bride` render (200) and group projects; filter `?album=` narrows the
  grid.
- Both repos: `pnpm typecheck` clean; `pnpm build` clean.

## Out of scope (v1 — YAGNI)

- Per-image (photo-level) album tagging — albums attach to whole projects.
- Bulk photo import from the .rar (chosen: restructure existing only).
- Add/remove albums via UI (fixed 15; names editable).
- Drag-and-drop reordering of projects within an album.

## Open assumptions

- Both repos read the same `projects`/`portfolio_albums` data from
  `bsmgqgcoilzghdnmafua`; the migration is applied once via the Management API.
- A project's album "cover" on the index is its `hero_image_path`; album card with
  no projects shows a neutral placeholder.
- next already has a project list/grid component (`HomeGrid` / project pages) whose
  card markup can be reused for album grids.
- Public album/portfolio routes live under the existing `[locale]` segment.
