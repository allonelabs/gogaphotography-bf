// Validators for Layer 2 (free-roam params) and Layer 3 (SVG decorations).
//
// Every validator is fail-safe: invalid input returns null (or a sanitized
// fallback). The renderer treats null as "use the picked default". This
// means LLM can never break the page by emitting garbage in a free-roam
// slot — the worst it can do is land in the default code path.

import { contrastRatio } from "./palettes";
import { resolvePreset } from "./decoration-presets";
import type {
  Decoration,
  DecorationAnchor,
  DecorationSection,
  VariantParams,
} from "../schema";

// ── Hex color ───────────────────────────────────────────────────────────

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function validateHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return HEX_RE.test(trimmed) ? trimmed : null;
}

/** Hex + WCAG contrast ≥ minRatio against the given background. */
export function validateAccentAgainstPaper(
  hex: unknown,
  paper: string,
  minRatio = 3.0,
): string | null {
  const h = validateHex(hex);
  if (!h) return null;
  return contrastRatio(h, paper) >= minRatio ? h : null;
}

/** Hex + ≥4.5 contrast — for body text candidates. */
export function validateInkAgainstPaper(
  hex: unknown,
  paper: string,
): string | null {
  const h = validateHex(hex);
  if (!h) return null;
  return contrastRatio(h, paper) >= 4.5 ? h : null;
}

// ── Gradient stops ──────────────────────────────────────────────────────

export function validateGradientStops(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const stops = input
    .map(validateHex)
    .filter((v): v is string => v !== null)
    .slice(0, 4);
  return stops.length >= 2 ? stops : null;
}

// ── Free-text slots (length cap + html strip) ──────────────────────────

const ALLOWED_LABEL_CHAR = /^[\p{L}\p{N}\s\-—:'.&,/]+$/u;

export function validateLabel(input: unknown, maxLen = 50): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  if (!ALLOWED_LABEL_CHAR.test(trimmed)) return null;
  // No HTML.
  if (/[<>]/.test(trimmed)) return null;
  return trimmed;
}

export function validateCustomLabels(
  input: unknown,
): VariantParams["customLabels"] {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of [
    "features",
    "pricing",
    "faq",
    "testimonials",
    "about",
    "contact",
    "cta",
  ] as const) {
    const v = validateLabel(obj[key]);
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0
    ? (out as VariantParams["customLabels"])
    : undefined;
}

// ── Feature icons ───────────────────────────────────────────────────────

// Strip emoji (graphical Extended_Pictographic codepoints) plus the ZWJ and
// variation-selector glue that keeps multi-codepoint emoji sequences together.
// User feedback 2026-05-14: chat rendered 📊/🧠/⚡/⏱️/📈/💡 on the home page
// feature grid and the operator asked us to remove them.  Operator
// directive — never emit emoji glyphs in featureIcons.
const EMOJI_RE = /\p{Extended_Pictographic}|️|‍/gu;

export function validateFeatureIcons(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const icons = input
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.replace(EMOJI_RE, "").trim())
    .filter((s) => s.length >= 1 && s.length <= 4 && !/[<>]/.test(s))
    .slice(0, 8);
  return icons.length > 0 ? icons : null;
}

// ── Gemini prompts ──────────────────────────────────────────────────────

const BANNED_PROMPT_TERMS =
  /\b(nude|nsfw|gore|violence|kill|weapon|drug|explicit|sexual|child)\b/i;

export function validatePrompt(
  input: unknown,
  min = 30,
  max = 800,
): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  if (BANNED_PROMPT_TERMS.test(trimmed)) return null;
  return trimmed;
}

// ── Decorations (sandboxed SVG) ─────────────────────────────────────────

const ALLOWED_SVG_TAGS = new Set([
  "g",
  "circle",
  "rect",
  "path",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "text",
  "tspan",
  "defs",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
]);
const ALLOWED_DEC_SECTIONS = new Set<DecorationSection>([
  "hero",
  "features",
  "pricing",
  "faq",
  "cta",
  "footer",
]);
const ALLOWED_DEC_ANCHORS = new Set<DecorationAnchor>([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
]);

const TAG_RE = /<\/?\s*([a-zA-Z][\w-]*)\b[^>]*>/g;

export function validateDecorationSvg(svg: unknown): string | null {
  if (typeof svg !== "string") return null;
  const s = svg.trim();
  if (s.length === 0 || s.length > 2048) return null;
  // Reject any script-ish or event-handler content.
  if (
    /<\s*(script|foreignObject|iframe|object|embed|use|image|animate)\b/i.test(
      s,
    )
  )
    return null;
  if (/\bon[a-z]+\s*=/i.test(s)) return null;
  if (/javascript:/i.test(s)) return null;
  if (/url\(/i.test(s)) return null;
  // Every tag found must be in the allowlist.
  let match: RegExpExecArray | null;
  const re = new RegExp(TAG_RE.source, "g");
  while ((match = re.exec(s)) !== null) {
    const tag = (match[1] ?? "").toLowerCase();
    if (!ALLOWED_SVG_TAGS.has(tag)) return null;
  }
  return s;
}

export function validateDecorations(
  input: unknown,
  maxItems = 5,
): Decoration[] {
  if (!Array.isArray(input)) return [];
  const out: Decoration[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const section =
      typeof obj["section"] === "string"
        ? (obj["section"] as DecorationSection)
        : null;
    const anchor =
      typeof obj["anchor"] === "string"
        ? (obj["anchor"] as DecorationAnchor)
        : null;
    if (!section || !anchor) continue;
    if (!ALLOWED_DEC_SECTIONS.has(section)) continue;
    if (!ALLOWED_DEC_ANCHORS.has(anchor)) continue;
    // Resolve preset first (preferred path); fall through to validated free-roam SVG.
    let svg: string | null = null;
    let preset: string | undefined;
    let presetScale: number | undefined;
    if (typeof obj["preset"] === "string") {
      const p = resolvePreset(obj["preset"]);
      if (p) {
        svg = p.svg;
        preset = p.id;
        presetScale = p.scale;
      }
    }
    if (!svg) svg = validateDecorationSvg(obj["svg"]);
    if (!svg) continue;
    const opacity =
      typeof obj["opacity"] === "number"
        ? Math.max(0.05, Math.min(1, obj["opacity"] as number))
        : undefined;
    const scaleInput =
      typeof obj["scale"] === "number"
        ? Math.max(0.3, Math.min(3, obj["scale"] as number))
        : presetScale;
    out.push({ section, anchor, svg, preset, opacity, scale: scaleInput });
    if (out.length >= maxItems) break;
  }
  return out;
}

// ── Whole-params sanitizer (one call from the renderer) ────────────────

export function sanitizeParams(
  rawParams: unknown,
  paper: string,
): VariantParams {
  const p =
    rawParams && typeof rawParams === "object"
      ? (rawParams as Record<string, unknown>)
      : {};
  const out: VariantParams = {};
  const accent = validateAccentAgainstPaper(p["accentColor"], paper);
  if (accent) out.accentColor = accent;
  const ink = validateInkAgainstPaper(p["inkColor"], paper);
  if (ink) out.inkColor = ink;
  const paperOverride = validateHex(p["paperColor"]);
  if (paperOverride) out.paperColor = paperOverride;
  const stops = validateGradientStops(p["bgGradientStops"]);
  if (stops) out.bgGradientStops = stops;
  const heroP = validatePrompt(p["heroImagePrompt"]);
  if (heroP) out.heroImagePrompt = heroP;
  const heroN = validatePrompt(p["heroNegativePrompt"], 5, 400);
  if (heroN) out.heroNegativePrompt = heroN;
  const labels = validateCustomLabels(p["customLabels"]);
  if (labels) out.customLabels = labels;
  const icons = validateFeatureIcons(p["featureIcons"]);
  if (icons) out.featureIcons = icons;
  const superline = validateLabel(p["taglineSuperline"], 30);
  if (superline) out.taglineSuperline = superline;
  if (
    p["quoteMark"] === '"' ||
    p["quoteMark"] === "❝" ||
    p["quoteMark"] === "//" ||
    p["quoteMark"] === "—" ||
    p["quoteMark"] === "«"
  ) {
    out.quoteMark = p["quoteMark"] as VariantParams["quoteMark"];
  }
  if (
    p["dividerStyle"] === "wave" ||
    p["dividerStyle"] === "dot-row" ||
    p["dividerStyle"] === "single-line" ||
    p["dividerStyle"] === "double-line" ||
    p["dividerStyle"] === "none"
  ) {
    out.dividerStyle = p["dividerStyle"] as VariantParams["dividerStyle"];
  }
  // Free-form CSS escape hatch — sanitize obvious injection vectors and
  // cap length. The renderer's customCssOverride() also sanitizes at emit
  // time as a belt-and-braces guard.
  if (typeof p["customCss"] === "string") {
    let s = (p["customCss"] as string).slice(0, 16_000);
    s = s.replace(/<\/?(script|style)[^>]*>/gi, "");
    if (/javascript:|data:text\/html|expression\(|@import/i.test(s)) {
      s = s
        .replace(/@import[^;]*;?/gi, "")
        .replace(/expression\([^)]*\)/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/data:text\/html[^,]*,?[^"')\s]*/gi, "");
    }
    s = s.trim();
    if (s.length > 0) out.customCss = s;
  }
  return out;
}
