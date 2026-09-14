// Last mile after mirror-blog-images.cjs: remove the handful of old-WordPress
// image URLs that could not be mirrored because they are already 404 on that
// host. They are dead now and stay dead after DNS moves, so there is nothing
// to rescue - the markup referencing them is what has to go.
//
// Two shapes, handled differently:
//   - <img src> pointing at a dead URL: the whole enclosing <figure> goes,
//     caption included. A figcaption without its image is orphaned text.
//   - a srcset candidate: only that candidate is dropped, leaving the other
//     widths. The <img src> itself is already on Supabase in these cases.
//     (The sanitizer strips srcset today, so these are invisible - but they
//     are still wrong in the data, and one config change makes them visible.)
//
// Safe by construction:
//   - dry run by default; --apply is required to write anything
//   - every candidate URL is re-fetched and must return a hard 404 before it
//     is touched, so a live image is never removed on a bad network day
//   - patches one row at a time by id, and only fields that actually changed
//   - refuses to write a body whose <figure> tags no longer balance
const fs = require("fs");

const APPLY = process.argv.includes("--apply");
const env = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = env.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const SB = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: "Bearer " + KEY };
const DEAD = /https?:\/\/goga\.photography\/wp-content\/uploads\/[^\s"'<>,)]+/g;

const count = (s, re) => (s.match(re) || []).length;

/** Remove the <figure> wrapping a dead <img src>, caption and all. */
function dropFigure(body, url) {
  const at = body.indexOf(url);
  if (at === -1) return body;
  const open = body.lastIndexOf("<figure", at);
  if (open === -1) return body;
  // Walk nested <figure> pairs so a gallery wrapper is not cut in half.
  let depth = 0, i = open;
  while (i < body.length) {
    const nextOpen = body.indexOf("<figure", i + 1);
    const nextClose = body.indexOf("</figure>", i + 1);
    if (nextClose === -1) return body;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen; continue; }
    if (depth === 0) return body.slice(0, open) + body.slice(nextClose + "</figure>".length);
    depth--; i = nextClose;
  }
  return body;
}

/** Drop one candidate (URL + its descriptor) from every srcset it appears in. */
function dropSrcsetCandidate(body, url) {
  return body.replace(/srcset="([^"]*)"/g, (whole, list) => {
    if (!list.includes(url)) return whole;
    const kept = list
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith(url));
    return kept.length ? `srcset="${kept.join(", ")}"` : "";
  });
}

(async () => {
  const probe = await (await fetch(SB + "/rest/v1/blog_posts?select=*&limit=1", { headers: H })).json();
  const BODIES = ["body_ka", "body_en", "body_ru"].filter((c) => probe[0] && c in probe[0]);
  const posts = await (await fetch(SB + "/rest/v1/blog_posts?select=id,slug," + BODIES.join(","), { headers: H })).json();
  if (!Array.isArray(posts)) throw new Error("fetch failed: " + JSON.stringify(posts).slice(0, 140));

  // Confirm each URL is genuinely dead before removing anything that cites it.
  const urls = new Set();
  for (const p of posts) for (const f of BODIES) for (const m of String(p[f] || "").matchAll(DEAD)) urls.add(m[0]);
  const dead = new Set();
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: "follow" });
      if (r.status === 404) dead.add(u);
      else console.log(`  keeping (HTTP ${r.status}, not dead): ${u.slice(-56)}`);
    } catch (e) {
      console.log(`  keeping (unreachable, ${e.message}): ${u.slice(-56)}`);
    }
  }
  console.log(`${urls.size} old-host URLs, ${dead.size} confirmed 404\n`);

  let touched = 0, figures = 0, candidates = 0;
  for (const p of posts) {
    const patch = {};
    for (const f of BODIES) {
      let s = String(p[f] || "");
      if (!s) continue;
      const before = s;
      for (const u of dead) {
        while (new RegExp(`<img[^>]*src="${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(s)) {
          s = dropFigure(s, u);
          figures++;
        }
        if (s.includes(u)) { s = dropSrcsetCandidate(s, u); candidates++; }
      }
      if (s === before) continue;
      if (count(s, /<figure/g) !== count(s, /<\/figure>/g)) {
        console.log(`  ! ${p.slug} ${f}: figure tags would not balance - skipped`);
        continue;
      }
      patch[f] = s;
      console.log(`  ${p.slug.slice(0, 38).padEnd(40)} ${f}  -${before.length - s.length} bytes, ${count(s, DEAD)} old-host refs left`);
    }
    if (!Object.keys(patch).length) continue;
    if (APPLY) {
      const u = await fetch(`${SB}/rest/v1/blog_posts?id=eq.${p.id}`, {
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!u.ok) { console.log(`  ! ${p.slug}: update ${u.status} ${(await u.text()).slice(0, 80)}`); continue; }
    }
    touched++;
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"}: ${touched} posts, ${figures} figures removed, ${candidates} srcset candidates dropped`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
