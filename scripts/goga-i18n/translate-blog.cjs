// Georgian -> English/Russian for the blog, via Vertex AI Gemini.
//
// The _en columns were filled by copying the Georgian, so an English visitor
// reads Georgian on all 65 posts. This rewrites them properly.
//
// Resumable and idempotent: every finished post is appended to a checkpoint
// file keyed by id+lang, and a re-run skips what is already there. A crash
// costs the post in flight, nothing else. Nothing is written to the database
// here - output lands in a JSON file that a separate, reviewable step applies.
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = env.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const SB = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const creds = JSON.parse(Buffer.from(get("GCP_SA_JSON_B64"), "base64").toString());
const LOC = get("GCP_LOCATION") || "us-central1";
const { GoogleAuth } = require(path.resolve("node_modules/.pnpm/google-auth-library@10.6.2/node_modules/google-auth-library"));

const OUT = ".gg/scratch/blog-translations.json";
const LIMIT = Number(process.argv[2] || 0);        // 0 = all
const LANGS = (process.argv[3] || "en,ru").split(",");

const GEO = /[\u10A0-\u10FF]/;
const PROMPT = (lang, field, text) => `You are translating a Georgian wedding-photography blog for a professional studio's website.

Translate the ${field} below from Georgian into ${lang === "en" ? "English" : "Russian"}.

Rules:
- Output ONLY the translation. No preamble, no notes, no quotes around it.
- Preserve markdown exactly: headings, lists, links, bold, line breaks, blank lines.
- Keep brand names, people's names and place names as they are normally written in ${lang === "en" ? "English" : "Russian"} (GOGA PHOTOGRAPHY stays GOGA PHOTOGRAPHY).
- Keep it natural and idiomatic for a reader browsing a photographer's website, not literal.
- Do not add or remove content.

${field}:
${text}`;

(async () => {
  const auth = new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const url = `https://${LOC}-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/${LOC}/publishers/google/models/gemini-2.5-flash:generateContent`;

  async function gen(text, lang, field, tries = 0) {
    const t = await client.getAccessToken();
    const r = await fetch(url, { method: "POST",
      headers: { Authorization: "Bearer " + t.token, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT(lang, field, text) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } }) });
    if (!r.ok) {
      if (tries < 3) { await new Promise((s) => setTimeout(s, 2000 * (tries + 1))); return gen(text, lang, field, tries + 1); }
      throw new Error(`vertex ${r.status}: ${(await r.text()).slice(0, 120)}`);
    }
    const j = await r.json();
    const out = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) {
      if (tries < 3) { await new Promise((s) => setTimeout(s, 2000)); return gen(text, lang, field, tries + 1); }
      throw new Error("empty response: " + JSON.stringify(j).slice(0, 160));
    }
    return out.trim();
  }

  const res = await fetch(SB + "/rest/v1/blog_posts?select=id,slug,title_ka,excerpt_ka,body_ka&status=eq.published&order=published_at.desc", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
  let posts = await res.json();
  if (LIMIT) posts = posts.slice(0, LIMIT);

  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  let n = 0, skipped = 0;
  for (const p of posts) {
    for (const lang of LANGS) {
      const key = `${p.id}:${lang}`;
      if (done[key]) { skipped++; continue; }
      const rec = { slug: p.slug };
      for (const [field, label] of [["title", "blog post title"], ["excerpt", "blog post summary"], ["body", "blog post body (markdown)"]]) {
        const src = p[field + "_ka"];
        if (!src || !src.trim()) { rec[field] = ""; continue; }
        rec[field] = await gen(src, lang, label, 0);
      }
      // Reject anything that still carries Georgian script or collapsed to a stub.
      // Judge by how much Georgian is LEFT, not whether any survives. Bodies
      // are WordPress HTML and carry Georgian inside alt text, image file
      // names and titles that a translator is right to leave alone - one
      // rejected post had 36 Georgian characters in 15,194, i.e. 99.8%
      // translated, and was thrown away by a test for "any". Compare against
      // the source instead: a real failure echoes the original back and keeps
      // most of its Georgian.
      const geoCount = (s) => (String(s || "").match(/[Ⴀ-ჿ]/g) || []).length;
      const srcGeo = geoCount(p.body_ka);
      const outGeo = geoCount(rec.body);
      const bad = [];
      if (GEO.test(rec.title)) bad.push("title still Georgian");
      if (srcGeo && outGeo > srcGeo * 0.15)
        bad.push(`body still Georgian (${outGeo}/${srcGeo} chars remain)`);
      // A truncated answer is a different failure and stays a hard reject.
      if (p.body_ka && rec.body.length < p.body_ka.length * 0.25) bad.push(`body too short (${rec.body.length} vs ${p.body_ka.length})`);
      if (bad.length) { console.log(`  ! ${p.slug} [${lang}] REJECTED: ${bad.join(", ")}`); continue; }
      done[key] = rec;
      fs.writeFileSync(OUT, JSON.stringify(done, null, 1));   // checkpoint every post
      n++;
      console.log(`  ${String(n).padStart(3)} ${lang} ${p.slug.slice(0, 44)} (${rec.body.length} chars)`);
    }
  }
  console.log(`\ntranslated ${n}, skipped ${skipped} already done, total in file: ${Object.keys(done).length}`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
