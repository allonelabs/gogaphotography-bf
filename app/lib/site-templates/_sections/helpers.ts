// Helpers shared across every section renderer.

import type { Decoration, DecorationSection, RenderContext } from "../schema";

export function esc(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );
}

/** Resolve a custom label (params.customLabels) or fall back to the default. */
export function label(
  ctx: RenderContext,
  key: keyof NonNullable<RenderContext["params"]["customLabels"]>,
  fallback: string,
): string {
  return ctx.params.customLabels?.[key] ?? fallback;
}

const ANCHOR_STYLE: Record<string, string> = {
  "top-left": "top:24px;left:24px",
  "top-right": "top:24px;right:24px",
  "bottom-left": "bottom:24px;left:24px",
  "bottom-right": "bottom:24px;right:24px",
  center: "top:50%;left:50%;transform:translate(-50%,-50%)",
};

/**
 * Render any decorations targeted at this section, positioned at their anchor.
 * Returns a string ready to inject inside a relatively-positioned container.
 */
export function renderDecorationsForSection(
  decorations: Decoration[],
  section: DecorationSection,
): string {
  const matches = decorations.filter((d) => d.section === section);
  if (matches.length === 0) return "";
  return matches
    .map((d) => {
      const pos = ANCHOR_STYLE[d.anchor] ?? ANCHOR_STYLE["top-right"];
      const size = (d.scale ?? 1) * 120;
      const opacity = d.opacity ?? 0.6;
      return `<svg viewBox="-100 -100 200 200" width="${size}" height="${size}" style="position:absolute;${pos};opacity:${opacity};pointer-events:none;color:currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d.svg}</svg>`;
    })
    .join("");
}

/** A section wrapper that supports decorations and an optional `muted` background. */
export function sectionWrap(opts: {
  id?: string;
  muted?: boolean;
  decorations: string;
  children: string;
}): string {
  const cls = ["relative", opts.muted ? "muted" : ""].filter(Boolean).join(" ");
  return `<section${opts.id ? ` id="${esc(opts.id)}"` : ""} class="${cls}" style="position:relative">
${opts.decorations}
  <div class="wrap">${opts.children}</div>
</section>`;
}

/** Kicker line — the small label that sits above an h1/h2. */
export function kicker(text: string): string {
  return `<span class="kicker">${esc(text)}</span>`;
}

/**
 * Emit the site-wide link-style stylesheet snippet for the picks.linkStyle
 * axis. Concatenated into each template's <style> block so every inline
 * anchor (not .cta, not .logo, not .kicker) honours the operator's choice.
 * 2026-05-14.
 */
export function linkStyleCss(pick: string | undefined): string {
  const style = pick ?? "underline-on-hover";
  // Scope to body anchors that aren't framework chrome. The selector excludes
  // .cta (call-to-action pills), .logo (wordmark), nav links (handled by the
  // nav block), .product-card / .course-card / etc. so the visual treatment
  // applies to inline body links and footer links only.
  const SCOPE =
    "body a:not(.cta):not(.logo):not([class*='-card']):not(.product-card):not([data-no-link-style])";
  if (style === "underline-always") {
    return `\n${SCOPE}{text-decoration:underline;text-underline-offset:0.18em;text-decoration-thickness:1px;transition:text-decoration-color .25s ease, color .25s ease}\n${SCOPE}:hover{text-decoration-color:transparent;color:var(--accent)}\n`;
  }
  if (style === "accent-color") {
    return `\n${SCOPE}{text-decoration:none;transition:color .25s ease}\n${SCOPE}:hover{color:var(--accent)}\n`;
  }
  if (style === "arrow-grow") {
    return `\n${SCOPE}{text-decoration:none;display:inline-flex;align-items:baseline;gap:0.25em;transition:gap .25s ease, color .25s ease}\n${SCOPE}::after{content:'→';display:inline-block;transition:transform .25s ease}\n${SCOPE}:hover{color:var(--accent)}\n${SCOPE}:hover::after{transform:translateX(0.18em)}\n@media (prefers-reduced-motion: reduce){${SCOPE},${SCOPE}::after{transition:none}${SCOPE}:hover::after{transform:none}}\n`;
  }
  if (style === "reverse-underline") {
    return `\n${SCOPE}{text-decoration:underline;text-underline-offset:0.18em;text-decoration-thickness:1px;transition:text-decoration .25s ease, font-weight .25s ease}\n${SCOPE}:hover{text-decoration:none;font-weight:600}\n`;
  }
  // underline-on-hover (default)
  return `\n${SCOPE}{text-decoration:none;background-image:linear-gradient(currentColor,currentColor);background-size:0 1px;background-repeat:no-repeat;background-position:0 1.05em;transition:background-size .25s ease, color .25s ease}\n${SCOPE}:hover{background-size:100% 1px}\n@media (prefers-reduced-motion: reduce){${SCOPE}{transition:none}}\n`;
}

/**
 * Emit the accent-emphasis CSS snippet for the picks.accentEmphasis axis.
 * Overrides --accent-soft (translucent accent fill used in chips, badges,
 * hover wash). vivid mode also adds a slight saturation boost via filter
 * on accent-soft elements.  2026-05-14.
 */
export function accentEmphasisCss(pick: string | undefined): string {
  const v = pick ?? "balanced";
  // The palette layer derives --accent-soft as accent at 8% alpha by default.
  // Re-derive from the literal accent CSS var here so this works regardless
  // of palette pick.  color-mix lets us produce the alpha mix cleanly.
  if (v === "subtle") {
    return `\n:root{--accent-soft:color-mix(in srgb, var(--accent) 5%, transparent)}\n`;
  }
  if (v === "bold") {
    return `\n:root{--accent-soft:color-mix(in srgb, var(--accent) 18%, transparent)}\n`;
  }
  if (v === "vivid") {
    return `\n:root{--accent-soft:color-mix(in srgb, var(--accent) 28%, transparent)}\n[style*="background:var(--accent-soft)"],[style*="background-color:var(--accent-soft)"]{filter:saturate(1.12)}\n`;
  }
  // balanced (default)
  return `\n:root{--accent-soft:color-mix(in srgb, var(--accent) 10%, transparent)}\n`;
}

/**
 * Emit the site-wide ::selection CSS for the picks.selectStyle axis.
 * Sets both `::selection` and the Firefox-specific `::-moz-selection`.
 * 2026-05-14.
 */
export function selectStyleCss(pick: string | undefined): string {
  const v = pick ?? "accent";
  const rule = (bg: string, fg: string) =>
    `\n::selection{background:${bg};color:${fg}}\n::-moz-selection{background:${bg};color:${fg}}\n`;
  if (v === "accent-soft")
    return rule(
      "color-mix(in srgb, var(--accent) 25%, transparent)",
      "var(--ink)",
    );
  if (v === "ink") return rule("var(--ink)", "var(--paper)");
  if (v === "minimal")
    return rule("color-mix(in srgb, var(--ink) 8%, transparent)", "inherit");
  // accent (default)
  return rule("var(--accent)", "var(--paper)");
}

/**
 * Emit site-wide :focus-visible CSS for the picks.focusRingStyle axis.
 * Targets interactive elements (input/select/textarea/button/a/[tabindex])
 * and removes the default outline in favour of the styled ring.
 * 2026-05-14.
 */
export function focusRingStyleCss(pick: string | undefined): string {
  const v = pick ?? "accent";
  const SCOPE =
    'input,select,textarea,button,a,[tabindex]:not([tabindex="-1"])';
  const reset = `\n${SCOPE}:focus{outline:none}\n`;
  if (v === "accent-soft") {
    return (
      reset +
      `${SCOPE}:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent)}\n`
    );
  }
  if (v === "ink") {
    return (
      reset +
      `${SCOPE}:focus-visible{outline:2px solid var(--ink);outline-offset:2px}\n`
    );
  }
  if (v === "glow") {
    return (
      reset +
      `${SCOPE}:focus-visible{outline:none;box-shadow:0 0 0 2px var(--accent),0 0 16px 0 color-mix(in srgb, var(--accent) 45%, transparent)}\n`
    );
  }
  // accent (default)
  return (
    reset +
    `${SCOPE}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n`
  );
}

/**
 * Emit the top-of-viewport scroll progress bar for picks.scrollIndicator.
 * Uses CSS scroll-driven animations on `html::before` (no JS, no DOM
 * injection).  Browsers without `animation-timeline: scroll()` support
 * gracefully render the bar at scaleX(0) — invisible, no-op. 2026-05-14.
 */
export function scrollIndicatorCss(pick: string | undefined): string {
  const v = pick ?? "none";
  if (v === "none") return "";
  const base = `
html::before{content:"";position:fixed;top:0;left:0;height:3px;width:100%;background:var(--accent);transform-origin:0 50%;transform:scaleX(0);z-index:9999;pointer-events:none;animation:bf-scroll-progress linear;animation-timeline:scroll(root block);will-change:transform}
@keyframes bf-scroll-progress{to{transform:scaleX(1)}}
`;
  if (v === "line") return base;
  if (v === "glow") {
    return (
      base +
      `
html::before{height:3px;box-shadow:0 0 12px 0 color-mix(in srgb, var(--accent) 65%, transparent)}
`
    );
  }
  // soft-track
  return (
    base +
    `
html::after{content:"";position:fixed;top:0;left:0;height:1px;width:100%;background:color-mix(in srgb, var(--accent) 18%, transparent);z-index:9998;pointer-events:none}
html::before{height:2px;top:0}
`
  );
}

/**
 * Emit site-wide card depth CSS for picks.cardElevation.  Targets every
 * element with a `-card` class token (product-card, pricing-card,
 * feature-card, course-card, etc), the testimonial cards, and the
 * pricing tiers' card variants.  Hover-aware: floating/layered modes
 * lift on hover with a translate + tightened shadow.  2026-05-15.
 */
export function cardElevationCss(pick: string | undefined): string {
  const v = pick ?? "soft";
  const SCOPE =
    "[class*='-card'],.feature-card,.product-card,.pricing-card,.course-card,.tier-card,.testimonial-card";
  if (v === "flat") {
    return `\n${SCOPE}{box-shadow:none}\n`;
  }
  if (v === "soft") {
    return `\n${SCOPE}{box-shadow:0 1px 2px rgba(0,0,0,0.04),0 2px 8px rgba(0,0,0,0.04);transition:box-shadow .25s ease,transform .25s ease}\n`;
  }
  if (v === "floating") {
    return `\n${SCOPE}{box-shadow:0 4px 12px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.05);transition:box-shadow .25s ease,transform .25s ease}\n${SCOPE}:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,0,0,0.08),0 14px 32px rgba(0,0,0,0.07)}\n@media (prefers-reduced-motion: reduce){${SCOPE},${SCOPE}:hover{transition:none;transform:none}}\n`;
  }
  // layered
  return `\n${SCOPE}{box-shadow:0 1px 0 rgba(0,0,0,0.03),0 2px 6px rgba(0,0,0,0.04),0 8px 20px rgba(0,0,0,0.05),0 16px 40px rgba(0,0,0,0.04);transition:box-shadow .25s ease,transform .25s ease}\n${SCOPE}:hover{transform:translateY(-3px);box-shadow:0 2px 0 rgba(0,0,0,0.04),0 4px 10px rgba(0,0,0,0.06),0 12px 28px rgba(0,0,0,0.07),0 24px 56px rgba(0,0,0,0.06)}\n@media (prefers-reduced-motion: reduce){${SCOPE},${SCOPE}:hover{transition:none;transform:none}}\n`;
}

/**
 * Emit site-wide form-input styling for picks.inputStyle.  Targets
 * text/email/tel/number/url/password/search inputs plus textarea and
 * select.  Excludes [data-no-input-style] for escape-hatch cases.
 * 2026-05-15.
 */
export function inputStyleCss(pick: string | undefined): string {
  const v = pick ?? "minimal";
  const SCOPE =
    "input[type='text']:not([data-no-input-style]),input[type='email']:not([data-no-input-style]),input[type='tel']:not([data-no-input-style]),input[type='number']:not([data-no-input-style]),input[type='url']:not([data-no-input-style]),input[type='password']:not([data-no-input-style]),input[type='search']:not([data-no-input-style]),input:not([type]):not([data-no-input-style]),textarea:not([data-no-input-style]),select:not([data-no-input-style])";
  const baseReset = `\n${SCOPE}{background:transparent;color:var(--ink);font:inherit;width:100%;box-sizing:border-box}\n${SCOPE}::placeholder{color:color-mix(in srgb, var(--ink) 45%, transparent)}\n`;
  if (v === "boxed") {
    return (
      baseReset +
      `${SCOPE}{border:1px solid color-mix(in srgb, var(--ink) 18%, transparent);border-radius:0.5rem;padding:0.625rem 0.875rem;transition:border-color .2s ease,box-shadow .2s ease}\n${SCOPE}:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)}\n`
    );
  }
  if (v === "filled") {
    return (
      baseReset +
      `${SCOPE}{background:color-mix(in srgb, var(--ink) 5%, transparent);border:1px solid transparent;border-radius:0.5rem;padding:0.625rem 0.875rem;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease}\n${SCOPE}:hover{background:color-mix(in srgb, var(--ink) 7%, transparent)}\n${SCOPE}:focus{outline:none;background:color-mix(in srgb, var(--ink) 4%, transparent);border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)}\n`
    );
  }
  if (v === "underline-bold") {
    return (
      baseReset +
      `${SCOPE}{border:none;border-bottom:2px solid color-mix(in srgb, var(--ink) 30%, transparent);border-radius:0;padding:0.625rem 0.125rem;transition:border-color .2s ease}\n${SCOPE}:focus{outline:none;border-bottom-color:var(--accent)}\n`
    );
  }
  // minimal (default)
  return (
    baseReset +
    `${SCOPE}{border:none;border-bottom:1px solid color-mix(in srgb, var(--ink) 18%, transparent);border-radius:0;padding:0.5rem 0.125rem;transition:border-color .2s ease}\n${SCOPE}:focus{outline:none;border-bottom-color:var(--accent)}\n`
  );
}

/**
 * Emit site-wide CSS for `.badge` / `.chip` / `[class*='-badge']` /
 * `[class*='-chip']` per picks.badgeStyle.  Covers the standalone
 * <span class="badge"> elements used by hero kickers, "New" tags,
 * pricing "Most popular" highlights, and retail category chips.
 * Uses inline-flex so badges align cleanly inside flex/grid rows.
 * 2026-05-15.
 */
export function badgeStyleCss(pick: string | undefined): string {
  const v = pick ?? "pill-soft";
  const SCOPE =
    ".badge,[class*='-badge'],.chip,[class*='-chip']:not([class*='-card']):not([class*='-chip-button'])";
  const base = `\n${SCOPE}{display:inline-flex;align-items:center;gap:0.4em;font-size:0.75rem;font-weight:500;line-height:1;letter-spacing:0.02em;white-space:nowrap}\n`;
  if (v === "square-outline") {
    return (
      base +
      `${SCOPE}{padding:0.35rem 0.6rem;border:1px solid color-mix(in srgb, var(--accent) 45%, transparent);border-radius:0.375rem;background:transparent;color:var(--accent)}\n`
    );
  }
  if (v === "dot-prefix") {
    return (
      base +
      `${SCOPE}{padding:0;border:none;background:transparent;color:var(--ink)}\n${SCOPE}::before{content:"";display:inline-block;width:0.5em;height:0.5em;border-radius:50%;background:var(--accent);flex:0 0 auto}\n`
    );
  }
  if (v === "accent-block") {
    return (
      base +
      `${SCOPE}{padding:0.35rem 0.7rem;border-radius:0.25rem;background:var(--accent);color:var(--ink-on-accent, var(--paper));border:none}\n`
    );
  }
  // pill-soft (default)
  return (
    base +
    `${SCOPE}{padding:0.35rem 0.75rem;border-radius:9999px;background:var(--accent-soft);color:var(--accent);border:none}\n`
  );
}

/**
 * Sanitize and emit the operator-authored free-form CSS escape hatch.
 * Lives in params.customCss and runs LAST, so it overrides every other
 * style helper. Strips obvious injection vectors: <script>, @import,
 * javascript:/data: URIs, expression(), and length-caps at 16k chars.
 * 2026-05-15.
 */
export function customCssOverride(css: string | undefined): string {
  if (!css) return "";
  let s = String(css).slice(0, 16_000);
  // Strip <style> / <script> tag wrappers (in case the LLM included them)
  s = s.replace(/<\/?(script|style)[^>]*>/gi, "");
  // Strip dangerous patterns
  if (/@import|expression\(|javascript:|data:text\/html/i.test(s)) {
    s = s
      .replace(/@import[^;]*;?/gi, "")
      .replace(/expression\([^)]*\)/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/data:text\/html[^,]*,?[^"')\s]*/gi, "");
  }
  return `\n/* operator-authored override */\n${s}\n`;
}

/**
 * Emit site-wide corner-radius CSS for picks.imageBorderRadius.  Targets
 * content `<img>` and `<picture> img` while excluding logos / icons /
 * decorative SVGs via [class*=] negation and a `[data-no-radius]`
 * escape-hatch.  Per-component CSS still wins on specificity.
 * 2026-05-15.
 */
export function imageBorderRadiusCss(pick: string | undefined): string {
  const v = pick ?? "soft";
  const SCOPE =
    "img:not([class*='logo']):not([class*='icon']):not([class*='avatar']):not([data-no-radius]),picture img:not([data-no-radius])";
  let radius = "8px";
  if (v === "sharp") radius = "0";
  else if (v === "rounded") radius = "16px";
  else if (v === "pill") radius = "9999px";
  return `\n${SCOPE}{border-radius:${radius}}\n`;
}
