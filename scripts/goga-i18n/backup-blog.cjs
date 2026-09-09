// Snapshot every blog_posts row before any translation write. These are 65
// published posts on a live site; the _en columns currently hold copies of the
// Georgian, so nothing of value is at risk, but a restore path has to exist
// before the first UPDATE, not after it.
const fs = require("fs");
const lines = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = lines.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const base = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
(async () => {
  const r = await fetch(base + "/rest/v1/blog_posts?select=*", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
  if (!r.ok) throw new Error("fetch failed " + r.status);
  const rows = await r.json();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = `.gg/backups/blog_posts-${stamp}.json`;
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log("backed up", rows.length, "rows ->", out);
  console.log("bytes:", fs.statSync(out).size);
  // Prove the backup is readable and complete before anything is written.
  const back = JSON.parse(fs.readFileSync(out, "utf8"));
  console.log("verify: reparsed", back.length, "rows,", back.filter((x) => x.id && x.body_ka).length, "with id+body_ka");
})();
