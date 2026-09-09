// Write the generated blog translations into Supabase.
//
// Reads .gg/scratch/blog-translations.json (produced by translate.cjs) and
// fills title/excerpt/body for _en and _ru. The _en columns currently hold
// copies of the Georgian, which is the bug being fixed; _ru needs
// goga_0010_russian.sql applied first.
//
// Dry run by default; --apply writes. Each post is one PATCH, so a failure
// affects that post alone, and re-running is idempotent - the same values are
// written again. Every record is re-checked for leftover Georgian before it
// goes anywhere near the database.
const fs = require("fs");
const APPLY = process.argv.includes("--apply");
const env = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = env.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const SB = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: "Bearer " + KEY };
const GEO = /[\u10A0-\u10FF]/;

(async () => {
  const t = JSON.parse(fs.readFileSync(".gg/scratch/blog-translations.json", "utf8"));
  const probe = await fetch(SB + "/rest/v1/blog_posts?select=*&limit=1", { headers: H });
  const cols = Object.keys((await probe.json())[0] || {});
  const hasRu = cols.includes("title_ru");
  console.log("columns:", hasRu ? "_ru present" : "_ru MISSING - run goga_0010 first; only _en will be written");

  // Group by post id so one PATCH carries both languages.
  const byPost = new Map();
  for (const [key, rec] of Object.entries(t)) {
    const [id, lang] = key.split(":");
    if (lang === "ru" && !hasRu) continue;
    const bad = ["title", "excerpt", "body"].filter((f) => GEO.test(rec[f] || ""));
    if (bad.length) { console.log(`  ! skip ${rec.slug} [${lang}] - Georgian left in ${bad.join(",")}`); continue; }
    const patch = byPost.get(id) || { slug: rec.slug, patch: {} };
    for (const f of ["title", "excerpt", "body"]) if (rec[f]) patch.patch[`${f}_${lang}`] = rec[f];
    byPost.set(id, patch);
  }

  let ok = 0, failed = 0;
  for (const [id, { slug, patch }] of byPost) {
    if (!Object.keys(patch).length) continue;
    if (APPLY) {
      const r = await fetch(`${SB}/rest/v1/blog_posts?id=eq.${id}`, {
        method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch) });
      if (!r.ok) { console.log(`  ! ${slug}: ${r.status} ${(await r.text()).slice(0, 80)}`); failed++; continue; }
    }
    ok++;
    console.log(`  ${APPLY ? "wrote" : "would write"} ${slug.slice(0, 42)} [${Object.keys(patch).join(",")}]`);
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"}: ${ok} posts, ${failed} failures`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
