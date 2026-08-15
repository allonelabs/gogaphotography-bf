// Backfill _thumb.webp for storage originals uploaded before the admin
// started generating them (app/lib/goga/thumbs.ts).
//
// Run from the bf clone so it picks up sharp + the pulled service key:
//   node scripts/backfill-thumbs.mjs          # report only
//   node scripts/backfill-thumbs.mjs --write  # generate + upload
//
// Also prints an aspect-ratio map for the homepage album, which the static
// site uses to reserve tile height before the image loads.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WRITE = process.argv.includes("--write");
const GALLERY_W = 900;
const COVER_W = 760;
const BUCKET = "projects";

function loadEnv(file) {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [
            l.slice(0, i).trim(),
            l
              .slice(i + 1)
              .trim()
              .replace(/^["']|["']$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnv(".env.local"), ...loadEnv(".env.pulled") };
const URL_BASE = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const thumbPathFor = (p) => `${p.replace(/\.[a-z0-9]+$/i, "")}_thumb.webp`;
const publicUrl = (p) =>
  `${URL_BASE}/storage/v1/object/public/${BUCKET}/${p
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

async function rest(q) {
  const r = await fetch(`${URL_BASE}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function exists(p) {
  const r = await fetch(publicUrl(p), { method: "HEAD" });
  return r.ok;
}

async function putThumb(p, buf) {
  const r = await fetch(
    `${URL_BASE}/storage/v1/object/${BUCKET}/${p
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        ...H,
        "Content-Type": "image/webp",
        "Cache-Control": "31536000",
        "x-upsert": "true",
      },
      body: buf,
    },
  );
  if (!r.ok) throw new Error(`upload ${p} -> ${r.status} ${await r.text()}`);
}

async function main() {
  // Every original the site can ask for a thumb of.
  const images = await rest(
    "project_images?select=image_path,project_id&order=sort_order",
  );
  const posts = await rest(
    "blog_posts?select=slug,cover_image_path&cover_image_path=not.is.null",
  );

  const targets = [
    ...images
      .filter((r) => r.image_path)
      .map((r) => ({ p: r.image_path, w: GALLERY_W, kind: "gallery" })),
    ...posts
      .filter((r) => r.cover_image_path)
      .map((r) => ({ p: r.cover_image_path, w: COVER_W, kind: "cover" })),
  ];

  console.log(
    `checking ${targets.length} originals (${images.length} gallery, ${posts.length} covers)`,
  );

  const missing = [];
  for (const t of targets) {
    if (!(await exists(thumbPathFor(t.p)))) missing.push(t);
  }
  console.log(`missing thumbs: ${missing.length}`);
  for (const m of missing) console.log(`  [${m.kind}] ${m.p}`);

  if (!missing.length) return;
  if (!WRITE) {
    console.log("\n(dry run — pass --write to generate)");
    return;
  }

  const dims = {};
  let ok = 0;
  for (const m of missing) {
    try {
      const res = await fetch(publicUrl(m.p));
      if (!res.ok) throw new Error(`fetch original ${res.status}`);
      const src = Buffer.from(await res.arrayBuffer());
      const pipeline = sharp(src).rotate();
      const meta = await pipeline.metadata();
      const out = await pipeline
        .resize({ width: m.w, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      await putThumb(thumbPathFor(m.p), out);
      if (meta.width && meta.height) dims[m.p] = +(meta.width / meta.height).toFixed(4);
      ok += 1;
      console.log(
        `  ok ${path.basename(m.p)}  ${(src.length / 1024) | 0}KB -> ${(out.length / 1024) | 0}KB`,
      );
    } catch (e) {
      console.error(`  FAIL ${m.p}: ${e.message}`);
    }
  }
  console.log(`\ngenerated ${ok}/${missing.length}`);
  if (Object.keys(dims).length) {
    const f = "D:/claude-scratch/backfilled-dims.json";
    fs.writeFileSync(f, JSON.stringify(dims, null, 2));
    console.log(`aspect ratios written to ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
