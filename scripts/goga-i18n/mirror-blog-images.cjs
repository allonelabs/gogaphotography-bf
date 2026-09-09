// Mirror WordPress-hosted blog images into Supabase storage and rewrite the
// post bodies to point at them.
//
// Every blog body embeds images from goga.photography/wp-content/uploads - the
// old WordPress box. Those URLs 200 today only because the domain still points
// there; the moment DNS moves to Vercel they 403 and every picture inside every
// post breaks. The covers are already on Supabase, so this is the last thing
// tying the blog to the old host.
//
// Safe by construction:
//   - dry run by default; --apply is required to write anything
//   - downloads and uploads first, database rewrite only after every image for
//     that post is confirmed stored
//   - upsert on a content-hashed path, so a re-run overwrites the same object
//     instead of duplicating, and interrupting it costs nothing
//   - a post is rewritten in one update, and only if all of its images resolved
const fs = require("fs");
const crypto = require("crypto");

const APPLY = process.argv.includes("--apply");
const env = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = env.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const SB = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: "Bearer " + KEY };
const BUCKET = "projects";
const PREFIX = "blog-body";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

async function mirror(url, cache) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = (r.headers.get("content-type") || "").split(";")[0];
  const ext = EXT[ct] || (url.match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
  // Content hash: identical bytes reuse one object, and a re-run is a no-op.
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
  const path = `${PREFIX}/${hash}.${ext}`;
  const publicUrl = `${SB}/storage/v1/object/public/${BUCKET}/${path}`;
  if (APPLY) {
    const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...H, "Content-Type": ct || "image/jpeg", "x-upsert": "true" },
      body: buf,
    });
    if (!up.ok && up.status !== 409) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 90)}`);
  }
  cache.set(url, publicUrl);
  return publicUrl;
}

(async () => {
  // _ru only exists once goga_0010 has been applied. Asking for a column that
  // is not there makes PostgREST reject the whole query, so discover first and
  // mirror whichever language columns this database actually has.
  const probe = await fetch(SB + "/rest/v1/blog_posts?select=*&limit=1", { headers: H });
  const sample = await probe.json();
  const BODIES = ["body_ka", "body_en", "body_ru"].filter((c) => sample[0] && c in sample[0]);
  console.log("body columns present:", BODIES.join(", "));
  const res = await fetch(SB + "/rest/v1/blog_posts?select=id,slug," + BODIES.join(","), { headers: H });
  const posts = await res.json();
  if (!Array.isArray(posts)) throw new Error("fetch failed: " + JSON.stringify(posts).slice(0, 140));
  const cache = new Map();
  let touched = 0, images = 0, failed = 0;

  for (const p of posts) {
    const fields = BODIES.filter((f) => p[f]);
    const urls = new Set();
    for (const f of fields)
      for (const m of String(p[f]).matchAll(/https?:\/\/goga\.photography\/wp-content\/uploads\/[^\s"'<>,)]+/g)) urls.add(m[0]);
    if (!urls.size) continue;

    const map = new Map();
    let ok = true;
    for (const u of urls) {
      try { map.set(u, await mirror(u, cache)); images++; }
      catch (e) { console.log(`  ! ${p.slug}: ${u.slice(-42)} -> ${e.message}`); failed++; ok = false; }
    }
    if (!ok) { console.log(`  skipping ${p.slug} - not all images stored`); continue; }

    const patch = {};
    for (const f of fields) {
      let s = String(p[f]);
      for (const [from, to] of map) s = s.split(from).join(to);
      if (s !== p[f]) patch[f] = s;
    }
    if (!Object.keys(patch).length) continue;
    if (APPLY) {
      const u = await fetch(`${SB}/rest/v1/blog_posts?id=eq.${p.id}`, {
        method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!u.ok) { console.log(`  ! ${p.slug}: update ${u.status}`); failed++; continue; }
    }
    touched++;
    console.log(`  ${APPLY ? "rewrote" : "would rewrite"} ${p.slug.slice(0, 40)} (${urls.size} images, fields: ${Object.keys(patch).join(",")})`);
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"}: ${touched} posts, ${images} image copies, ${cache.size} distinct, ${failed} failures`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
