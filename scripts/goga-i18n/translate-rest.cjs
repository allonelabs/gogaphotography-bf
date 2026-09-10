// Russian for everything the blog script did not cover: the about and FAQ
// pages, project titles and descriptions, portfolio album names, and package
// names. Roughly 6.5k characters in total, against the blog's million - small
// enough to do in one pass with no checkpointing.
//
// Albums and project titles are short labels (Bride, Awards, Best of the Day),
// so they are sent as a single batch with one line each rather than 20 separate
// requests. The long-form page bodies go one at a time to keep their markup.
//
// Dry run by default; --apply writes.
const fs = require("fs");
const path = require("path");
const APPLY = process.argv.includes("--apply");
const env = fs.readFileSync(".env.pulled", "utf8").split("\n");
const get = (k) => { const l = env.find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim().replace(/^"|"$/g, "") : null; };
const SB = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: "Bearer " + KEY };
const creds = JSON.parse(Buffer.from(get("GCP_SA_JSON_B64"), "base64").toString());
const LOC = get("GCP_LOCATION") || "us-central1";
const { GoogleAuth } = require(path.resolve("node_modules/.pnpm/google-auth-library@10.6.2/node_modules/google-auth-library"));
const GEO = /[\u10A0-\u10FF]/;

(async () => {
  const auth = new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const url = `https://${LOC}-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/${LOC}/publishers/google/models/gemini-2.5-flash:generateContent`;
  async function gen(prompt, tries = 0) {
    const t = await client.getAccessToken();
    const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + t.token, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } }) });
    if (!r.ok) { if (tries < 3) { await new Promise((s) => setTimeout(s, 2000 * (tries + 1))); return gen(prompt, tries + 1); } throw new Error("vertex " + r.status); }
    const j = await r.json();
    const out = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) { if (tries < 3) return gen(prompt, tries + 1); throw new Error("empty"); }
    return out.trim();
  }
  const one = (src, what) => gen(`Translate this ${what} for a professional wedding photographer's website from Georgian into Russian.
Output ONLY the translation - no preamble, no quotes. Preserve any HTML or markdown exactly. Keep brand names as they are. Natural and idiomatic, not literal.

${src}`);

  async function patch(table, id, body, key = "id") {
    if (!APPLY) return;
    const r = await fetch(`${SB}/rest/v1/${table}?${key}=eq.${id}`, { method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${table} ${id}: ${r.status} ${(await r.text()).slice(0, 80)}`);
  }

  // --- pages: long form, one request per field ---
  for (const p of await (await fetch(SB + "/rest/v1/pages?select=slug,title_ka,body_ka", { headers: H })).json()) {
    const body = {};
    if (p.title_ka) body.title_ru = await one(p.title_ka, "page title");
    if (p.body_ka) body.body_ru = await one(p.body_ka, "page body");
    await patch("pages", p.slug, body, "slug");
    console.log(`  ${APPLY ? "wrote" : "would write"} pages/${p.slug}: ${String(body.title_ru).slice(0, 44)}`);
  }

  // --- short labels: one batched request each table ---
  for (const [table, field] of [["portfolio_albums", "name"], ["projects", "title"], ["packages", "name"]]) {
    const rows = await (await fetch(`${SB}/rest/v1/${table}?select=id,${field}_ka`, { headers: H })).json();
    const list = rows.filter((r) => r[field + "_ka"]);
    if (!list.length) continue;
    const numbered = list.map((r, i) => `${i + 1}. ${r[field + "_ka"]}`).join("\n");
    const out = await gen(`Translate each numbered line from Georgian into Russian. These are short labels on a wedding photographer's website (gallery categories, project names).
Output ONLY the numbered translations, one per line, same numbering, nothing else.

${numbered}`);
    const got = out.split("\n").map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
    if (got.length !== list.length) { console.log(`  ! ${table}: got ${got.length} lines for ${list.length} rows - skipping`); continue; }
    for (let i = 0; i < list.length; i++) {
      if (GEO.test(got[i])) { console.log(`  ! ${table}[${i}] still Georgian - skipped`); continue; }
      await patch(table, list[i].id, { [field + "_ru"]: got[i] });
    }
    console.log(`  ${APPLY ? "wrote" : "would write"} ${table}: ${got.length} labels (${got.slice(0, 3).join(", ")}...)`);
  }

  // --- project descriptions ---
  for (const p of await (await fetch(SB + "/rest/v1/projects?select=id,slug,description_ka,location_ka", { headers: H })).json()) {
    const body = {};
    if (p.description_ka) body.description_ru = await one(p.description_ka, "project description");
    if (p.location_ka) body.location_ru = await one(p.location_ka, "location name");
    if (!Object.keys(body).length) continue;
    await patch("projects", p.id, body);
    console.log(`  ${APPLY ? "wrote" : "would write"} projects/${p.slug} description+location`);
  }

  // --- package short descriptions and deliverables ---
  for (const p of await (await fetch(SB + "/rest/v1/packages?select=id,slug,short_desc_ka,deliverables_ka", { headers: H })).json()) {
    const body = {};
    if (p.short_desc_ka) body.short_desc_ru = await one(p.short_desc_ka, "package description");
    if (p.deliverables_ka) body.deliverables_ru = await one(p.deliverables_ka, "package deliverables list");
    if (!Object.keys(body).length) continue;
    await patch("packages", p.id, body);
    console.log(`  ${APPLY ? "wrote" : "would write"} packages/${p.slug} desc+deliverables`);
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} complete`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
