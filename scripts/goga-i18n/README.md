# Blog translation and image mirror

One-shot tooling for two problems on the Goga blog, both found in the live data
rather than the code.

**The English columns hold Georgian.** All 65 published posts have `title_en`,
`excerpt_en` and `body_en` byte-identical to their `_ka` counterparts - they
were filled by copying, so `pick(ka, en, ru)` correctly asks for English and
correctly gets Georgian. No front-end change can fix that.

**The images live on the old host.** Post bodies embed 337 images from
`goga.photography/wp-content/uploads/`. Those resolve today only because the
domain still points at the old WordPress box; they 403 on Vercel, so pointing
DNS at the new site breaks every picture inside every post. Cover images are
already on Supabase and are unaffected.

## Order matters

Translations are generated from the current bodies, which still contain the
WordPress URLs. Mirroring first and applying translations second would put those
URLs straight back. So:

```
node scripts/goga-i18n/backup-blog.cjs             # snapshot all rows first
node scripts/goga-i18n/translate-blog.cjs 0 en,ru  # writes a JSON file only
#   -- apply supabase/migrations/goga_0010_russian.sql before the next step --
node scripts/goga-i18n/apply-translations.cjs --apply
node scripts/goga-i18n/mirror-blog-images.cjs --apply
```

Then put the `_ru` columns back into the `select=` lists in the site's `api/`
handlers - they were removed because PostgREST rejects an entire query for one
unknown column, which 502'd every endpoint.

## Safety

- Both writing scripts are **dry run by default**; `--apply` is required.
- `translate-blog.cjs` checkpoints after every post and skips finished work on a
  re-run, so a crash costs the post in flight. A re-run also retries anything
  the validator rejected.
- Translations that come back still containing Georgian script, or with a body
  under a quarter of the original length, are discarded rather than written.
- Images are stored under a content hash and uploaded with upsert, so re-running
  overwrites the same object instead of duplicating; a post's body is only
  rewritten once every one of its images is confirmed stored.
- Credentials come from `.env.pulled` (gitignored) - `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `GCP_SA_JSON_B64`, `GCP_LOCATION`.
