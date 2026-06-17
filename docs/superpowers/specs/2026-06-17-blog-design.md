# Blog — Design Spec

**Date:** 2026-06-17
**Project:** gogaphotography-bf
**Sub-project:** B of 4 (Store ✓ → **Blog** → Pinterest → Meta chatbots)
**Status:** Approved design, pre-implementation

## Summary

A bilingual (Georgian + English) blog for the GOGA Photography site: rich
WYSIWYG authoring with in-body image galleries, categories + tags, and SEO
metadata. Posts double as portfolio storytelling and SEO content, and become
the content source for Pinterest (C) and Meta (D) later.

Reuses existing infrastructure:

- `gogaAdmin()` Supabase client + migration convention (`goga_000N_*.sql`)
- Public `projects` storage bucket + `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/<path>` URL pattern
- Admin shell (`AppShell`), server-action CRUD style, slug/parse helpers
- i18n KA/EN dict + language toggle

## Decisions (locked)

| Decision      | Choice                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Languages     | **Bilingual** — KA + EN fields per post                                                                 |
| Authoring     | **Rich WYSIWYG** — TipTap (React/ProseMirror), HTML output                                              |
| Structure     | Posts + **categories + tags**                                                                           |
| Images        | Cover **+ in-body images/galleries**                                                                    |
| Body storage  | Sanitized **HTML** (sanitized on save and on render via `sanitize-html`)                                |
| Public locale | Default **ka**, `?lang=en` / language toggle switches; falls back to other language if a field is empty |

## Data model — new migration `goga_0005_blog.sql`

### `blog_categories`

- `id` (uuid pk), `slug` (unique), `name_ka` (text), `name_en` (text)
- `created_at` (timestamptz default now())

### `blog_tags`

- `id` (uuid pk), `slug` (unique), `name_ka` (text), `name_en` (text)
- `created_at` (timestamptz default now())

### `blog_posts`

- `id` (uuid pk)
- `slug` (text unique)
- `title_ka` (text), `title_en` (text)
- `excerpt_ka` (text), `excerpt_en` (text)
- `body_ka` (text — sanitized HTML), `body_en` (text — sanitized HTML)
- `cover_image_path` (text — public `projects` bucket)
- `category_id` (uuid null, fk → blog_categories on delete set null)
- `status` (text default `'draft'` check in (`'draft'`,`'published'`))
- `published_at` (timestamptz null — display date)
- `created_at`, `updated_at` (timestamptz default now())

### `blog_post_tags`

- `post_id` (uuid fk → blog_posts on delete cascade)
- `tag_id` (uuid fk → blog_tags on delete cascade)
- primary key (`post_id`, `tag_id`)

Indexes: `blog_posts(status, published_at desc)` partial where published;
`blog_posts(category_id)`; `blog_post_tags(tag_id)`.

RLS: anon `select` on `blog_posts` where `status='published'`; anon `select`
on `blog_categories` and `blog_tags` (all rows); orders/writes service-role
only (admin via `requireSession()`).

## Authoring (admin `/app/store`-style under `/app/blog`)

- **`/app/blog`** — post list inside `AppShell` (breadcrumb Catalog/Content →
  Blog), status badge, language indicator, link to edit. "New post" button.
- **`/app/blog/new`** and **`/app/blog/[id]`** — the editor page:
  - KA/EN **tabs**, each with a **TipTap** WYSIWYG body (headings, bold/italic,
    lists, links, blockquote, and an **image** node uploaded to `projects`).
  - Cover image upload, `excerpt_ka`/`excerpt_en` text fields, `slug` (auto from
    title_en/ka with uniqueness loop), category `<select>`, tag multi-select,
    status toggle (draft/published) + `published_at` date input.
  - On submit, body HTML for each language is **sanitized server-side** before
    insert/update.
- **Category & tag management** — minimal CRUD (create/rename/delete) at
  `/app/blog/taxonomy` (or inline sections on the list page).
- Server actions in `app/lib/goga/actions-blog.ts`; reads in
  `app/lib/goga/blog.ts`.

## Public site (locale-aware)

- **`/blog`** — index: grid of published posts (cover, localized title +
  excerpt, category). Filter by `?category=<slug>` and `?tag=<slug>`.
  Reverse-chronological by `published_at` (fallback `created_at`).
- **`/blog/[slug]`** — post detail: cover hero, localized title, rendered
  sanitized body HTML, category + tags, share links (FB/Pinterest/copy).
  `Article` JSON-LD.
- **Locale resolution:** a pure helper `pickLang(post, lang)` returns the KA or
  EN field, falling back to the other when the requested one is empty. `lang`
  derives from `?lang=` query param (then existing locale cookie, default
  `ka`).

## SEO

- `generateMetadata` per post: localized title; meta description from localized
  excerpt; OpenGraph + Twitter card image = cover public URL; canonical
  `/blog/<slug>`.
- `/blog` and each published `/blog/<slug>` added to `app/sitemap.ts` (create if
  absent).
- `Article` structured data (JSON-LD) on the detail page.

## Sanitization

- `app/lib/goga/blog-sanitize.ts` exports `sanitizeBlogHtml(html: string)`:
  allow a safe tag set (`p, h1-h4, strong, em, ul, ol, li, a, blockquote, br,
img, figure, figcaption`), allowed attrs (`a[href,target,rel]`,
  `img[src,alt]`), strip everything else (scripts, event handlers, styles).
  Used on save (both languages) and again on render (defense in depth).

## Testing

- **Vitest:**
  - `sanitizeBlogHtml` strips `<script>`, `onerror=`, `javascript:` hrefs;
    keeps allowed tags/attrs.
  - `pickLang` returns requested language; falls back when empty; handles both
    empty.
  - slug uniqueness helper (suffix increment).
- **Playwright:**
  - `/blog` lists published posts; a draft post is NOT shown.
  - `/blog/[slug]` renders body + has `<title>`/og:image meta.
  - Admin: create post → publish → appears on `/blog`.

## Out of scope (v1 — YAGNI)

- Comments, on-site full-text search, RSS feed, author profiles/bylines,
  related-posts ML, scheduled/automatic publishing (publish is a manual toggle;
  `published_at` is a display date only), post revisions/history.

## Open assumptions

- TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`,
  `@tiptap/extension-link`) and `sanitize-html` are acceptable new dependencies.
- One category per post (nullable); many tags per post.
- Default public language is Georgian; English shown on toggle.
- Cover/in-body images reuse the existing public `projects` bucket under a
  `blog/` path prefix.
