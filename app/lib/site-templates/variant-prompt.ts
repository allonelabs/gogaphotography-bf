// LLM prompt + parser for the 3-layer VariantSpec.
//
// One Gemini call returns picks + params + decorations + content. Parser
// validates each layer independently. Failed fields fall back to defaults;
// the spawn never breaks because the LLM emitted partial garbage.

import {
  PICK_OPTIONS,
  type VariantSpec,
  type VariantPicks,
  type SiteContent,
} from "./schema";
import { fallbackContent, parseSiteContent } from "../site-renderer";
import { sanitizeParams, validateDecorations } from "./_variants/validators";
import { listPresetIds } from "./_variants/decoration-presets";
import type { BrandIdentity } from "./schema-bridge";

const enumLine = <K extends keyof typeof PICK_OPTIONS>(k: K) =>
  `"${k}": one of [${PICK_OPTIONS[k].map((v: string) => `"${v}"`).join(", ")}]`;

export const VARIANT_SYSTEM_PROMPT = `You are a senior brand-aware web designer. For the business below, produce ONE JSON object with four top-level keys: "picks", "params", "decorations", "content".

LAYER 1 — picks (object, all required, enum strings):
- ${enumLine("template")}
- ${enumLine("layout")}
- ${enumLine("hero")}
- ${enumLine("heroPhotoStyle")}
- ${enumLine("palette")}
- ${enumLine("background")}
- ${enumLine("fonts")}
- ${enumLine("sectionOrder")}
- ${enumLine("density")}
- ${enumLine("motion")}
- ${enumLine("cta")}
- ${enumLine("radius")}
- ${enumLine("imageFx")}
- ${enumLine("typeScale")}
- ${enumLine("logoPos")}
- ${enumLine("navStyle")}
- ${enumLine("footerStyle")}
- ${enumLine("hoverEffect")}
- ${enumLine("dividers")}
- ${enumLine("heroOverlay")}
- ${enumLine("wordmarkStyle")}

Guidance for picks (prior beliefs — break when business warrants):
- Premium / luxury / craft → fonts=editorial-serif|display-serif, palette=earth|mono-ink|jewel, density=luxe|spacious, motion=subtle-fade, hero=photo-fullbleed|typography-only, typeScale=luxurious, cta=underline|text-arrow, radius=sharp
- Tech / B2B SaaS → fonts=swiss-grotesk|neo-grotesk|mono-led, palette=cool-tech|mono-ink, background=dot-grid|none, hero=typography-only|abstract-gradient|product-isolate, motion=scroll-stagger, cta=pill|square, radius=soft-12
- Consumer / DTC / lifestyle → fonts=rounded-friendly|humanist, palette=warm-paper|pastel, hero=photo-split|product-isolate, motion=hover-tilt, radius=pill, imageFx=tinted|none
- Editorial / agency / creative → fonts=editorial-serif|classical|display-serif, layout=asymmetric|editorial-grid, hero=photo-fullbleed|illustration, motion=parallax-hero|scroll-stagger, imageFx=film|grayscale
- Restaurant / hospitality → fonts=display-serif|classical|humanist, palette=earth|warm-paper|jewel, hero=photo-fullbleed, imageFx=film, motion=subtle-fade

LAYER 2 — params (object, ALL keys optional, but emit them — they make the site feel intentional):
- "accentColor": hex (e.g. "#9B2A1F") — your call for THIS business; must contrast against paper. Pick a color that means something for the brand, not just a generic blue.
- "inkColor": hex — body text color; must be high contrast.
- "paperColor": hex — page background.
- "bgGradientStops": [hex, hex] or [hex, hex, hex] — only used when background=gradient-mesh.
- "heroImagePrompt": one detailed paragraph (50-800 chars) telling Gemini what photo to make for this business. Specify subject, setting, lighting, lens, mood. NO text overlay.
- "heroNegativePrompt": optional, what to avoid (e.g. "text, watermarks, busy backgrounds").
- "customLabels": object — overrides for section headings. Match the brand voice. Example: {"features":"The Craft","pricing":"Editions","faq":"Curiosities"}. Each ≤ 50 chars.
- "featureIcons": array of 6 short marks, one per feature. STRICTLY NO EMOJI (no 📊 🧠 ⚡ ⏱️ 📈 💡 ⭐ ✨ 🚀 etc — they will be stripped). Use ONE of these styles consistently: (a) two-digit numerals 01..06, (b) geometric glyphs ◆ ◇ ○ ● ◐ ◑ ▲ ▽, (c) single capital letters A..F. Pick a style that matches the brand voice and stay in that style for all six.
- "taglineSuperline": small kicker above hero h1, ≤ 30 chars (e.g. "EST 2024" or "ISSUE 01" or business name).
- "quoteMark": one of ["\\"","❝","//","—","«"] — testimonial opener.
- "dividerStyle": one of ["wave","dot-row","single-line","double-line","none"].

LAYER 3 — decorations (array, 0-5 items, sandboxed SVG):
Each item: { "section": one of ["hero","features","pricing","faq","cta","footer"], "anchor": one of ["top-left","top-right","bottom-left","bottom-right","center"], "preset" OR "svg", "opacity": 0.05-1, "scale": 0.3-3 }.

PREFERRED — use a "preset" id from this library (validators auto-resolve scale):
${listPresetIds()
  .map((id) => `  - "${id}"`)
  .join("\n")}

FALLBACK — only when no preset fits, author "svg" as inner SVG (no outer <svg> tag, renderer wraps in viewBox="-100 -100 200 200"). Allowed tags: g, circle, rect, path, line, polyline, polygon, ellipse, text, tspan, defs, pattern, linearGradient, radialGradient, stop. No script, no event handlers, no url(), no <image href>. Keep each under 2 KB.

These are tiny brand fingerprints — pick presets that match the brand voice (orbits-* for premium/scientific, wave-* for organic/wellness, asterisk-bold for editorial, bracket-corner for utilitarian).

LAYER 4 — content (object):
{
  "tagline": string ≤ 80 chars, sharp positioning line (NOT a sentence),
  "subhead": string ≤ 200 chars, one clear sentence,
  "primaryCta": string ≤ 18 chars,
  "secondaryCta": string ≤ 18 chars,
  "features": [{ "title": ≤40, "description": ≤140 }] EXACTLY 6,
  "pricing": [{ "name", "price", "period", "description"≤80, "features": [string,...] (4-6), "cta", "highlighted": bool }] EXACTLY 3 (middle highlighted),
  "faq": [{ "q"≤100, "a"≤280 }] EXACTLY 6,
  "about": { "heading"≤60, "body": 400-600 chars in 3 paragraphs (\\n\\n separated), "mission"≤200 },
  "contact": { "email": realistic support email, "blurb"≤200 },
  "testimonials": [{ "quote"≤200, "author", "role" }] EXACTLY 3,
  "footer": { "tagline"≤80 }
}

Rules across all layers:
- Concrete > abstract. "Cut invoice prep from 2h to 8min" beats "Save time on invoices."
- No clichés: avoid revolutionize / synergy / seamless / cutting-edge / world-class / next-generation.
- Match the actual brand archetype + voice listed in the brief.
- Return ONLY the JSON. No prose, no code fences, no comments.

VERTICAL COPY PLAYBOOK — pick the rule set that matches your chosen \`template\` and write copy in that voice. Do NOT mix verticals. A bakery never says "real-time analytics"; a SaaS never says "free shipping over $80".

walkby-ecom — DTC fashion / apparel / accessories / streetwear / drops:
- Pricing: 3 PRODUCT prices (e.g. "$48", "$128", "$295"), period: "" (empty string — no "/month"). "name" = product or collection name (e.g. "Field Pouch", "Travel Bag"). "features" = up to 5 product facts (fabric, origin, size, edition, weight). "cta" = "Add to bag" or "See more".
- Features: textile/origin/sizing/edition facts. "100% Japanese selvedge", "Made in Porto", "Limited to 250", "Care: cold wash".
- FAQ: returns policy, sizing, materials, ship times, restock alerts.
- Tagline: object-led, possessive ("Carry less.", "The shirt you reach for first").
- CTAs: "Shop now", "See lookbook", "Add to bag", "Get notified".

afisha-hotel — hotel / villa / retreat / boutique stay / spa:
- Pricing: 3 ROOM tiers with NIGHTLY rates ("$240", "$480", "$1,200"), period: "/night". "name" = room type ("Garden Room", "Sea Suite", "Founder's Villa"). "features" = amenities (view, bath, breakfast, bed size, capacity, terrace). "cta" = "Reserve".
- Features: rooms, dining, location, services. "12 rooms only", "Breakfast on the terrace", "10-minute walk to the harbour", "Spa with cold plunge".
- FAQ: check-in, cancellation, pets, kids, what's included, transfers.
- Tagline: place-led ("Three rooms by the sea", "Where the road ends, the garden begins").
- CTAs: "Reserve", "See rooms", "Plan your stay".

equivalenza-retail — perfume / cosmetics / candles / apothecary:
- Pricing: 3 sizes or collections ("$35", "$58", "$95"), period: "" or "/ 50ml". "name" = collection or size name ("Discovery 5ml", "Eau 50ml", "Parfum 100ml"). "features" = ingredient/notes/format facts ("Top: bergamot, fig", "Heart: jasmine", "Base: oud, cedar", "Vegan", "Made in Grasse"). "cta" = "Add" or "Order".
- Features: olfactory profile, ingredients, format, provenance. Never "API access".
- FAQ: samples, longevity, ingredients, returns on opened, packaging.
- Tagline: sensory ("Scent as memory", "What softness remembers").
- CTAs: "Smell at home", "Discover", "Order".

utopia-portfolio — creative agency / studio / motion / branding:
- Pricing: 3 SERVICE tiers with project ranges ("$25k+", "$60k+", "$150k+"), period: "/ engagement" or "". "name" = service name ("Brand", "Web", "Film"). "features" = deliverables (logo + guidelines, 5-page site, 60-sec film, art direction). "cta" = "Start a project".
- Features: capabilities (Brand identity, Art direction, Motion, Web, Photography). Not products.
- FAQ: engagement model, timeline, IP ownership, what's included, payment.
- Tagline: poetic / declarative ("We make brands move", "Work that earns the second look").
- CTAs: "See work", "Start a project", "Get in touch".

qualige-edu — education / course / school / bootcamp:
- Pricing: 3 COURSE tiers or formats ("$0 / audit", "$249", "$1,499"), period: "" or "/ course" or "/ cohort". "name" = format ("Self-paced", "Cohort", "1:1 Mentorship"). "features" = curriculum chunks (24 lessons, weekly office hours, project review, certificate, alumni network).
- Features: learning outcomes ("Ship 4 production projects", "Weekly live reviews", "Lifetime access").
- FAQ: prerequisites, time commitment, schedule, certificate, refund.
- Tagline: outcome-led ("Learn to ship", "From zero to your first deploy").
- CTAs: "Enroll", "Start free", "See curriculum".

vercel-saas — B2B SaaS / dev tools / API / infra:
- Pricing: 3 SaaS tiers ("$29", "$99", "$299"), period: "/month". "name" = "Starter / Team / Scale" or similar. "features" = product capability bullets.
- Features: capabilities, integrations, scale. Workflow language is fine.
- FAQ: trial, data export, API, security, SSO, support SLAs.
- Tagline: outcome / product ("Workflows that ship", "The data layer for X").
- CTAs: "Get started", "Try free", "Book a demo".`;

export function buildVariantUserMessage(
  name: string,
  paragraph: string,
  aesthetic: string,
  identity: BrandIdentity,
): string {
  const voiceLine = identity.voice ? `Voice: ${identity.voice}` : "";
  const doLine =
    identity.do && identity.do.length > 0
      ? `Do: ${identity.do.join("; ")}`
      : "";
  const dontLine =
    identity.doNot && identity.doNot.length > 0
      ? `Don't: ${identity.doNot.join("; ")}`
      : "";
  const archetypeLine = identity.archetype
    ? `Archetype: ${identity.archetype}`
    : "";
  return [
    `Business: ${name}`,
    `Aesthetic: ${aesthetic}`,
    archetypeLine,
    voiceLine,
    doLine,
    dontLine,
    `Brief: ${paragraph}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Parser ──────────────────────────────────────────────────────────────

function pickOrDefault<K extends keyof typeof PICK_OPTIONS>(
  input: unknown,
  key: K,
  fallback: (typeof PICK_OPTIONS)[K][number],
): (typeof PICK_OPTIONS)[K][number] {
  if (typeof input !== "string") return fallback;
  const options: readonly string[] = PICK_OPTIONS[key];
  return (
    options.includes(input) ? input : fallback
  ) as (typeof PICK_OPTIONS)[K][number];
}

const DEFAULT_PICKS: VariantPicks = {
  template: "vercel-saas",
  layout: "centered",
  hero: "typography-only",
  heroPhotoStyle: "cinematic",
  palette: "mono-ink",
  background: "subtle-grain",
  fonts: "swiss-grotesk",
  sectionOrder: "classic",
  density: "balanced",
  motion: "subtle-fade",
  cta: "pill",
  radius: "soft-12",
  imageFx: "none",
  typeScale: "balanced",
  logoPos: "top-left",
  navStyle: "minimal-flat",
  footerStyle: "compact",
  hoverEffect: "color-swap",
  dividers: "thin-line",
  featuresStyle: "grid-card",
  pricingStyle: "cards",
  testimonialsStyle: "cards",
  heroOverlay: "medium",
  wordmarkStyle: "plain",
  headerScroll: "sticky",
  linkStyle: "underline-on-hover",
  accentEmphasis: "balanced",
  selectStyle: "accent",
  focusRingStyle: "accent",
  scrollIndicator: "none",
  cardElevation: "soft",
  inputStyle: "minimal",
  badgeStyle: "pill-soft",
  imageBorderRadius: "soft",
};

function parsePicks(input: unknown): VariantPicks {
  if (!input || typeof input !== "object") return DEFAULT_PICKS;
  const o = input as Record<string, unknown>;
  return {
    template: pickOrDefault(o["template"], "template", DEFAULT_PICKS.template),
    layout: pickOrDefault(o["layout"], "layout", DEFAULT_PICKS.layout),
    hero: pickOrDefault(o["hero"], "hero", DEFAULT_PICKS.hero),
    heroPhotoStyle: pickOrDefault(
      o["heroPhotoStyle"],
      "heroPhotoStyle",
      DEFAULT_PICKS.heroPhotoStyle,
    ),
    palette: pickOrDefault(o["palette"], "palette", DEFAULT_PICKS.palette),
    background: pickOrDefault(
      o["background"],
      "background",
      DEFAULT_PICKS.background,
    ),
    fonts: pickOrDefault(o["fonts"], "fonts", DEFAULT_PICKS.fonts),
    sectionOrder: pickOrDefault(
      o["sectionOrder"],
      "sectionOrder",
      DEFAULT_PICKS.sectionOrder,
    ),
    density: pickOrDefault(o["density"], "density", DEFAULT_PICKS.density),
    motion: pickOrDefault(o["motion"], "motion", DEFAULT_PICKS.motion),
    cta: pickOrDefault(o["cta"], "cta", DEFAULT_PICKS.cta),
    radius: pickOrDefault(o["radius"], "radius", DEFAULT_PICKS.radius),
    imageFx: pickOrDefault(o["imageFx"], "imageFx", DEFAULT_PICKS.imageFx),
    typeScale: pickOrDefault(
      o["typeScale"],
      "typeScale",
      DEFAULT_PICKS.typeScale,
    ),
    logoPos: pickOrDefault(o["logoPos"], "logoPos", DEFAULT_PICKS.logoPos),
    navStyle: pickOrDefault(o["navStyle"], "navStyle", DEFAULT_PICKS.navStyle),
    footerStyle: pickOrDefault(
      o["footerStyle"],
      "footerStyle",
      DEFAULT_PICKS.footerStyle,
    ),
    hoverEffect: pickOrDefault(
      o["hoverEffect"],
      "hoverEffect",
      DEFAULT_PICKS.hoverEffect,
    ),
    dividers: pickOrDefault(o["dividers"], "dividers", DEFAULT_PICKS.dividers),
    featuresStyle: pickOrDefault(
      o["featuresStyle"],
      "featuresStyle",
      DEFAULT_PICKS.featuresStyle,
    ),
    pricingStyle: pickOrDefault(
      o["pricingStyle"],
      "pricingStyle",
      DEFAULT_PICKS.pricingStyle,
    ),
    testimonialsStyle: pickOrDefault(
      o["testimonialsStyle"],
      "testimonialsStyle",
      DEFAULT_PICKS.testimonialsStyle,
    ),
    heroOverlay: pickOrDefault(
      o["heroOverlay"],
      "heroOverlay",
      DEFAULT_PICKS.heroOverlay ?? "medium",
    ),
    wordmarkStyle: pickOrDefault(
      o["wordmarkStyle"],
      "wordmarkStyle",
      DEFAULT_PICKS.wordmarkStyle ?? "plain",
    ),
    headerScroll: pickOrDefault(
      o["headerScroll"],
      "headerScroll",
      DEFAULT_PICKS.headerScroll ?? "sticky",
    ),
    linkStyle: pickOrDefault(
      o["linkStyle"],
      "linkStyle",
      DEFAULT_PICKS.linkStyle ?? "underline-on-hover",
    ),
    accentEmphasis: pickOrDefault(
      o["accentEmphasis"],
      "accentEmphasis",
      DEFAULT_PICKS.accentEmphasis ?? "balanced",
    ),
    selectStyle: pickOrDefault(
      o["selectStyle"],
      "selectStyle",
      DEFAULT_PICKS.selectStyle ?? "accent",
    ),
    focusRingStyle: pickOrDefault(
      o["focusRingStyle"],
      "focusRingStyle",
      DEFAULT_PICKS.focusRingStyle ?? "accent",
    ),
    scrollIndicator: pickOrDefault(
      o["scrollIndicator"],
      "scrollIndicator",
      DEFAULT_PICKS.scrollIndicator ?? "none",
    ),
    cardElevation: pickOrDefault(
      o["cardElevation"],
      "cardElevation",
      DEFAULT_PICKS.cardElevation ?? "soft",
    ),
    inputStyle: pickOrDefault(
      o["inputStyle"],
      "inputStyle",
      DEFAULT_PICKS.inputStyle ?? "minimal",
    ),
    badgeStyle: pickOrDefault(
      o["badgeStyle"],
      "badgeStyle",
      DEFAULT_PICKS.badgeStyle ?? "pill-soft",
    ),
    imageBorderRadius: pickOrDefault(
      o["imageBorderRadius"],
      "imageBorderRadius",
      DEFAULT_PICKS.imageBorderRadius ?? "soft",
    ),
  };
}

function extractBalancedJson(raw: string): string | null {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fence && fence[1]) text = fence[1].trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  return text.slice(start, end + 1);
}

export interface VariantParseResult {
  spec: VariantSpec;
  /** Which layers came back valid (the rest are defaults). */
  llmAuthored: {
    picks: boolean;
    params: boolean;
    decorations: boolean;
    content: boolean;
  };
}

/**
 * Parse the full VariantSpec JSON from a raw LLM string.
 *
 * Each layer falls back independently — if the LLM omits decorations,
 * we use []; if it omits content, we fall back to fallbackContent.
 */
export function parseVariantSpec(
  raw: string,
  businessName: string,
  paragraph: string,
): VariantParseResult {
  const sliced = extractBalancedJson(raw);
  let obj: Record<string, unknown> = {};
  if (sliced) {
    try {
      obj = JSON.parse(sliced) as Record<string, unknown>;
    } catch {
      obj = {};
    }
  }
  const picks = parsePicks(obj["picks"]);
  const params = sanitizeParams(obj["params"], "#ffffff"); // paper-validation happens again in renderer with real paper
  const decorations = validateDecorations(obj["decorations"]);
  // content: re-use the existing SiteContent parser shape; if parse fails, fallback.
  let content: SiteContent | null = null;
  if (obj["content"]) {
    const c = parseSiteContent(JSON.stringify(obj["content"]));
    if (c) content = c;
  }
  if (!content) content = fallbackContent(businessName, paragraph);

  return {
    spec: { picks, params, decorations, content },
    llmAuthored: {
      picks: !!obj["picks"],
      params: !!obj["params"],
      decorations:
        Array.isArray(obj["decorations"]) &&
        (obj["decorations"] as unknown[]).length > 0,
      content: !!obj["content"],
    },
  };
}

/** Build a default VariantSpec from just a business name (used when LLM unavailable). */
export function defaultVariantSpec(
  businessName: string,
  paragraph: string,
): VariantSpec {
  return {
    picks: DEFAULT_PICKS,
    params: {},
    decorations: [],
    content: fallbackContent(businessName, paragraph),
  };
}
