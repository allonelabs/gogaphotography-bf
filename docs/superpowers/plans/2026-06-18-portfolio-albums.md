# Portfolio Albums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the photography portfolio into the 14 "Prowed" albums (many-to-many), managed in the `gogaphotography-bf` admin and displayed as an album index + per-album pages + filterable grid on the public `gogaphotography-next` site.

**Architecture:** One migration on the shared Supabase DB (`bsmgqgcoilzghdnmafua`) adds `portfolio_albums` (seeded with 14 bilingual albums) and a `project_albums` join. bf adds album checkboxes to the project form + an albums admin; next reads the albums via `content.ts` and renders `/[locale]/portfolio` + `/[locale]/album/[slug]`. Both repos already share the `projects` table.

**Tech Stack:** Next.js 15, TypeScript, Supabase (`gogaAdmin()` in bf, `supabaseAdmin()` in next), next-intl (next), Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-06-18-portfolio-albums-design.md`

**Repo paths:** bf = `/Users/macintoshi/Projects/site-xray/gogaphotography-bf`, next = `/Users/macintoshi/Projects/site-xray/gogaphotography-next`.

---

## Conventions

- Supabase row types: `type` aliases, not `interface`.
- Migrations via Management API + `notify pgrst, 'reload schema';`.
- Commits `team@allonelabs.com`; bf build `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`.
- Deploy each repo from its own dir: `vercel --prod --yes --token $(security find-generic-password -s vercel-api-token -w)` (both are linked Vercel projects: `gogaphotography-bf`, `gogaphotography-next`).
- next public reads: `supabaseAdmin()` from `@/lib/supabase/server`, `publicImageUrl()` from `@/lib/supabase/storage`, `pick(locale, ka, en)` in `content.ts`, `Link` from `@/i18n/navigation`, locales `["en","ka"]`.
- bf project actions: `createProject(formData)`, `updateProject(id, formData)`; shared form `app/app/projects/[id]/_form.tsx`.

## File Structure

**Shared DB:** `gogaphotography-bf/supabase/migrations/goga_0008_portfolio_albums.sql`

**bf — create:** `app/lib/db/portfolio-types.ts`, `app/lib/goga/portfolio-albums.ts`, `app/app/projects/albums/page.tsx`, `tests/unit/portfolio-albums.test.ts`
**bf — modify:** `app/lib/db/goga-types.ts`, `app/lib/goga/actions-projects.ts`, `app/app/projects/[id]/_form.tsx`, `app/app/projects/new/page.tsx`, `app/app/projects/[id]/page.tsx`

**next — create:** `src/app/[locale]/portfolio/page.tsx`, `src/app/[locale]/album/[slug]/page.tsx`, `src/components/portfolio/AlbumGrid.tsx`
**next — modify:** `src/lib/content.ts`, `src/components/layout/Menu.tsx` (nav), `src/messages/en.json` + `src/messages/ka.json`

---

## Phase 1 — Shared DB

### Task 1: Migration + seed

**Files:** Create `supabase/migrations/goga_0008_portfolio_albums.sql` (in bf)

- [ ] **Step 1: Write**

```sql
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
```

- [ ] **Step 2: Apply + reload + verify**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
PAT=$(security find-generic-password -s gogaphotography-supabase-pat -w)
SQL=$(python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/goga_0008_portfolio_albums.sql').read()}))")
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d "$SQL" -w "\nmig %{http_code}\n" | tail -1
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d '{"query":"notify pgrst, '"'"'reload schema'"'"';"}' -w "reload %{http_code}\n" | tail -1
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
until [ "$(curl -s -o /dev/null -w '%{http_code}' "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/portfolio_albums?select=slug&limit=1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC")" = "200" ]; do sleep 3; done
echo -n "album count: "; curl -s "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/portfolio_albums?select=slug" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"
```

Expected: mig 201, reload 201, album count 14.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/goga_0008_portfolio_albums.sql
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): albums + project_albums tables, seed 14 Prowed albums"
```

---

## Phase 2 — bf admin

### Task 2: Types

**Files:** Create `app/lib/db/portfolio-types.ts`; Modify `app/lib/db/goga-types.ts`

- [ ] **Step 1: Write types**

```typescript
// app/lib/db/portfolio-types.ts
export type PortfolioAlbumRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ka: string;
  sort_order: number;
  created_at: string;
};
export type ProjectAlbumRow = {
  project_id: string;
  album_id: string;
};
```

- [ ] **Step 2: Wire into `goga-types.ts`** — import at top:

```typescript
import type { PortfolioAlbumRow, ProjectAlbumRow } from "./portfolio-types";
```

Add inside `public.Tables` (before its closing `};`):

```typescript
portfolio_albums: {
  Row: PortfolioAlbumRow;
  Insert: Partial<PortfolioAlbumRow> & Pick<PortfolioAlbumRow, "slug">;
  Update: Partial<PortfolioAlbumRow>;
  Relationships: [];
}
project_albums: {
  Row: ProjectAlbumRow;
  Insert: ProjectAlbumRow;
  Update: Partial<ProjectAlbumRow>;
  Relationships: [];
}
```

- [ ] **Step 3: Typecheck** → 0 errors (flood of `never` ⇒ used `interface`). Commit:

```bash
git add app/lib/db/portfolio-types.ts app/lib/db/goga-types.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): typed album tables"
```

---

### Task 3: Album queries + assignment (TDD for the pure helper)

**Files:** Create `app/lib/goga/portfolio-albums.ts`; Test `tests/unit/portfolio-albums.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/portfolio-albums.test.ts
import { describe, it, expect } from "vitest";
import { albumLinkRows } from "@/app/lib/goga/portfolio-albums";

describe("albumLinkRows", () => {
  it("builds join rows for a project + album ids, deduped", () => {
    expect(albumLinkRows("P1", ["a", "b", "a"])).toEqual([
      { project_id: "P1", album_id: "a" },
      { project_id: "P1", album_id: "b" },
    ]);
  });
  it("returns [] for no albums", () => {
    expect(albumLinkRows("P1", [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — fails.** `pnpm vitest run tests/unit/portfolio-albums.test.ts`

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/portfolio-albums.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  PortfolioAlbumRow,
  ProjectAlbumRow,
} from "@/app/lib/db/portfolio-types";

/** Pure: dedup album ids → join rows for a project. */
export function albumLinkRows(
  projectId: string,
  albumIds: string[],
): ProjectAlbumRow[] {
  return Array.from(new Set(albumIds)).map((album_id) => ({
    project_id: projectId,
    album_id,
  }));
}

export async function listAlbums(): Promise<PortfolioAlbumRow[]> {
  const { data } = await gogaAdmin()
    .from("portfolio_albums")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as PortfolioAlbumRow[];
}

export async function getProjectAlbumIds(projectId: string): Promise<string[]> {
  const { data } = await gogaAdmin()
    .from("project_albums")
    .select("album_id")
    .eq("project_id", projectId);
  return (data ?? []).map((r) => r.album_id);
}

/** Replace a project's album set. */
export async function setProjectAlbums(
  projectId: string,
  albumIds: string[],
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("project_albums").delete().eq("project_id", projectId);
  const rows = albumLinkRows(projectId, albumIds);
  if (rows.length > 0) await sb.from("project_albums").insert(rows);
}

export async function updateAlbum(
  id: string,
  patch: Partial<PortfolioAlbumRow>,
): Promise<void> {
  await gogaAdmin()
    .from("portfolio_albums")
    .update(patch as PortfolioAlbumRow)
    .eq("id", id);
}
```

- [ ] **Step 4: Run — passes.** Commit:

```bash
git add app/lib/goga/portfolio-albums.ts tests/unit/portfolio-albums.test.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): album queries + assignment (TDD)"
```

---

### Task 4: Album multi-select on the project form + save on create/update

**Files:** Modify `app/lib/goga/actions-projects.ts`, `app/app/projects/[id]/_form.tsx`, `app/app/projects/new/page.tsx`, `app/app/projects/[id]/page.tsx`

- [ ] **Step 1: Pass albums + selection into the form.** First read `_form.tsx` to learn its prop shape and the field-wrapper classes. Then add two props (`albums: PortfolioAlbumRow[]`, `selectedAlbumIds?: string[]`) and render a checkbox group inside the form (before the submit button), matching the existing label styling:

```tsx
{
  /* Albums (Prowed) */
}
<fieldset className="rounded-lg border border-black/10 p-3">
  <legend className="text-[13px]">Albums</legend>
  <div className="flex flex-wrap gap-3">
    {albums.map((a) => (
      <label key={a.id} className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          name="album_ids"
          value={a.id}
          defaultChecked={(selectedAlbumIds ?? []).includes(a.id)}
        />
        {a.name_en || a.name_ka || a.slug}
      </label>
    ))}
  </div>
</fieldset>;
```

Add the import `import type { PortfolioAlbumRow } from "@/app/lib/db/portfolio-types";` to `_form.tsx`.

- [ ] **Step 2: Wire albums into the new + edit pages.** In `app/app/projects/new/page.tsx` and `app/app/projects/[id]/page.tsx`, fetch albums (and selected ids on edit) and pass to the form:

```tsx
import {
  listAlbums,
  getProjectAlbumIds,
} from "@/app/lib/goga/portfolio-albums";
// new page:
const albums = await listAlbums();
// ...render <ProjectForm ... albums={albums} />  (match the existing component name/usage)
// edit page:
const albums = await listAlbums();
const selectedAlbumIds = await getProjectAlbumIds(id);
// ...render <...form... albums={albums} selectedAlbumIds={selectedAlbumIds} />
```

(Match the actual form component import/usage already in those pages.)

- [ ] **Step 3: Save albums in the actions.** In `app/lib/goga/actions-projects.ts` add `import { setProjectAlbums } from "./portfolio-albums";`. In `createProject`, change the insert to return the id and save albums:

```typescript
// was: const { error } = await sb.from("projects").insert(update);
const { data: created, error } = await sb
  .from("projects")
  .insert(update)
  .select("id")
  .single();
if (error) throw new Error(`createProject: ${error.message}`);
const albumIds = formData.getAll("album_ids").map(String).filter(Boolean);
if (created) await setProjectAlbums(created.id, albumIds);
```

In `updateProject`, after the successful update (before/with the revalidate calls):

```typescript
const albumIds = formData.getAll("album_ids").map(String).filter(Boolean);
await setProjectAlbums(id, albumIds);
```

- [ ] **Step 4: Typecheck** → 0 errors. Commit:

```bash
git add app/lib/goga/actions-projects.ts "app/app/projects/[id]/_form.tsx" app/app/projects/new/page.tsx "app/app/projects/[id]/page.tsx"
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): assign albums from the project form"
```

---

### Task 5: Albums admin page

**Files:** Create `app/app/projects/albums/page.tsx`

- [ ] **Step 1: Implement** (list + rename/reorder via a server action). Add `renameAlbum` to `portfolio-albums.ts` is already covered by `updateAlbum`; wrap it in a `"use server"` action inline or in actions. Use a small server action file section — simplest: a `"use server"` action defined in a new `app/lib/goga/actions-portfolio.ts`:

```typescript
// app/lib/goga/actions-portfolio.ts
"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "./require-auth";
import { updateAlbum } from "./portfolio-albums";

export async function saveAlbum(id: string, formData: FormData): Promise<void> {
  await requireSession();
  await updateAlbum(id, {
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_ka: String(formData.get("name_ka") ?? "").trim(),
    sort_order: parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
  });
  revalidatePath("/app/projects/albums");
}
```

```tsx
// app/app/projects/albums/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { listAlbums } from "@/app/lib/goga/portfolio-albums";
import { saveAlbum } from "@/app/lib/goga/actions-portfolio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio albums" };

export default async function AlbumsPage() {
  const albums = await listAlbums();
  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Projects", href: "/app/projects" },
        { label: "Albums" },
      ]}
      chatScope={{ level: "tool", tool: "projects" }}
      chatScopeLabel="Projects"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
          Portfolio albums
        </h1>
        <ul className="space-y-2">
          {albums.map((a) => (
            <li key={a.id}>
              <form
                action={saveAlbum.bind(null, a.id)}
                className="flex flex-wrap items-end gap-2 border-b border-black/5 py-2"
              >
                <span className="w-28 text-xs text-neutral-400">{a.slug}</span>
                <label className="text-xs">
                  EN
                  <input
                    name="name_en"
                    defaultValue={a.name_en}
                    className="ml-1 rounded border px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  KA
                  <input
                    name="name_ka"
                    defaultValue={a.name_ka}
                    className="ml-1 rounded border px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  #
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={a.sort_order}
                    className="ml-1 w-16 rounded border px-2 py-1 text-sm"
                  />
                </label>
                <button className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2:** Add a link to `/app/projects/albums` from the projects list page (`app/app/projects/page.tsx` header) — a small `<Link href="/app/projects/albums">Albums</Link>`.

- [ ] **Step 3: Typecheck** → 0 errors. Commit:

```bash
git add app/lib/goga/actions-portfolio.ts app/app/projects/albums app/app/projects/page.tsx
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): albums admin (rename/reorder)"
```

---

### Task 6: Restructure existing — assign demo projects

**Files:** none (data step)

- [ ] **Step 1: Map the 3 demo projects to albums via SQL (Management API).**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
PAT=$(security find-generic-password -s gogaphotography-supabase-pat -w)
read -r -d '' Q <<'SQL'
insert into project_albums (project_id, album_id)
select p.id, a.id from projects p, portfolio_albums a
where (p.slug='salome-andro-wedding' and a.slug in ('bride','groom','details','party','best-of-the-year'))
   or (p.slug='fashion-week-2025'   and a.slug in ('editorial','press'))
   or (p.slug='awards-2025'         and a.slug in ('awards','best-of-the-year'))
on conflict do nothing;
SQL
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d "$(python3 -c "import json,os;print(json.dumps({'query':os.environ['Q']}))" Q="$Q")" -w "\n%{http_code}\n" | tail -1
```

Expected: 201. (If the demo slugs differ, list them first via `?select=slug` and adjust.)

- [ ] **Step 2: Verify** — `project_albums` now has rows:

```bash
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
curl -s "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/project_albums?select=project_id,album_id" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'links')"
```

Expected: ≥ 9 links. (No commit — data only.)

---

## Phase 3 — next public site

### Task 7: content.ts album helpers

**Files:** Modify `src/lib/content.ts` (in next)

- [ ] **Step 1: Add album types + queries.** Append to `src/lib/content.ts` (reuse existing `pick`, `publicImageUrl`, `supabaseAdmin`, `PublicProject`, `Locale`):

```typescript
export type PublicAlbum = { slug: string; name: string; sortOrder: number };

export async function getAlbums(locale: Locale): Promise<PublicAlbum[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("portfolio_albums")
    .select("slug, name_en, name_ka, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[content] getAlbums:", error);
    return [];
  }
  return (data ?? []).map((a) => ({
    slug: a.slug,
    name: pick(locale, a.name_ka, a.name_en),
    sortOrder: a.sort_order,
  }));
}

export async function getProjectsByAlbum(
  slug: string,
  locale: Locale,
): Promise<PublicProject[]> {
  const sb = supabaseAdmin();
  const { data: album } = await sb
    .from("portfolio_albums")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!album) return [];
  const { data: links } = await sb
    .from("project_albums")
    .select("project_id")
    .eq("album_id", album.id);
  const ids = (links ?? []).map((l) => l.project_id);
  if (ids.length === 0) return [];
  const { data, error } = await sb
    .from("projects")
    .select(
      "id, slug, title_en, title_ka, location_en, location_ka, description_en, description_ka, hero_image_path",
    )
    .eq("published", true)
    .in("id", ids)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[content] getProjectsByAlbum:", error);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: pick(locale, p.title_ka, p.title_en),
    location: pick(locale, p.location_ka, p.location_en),
    description: pick(locale, p.description_ka, p.description_en),
    heroImage: publicImageUrl(p.hero_image_path),
  }));
}

/** Album slug → first published project hero (for index covers). */
export async function getAlbumCovers(): Promise<Record<string, string | null>> {
  const sb = supabaseAdmin();
  const { data: links } = await sb
    .from("project_albums")
    .select("album_id, project_id");
  const { data: albums } = await sb.from("portfolio_albums").select("id, slug");
  const { data: projects } = await sb
    .from("projects")
    .select("id, hero_image_path, sort_order, published")
    .eq("published", true);
  const projById = new Map((projects ?? []).map((p) => [p.id, p]));
  const albumSlug = new Map((albums ?? []).map((a) => [a.id, a.slug]));
  const out: Record<string, string | null> = {};
  for (const a of albums ?? []) out[a.slug] = null;
  for (const l of links ?? []) {
    const slug = albumSlug.get(l.album_id);
    const proj = projById.get(l.project_id);
    if (slug && proj && !out[slug])
      out[slug] = publicImageUrl(proj.hero_image_path);
  }
  return out;
}
```

(Note: if next's `Database` types reject the new tables, these queries still run — next's `supabaseAdmin()` is likely untyped or typed loosely; if typecheck complains, add the two tables to next's DB type or cast `as never` on `.from(...)`. Verify during the task.)

- [ ] **Step 2: Typecheck (next)** — `cd ../gogaphotography-next && pnpm typecheck` (or `npx tsc --noEmit`). 0 errors. Commit (in next):

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-next
git checkout -b feat/portfolio-albums 2>/dev/null || git checkout feat/portfolio-albums
git add src/lib/content.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): album content queries"
```

---

### Task 8: AlbumGrid component + portfolio index + album pages

**Files (next):** Create `src/components/portfolio/AlbumGrid.tsx`, `src/app/[locale]/portfolio/page.tsx`, `src/app/[locale]/album/[slug]/page.tsx`

- [ ] **Step 1: Reusable project grid.** First read `src/components/home/HomeGrid.tsx` for its tile markup + `HomeGrid.module.css` class names; mirror them. Create:

```tsx
// src/components/portfolio/AlbumGrid.tsx
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PublicProject } from "@/lib/content";
import styles from "@/components/home/HomeGrid.module.css";

export function AlbumGrid({ projects }: { projects: PublicProject[] }) {
  const tiles = projects.filter((p) => p.heroImage);
  if (tiles.length === 0)
    return <p style={{ padding: "40px 24px", opacity: 0.6 }}>—</p>;
  return (
    <section className={styles.grid ?? undefined}>
      {tiles.map((p) => (
        <Link
          key={p.id}
          href={{ pathname: "/project/[slug]", params: { slug: p.slug } }}
          className={styles.tile ?? undefined}
        >
          {p.heroImage && (
            <Image
              src={p.heroImage}
              alt={p.title}
              width={800}
              height={600}
              style={{ width: "100%", height: "auto", objectFit: "cover" }}
            />
          )}
          <span>{p.title}</span>
        </Link>
      ))}
    </section>
  );
}
```

(Use the exact class names found in `HomeGrid.module.css`; if the grid/tile classes are named differently, substitute them. The `Link` href object form matches next-intl typed routes; if the project route isn't typed, use `href={`/project/${p.slug}`}`.)

- [ ] **Step 2: Portfolio index (album cards + filterable grid).**

```tsx
// src/app/[locale]/portfolio/page.tsx
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import {
  getAlbums,
  getAlbumCovers,
  getProjectsByAlbum,
  getPublicProjects,
} from "@/lib/content";
import { AlbumGrid } from "@/components/portfolio/AlbumGrid";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ album?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { album } = await searchParams;
  const [albums, covers] = await Promise.all([
    getAlbums(locale),
    getAlbumCovers(),
  ]);
  const projects = album
    ? await getProjectsByAlbum(album, locale)
    : await getPublicProjects(locale, 60);

  return (
    <main
      style={{ padding: "40px 24px 120px", maxWidth: 1200, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>
        {locale === "ka" ? "პორტფოლიო" : "Portfolio"}
      </h1>

      {/* Album index cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {albums.map((a) => (
          <Link
            key={a.slug}
            href={{ pathname: "/album/[slug]", params: { slug: a.slug } }}
            style={{ display: "block" }}
          >
            <div
              style={{
                aspectRatio: "4/3",
                background: "#f1f1f1",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {covers[a.slug] && (
                <Image
                  src={covers[a.slug]!}
                  alt={a.name}
                  width={440}
                  height={330}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div style={{ marginTop: 8, fontWeight: 500 }}>{a.name}</div>
          </Link>
        ))}
      </div>

      {/* Filter chips */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}
      >
        <Link
          href="/portfolio"
          style={{
            padding: "6px 12px",
            border: "1px solid #ddd",
            borderRadius: 999,
          }}
        >
          {locale === "ka" ? "ყველა" : "All"}
        </Link>
        {albums.map((a) => (
          <Link
            key={a.slug}
            href={`/portfolio?album=${a.slug}`}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: 999,
            }}
          >
            {a.name}
          </Link>
        ))}
      </div>

      <AlbumGrid projects={projects} />
    </main>
  );
}
```

- [ ] **Step 3: Per-album page.**

```tsx
// src/app/[locale]/album/[slug]/page.tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { getAlbums, getProjectsByAlbum } from "@/lib/content";
import { AlbumGrid } from "@/components/portfolio/AlbumGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const album = (await getAlbums(locale)).find((a) => a.slug === slug);
  return { title: album ? `${album.name} — GOGA Photography` : "Album" };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const albums = await getAlbums(locale);
  const album = albums.find((a) => a.slug === slug);
  if (!album) notFound();
  const projects = await getProjectsByAlbum(slug, locale);
  return (
    <main
      style={{ padding: "40px 24px 120px", maxWidth: 1200, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>{album.name}</h1>
      <AlbumGrid projects={projects} />
    </main>
  );
}
```

- [ ] **Step 4: Typecheck (next)** → 0 errors. Commit:

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-next
git add src/components/portfolio "src/app/[locale]/portfolio" "src/app/[locale]/album"
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): public album index, per-album pages, filterable grid"
```

---

### Task 9: Nav link

**Files (next):** Modify `src/components/layout/Menu.tsx` (and/or `Header.tsx`) + `src/messages/en.json`, `src/messages/ka.json`

- [ ] **Step 1:** Read `Menu.tsx` to learn how nav items + i18n labels are rendered (likely `useTranslations` + `Link` from `@/i18n/navigation`). Add a "Portfolio" item linking to `/portfolio`, mirroring an existing item (e.g. the Services/About link). Add the label key to both message files under the same namespace the menu uses (e.g. `"nav": { "portfolio": "Portfolio" }` in en.json, `"პორტფოლიო"` in ka.json) — match the existing key shape exactly.

- [ ] **Step 2: Typecheck (next)** → 0 errors. Commit:

```bash
git add src/components/layout src/messages/en.json src/messages/ka.json
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(portfolio): add Portfolio to site nav"
```

---

## Phase 4 — Verify & deploy

### Task 10: bf verify + deploy

- [ ] **Step 1: Unit + build (bf)** — `cd gogaphotography-bf && pnpm vitest run tests/unit/portfolio-albums.test.ts && NODE_OPTIONS=--max-old-space-size=2048 pnpm build` → tests pass; `/app/projects/albums` route present.
- [ ] **Step 2: Live smoke (bf dev)** — start dev; `/app/projects/albums` → 307 (gated); open a project in `/app/projects/[id]`, confirm album checkboxes render and saving persists (re-open shows them checked).
- [ ] **Step 3: Deploy (bf)**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
git checkout master && git merge feat/portfolio-albums --no-edit && git push origin master
vercel --prod --yes --token "$(security find-generic-password -s vercel-api-token -w)"
```

### Task 11: next verify + deploy

- [ ] **Step 1: Build (next)** — `cd gogaphotography-next && pnpm build` → success; routes `/[locale]/portfolio` and `/[locale]/album/[slug]` present.
- [ ] **Step 2: Live smoke (next dev)** — start next dev (note its port from `package.json` dev script); check `/en/portfolio` (album cards + chips + grid), `/en/portfolio?album=bride` (filtered), `/en/album/bride` (200, grouped), and the same for `/ka/...`.
- [ ] **Step 3: Deploy (next)**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-next
git checkout main 2>/dev/null || git checkout master
git merge feat/portfolio-albums --no-edit && git push origin HEAD
vercel --prod --yes --token "$(security find-generic-password -s vercel-api-token -w)"
```

(Confirm next's default branch name — `main` or `master` — before merging.)

- [ ] **Step 4: Verify prod** — next production `/en/portfolio` and `/en/album/bride` return 200 and show the albums; bf `/app/projects/albums` gated.

---

## Self-Review

**Spec coverage:**

- `portfolio_albums` + `project_albums` + seed 14 → Task 1 ✓
- bf types → Task 2 ✓
- album queries + many-to-many assignment → Task 3 ✓
- project-form album multi-select + save on create/update → Task 4 ✓
- albums admin (rename/reorder) → Task 5 ✓
- restructure existing (assign demo projects) → Task 6 ✓
- next content helpers (`getAlbums`/`getProjectsByAlbum`/`getAlbumCovers`) → Task 7 ✓
- public album index + per-album pages + filterable grid → Task 8 ✓
- Portfolio nav (localized) → Task 9 ✓
- testing (vitest pure helper + build/smoke both repos) → Tasks 3, 10, 11 ✓
- out-of-scope (no photo import, no per-image tagging, fixed 14) honored ✓

**Placeholder scan:** No TBD/TODO. "Read the file to learn X then mirror" steps (Tasks 4/8/9) are explicit integration instructions with the concrete code to insert + a named fallback — not placeholders. They exist because the next repo's exact CSS-module class names and the bf form component's prop names must match existing code.

**Type consistency:** `PortfolioAlbumRow`/`ProjectAlbumRow` consistent (Tasks 2,3,4). `albumLinkRows`/`listAlbums`/`getProjectAlbumIds`/`setProjectAlbums`/`updateAlbum` consistent (Tasks 3,4,5). next: `PublicAlbum`/`getAlbums`/`getProjectsByAlbum`/`getAlbumCovers`/`PublicProject` consistent (Tasks 7,8). `AlbumGrid({projects})` consistent (Task 8). Album slugs in Task 6 SQL match the seed slugs in Task 1.

**Cross-repo note:** the migration (Task 1) must run before next's queries return data, but next code (Tasks 7-9) is independent of it at build time. bf and next are committed/deployed on their own branches; next's default branch must be confirmed (Task 11).
