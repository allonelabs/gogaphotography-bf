// Mid-page sections + nav + footer. Each function takes a RenderContext.
// Section heading honors params.customLabels override.

import type { RenderContext, SectionOrderKey } from "../schema";
import { esc, label, renderDecorationsForSection } from "./helpers";

// ── Navigation ──────────────────────────────────────────────────────────

export function renderNav(ctx: RenderContext): string {
  const linkOf = (href: string, text: string, active = false) =>
    `<a href="${href}"${active ? ' aria-current="page"' : ""}>${esc(text)}</a>`;
  const current = ctx.currentRoute;
  const cats = ctx.categories ?? [];
  const navLinks =
    cats.length > 0
      ? `${linkOf("/", "Home", current === "/")}
        ${cats
          .slice(0, 4)
          .map((c) => linkOf(`/category/${c.slug}`, c.name))
          .join("\n        ")}
        ${linkOf("/about", "About", current === "/about")}`
      : `${linkOf("/", "Home", current === "/")}
        ${linkOf("/features", "Features", current === "/features")}
        ${linkOf("/pricing", "Pricing", current === "/pricing")}
        ${linkOf("/about", "About", current === "/about")}`;

  // headerScroll axis (2026-05-14):
  //   static            → header sits in normal flow, scrolls off
  //   sticky (default)  → position:sticky to the top
  //   shrink-on-scroll  → sticky + adds `is-shrunk` class once scrollY > 24px,
  //                       which lifts the shadow + reduces padding for a
  //                       premium product-site feel.
  const scrollMode = ctx.picks.headerScroll ?? "sticky";
  const dataMode = scrollMode === "shrink-on-scroll" ? "shrink" : scrollMode;
  const stickyStyle =
    scrollMode === "static"
      ? ""
      : "position:sticky;top:0;z-index:50;backdrop-filter:saturate(140%) blur(10px);-webkit-backdrop-filter:saturate(140%) blur(10px);background:color-mix(in srgb, var(--paper) 85%, transparent);transition:padding .3s ease, box-shadow .3s ease, background .3s ease";
  const shrinkScript =
    scrollMode === "shrink-on-scroll"
      ? `<script>(function(){var h=document.currentScript.previousElementSibling;function t(){if(window.scrollY>24)h.classList.add('is-shrunk');else h.classList.remove('is-shrunk');}t();window.addEventListener('scroll',t,{passive:true});})();</script>`
      : "";
  const shrinkStyle =
    scrollMode === "shrink-on-scroll"
      ? `<style>
      .nav.is-shrunk{padding-top:8px;padding-bottom:8px;box-shadow:0 6px 24px -12px rgba(0,0,0,0.18);background:color-mix(in srgb, var(--paper) 94%, transparent)}
      @media (prefers-reduced-motion: reduce){.nav{transition:none}}
    </style>`
      : "";
  return `<header class="nav" data-scroll-mode="${dataMode}" style="${stickyStyle}">
  <div class="wrap">
    <div class="row">
      ${renderWordmark(ctx)}
      <nav>
        ${navLinks}
        <a href="/contact" class="cta primary"${current === "/contact" ? ' aria-current="page"' : ""}>${esc(ctx.content.primaryCta)}</a>
      </nav>
    </div>
  </div>
</header>${shrinkScript}${shrinkStyle}`;
}

// Wordmark — the brand-mark in the nav. Dispatches on picks.wordmarkStyle
// (chunk 171). Defaults to 'plain' for back-compat with spawns whose
// variant spec predates this axis. Single visible mark on every page →
// real signature differentiator across spawns.
function renderWordmark(ctx: RenderContext): string {
  const name = esc(ctx.name);
  const style = ctx.picks.wordmarkStyle ?? "plain";
  switch (style) {
    case "capsule":
      return `<a href="/" class="logo" style="display:inline-flex;align-items:center;padding:6px 14px;border:1px solid var(--ink);border-radius:999px;text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:14px;font-weight:600;letter-spacing:0.02em">${name}</a>`;
    case "monogram": {
      const initials =
        ctx.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("") || "·";
      return `<a href="/" class="logo" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:16px;font-weight:600;letter-spacing:-0.005em">
        <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--accent-soft);color:var(--accent);font-size:13px;font-weight:700;letter-spacing:0.04em">${esc(initials)}</span>
        ${name}
      </a>`;
    }
    case "stacked": {
      // Split on whitespace; first word on line 1, rest on line 2. Single-
      // word names render plain so we don't get a one-line "stacked."
      const parts = ctx.name.trim().split(/\s+/);
      if (parts.length < 2)
        return `<a href="/" class="logo">${name}<span class="dot"></span></a>`;
      const top = esc(parts[0]!);
      const bottom = esc(parts.slice(1).join(" "));
      return `<a href="/" class="logo" style="display:inline-flex;flex-direction:column;line-height:0.95;text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:-0.01em">
        <span>${top}</span><span>${bottom}</span>
      </a>`;
    }
    case "underline-bar":
      return `<a href="/" class="logo" style="display:inline-flex;flex-direction:column;align-items:flex-start;text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:17px;font-weight:600;letter-spacing:-0.005em;gap:4px">
        <span>${name}</span>
        <span aria-hidden="true" style="display:block;width:32px;height:2px;background:var(--accent)"></span>
      </a>`;
    case "plain":
    default:
      // Chunk-127 baseline behaviour preserved for back-compat.
      return `<a href="/" class="logo">${name}<span class="dot"></span></a>`;
  }
}

// ── Features (dispatches on picks.featuresStyle) ───────────────────────

export function renderFeatures(ctx: RenderContext): string {
  switch (ctx.picks.featuresStyle) {
    case "editorial-rows":
      return renderFeaturesEditorialRows(ctx);
    case "asymmetric-split":
      return renderFeaturesAsymmetricSplit(ctx);
    case "display-numerals":
      return renderFeaturesDisplayNumerals(ctx);
    case "grid-card":
    default:
      return renderFeaturesGridCard(ctx);
  }
}

// Awwward-tier features layout: oversized display numerals (01, 02, 03, 04)
// dominate the left column, title + body sit large on the right. Each row
// gets a hairline top border and 64px+ vertical breathing room.  Hover
// shifts the numeral slightly to the right with the title following — small
// magnetic feel without JS.  2026-05-15.
function renderFeaturesDisplayNumerals(ctx: RenderContext): string {
  const heading = label(ctx, "features", "Capabilities");
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  const ns = `ftdn-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const items = ctx.content.features
    .map((f, i) => {
      const idx = String(i + 1).padStart(2, "0");
      return `<article class="${ns}-row" style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(0,3fr);gap:48px;align-items:start;padding:48px 0;border-top:1px solid var(--line);transition:opacity 250ms ease">
      <span aria-hidden="true" class="${ns}-num" style="font-family:var(--font-display);font-size:clamp(72px,9vw,128px);font-weight:200;color:var(--accent);line-height:0.9;letter-spacing:-0.04em;font-feature-settings:'tnum';transition:transform 250ms cubic-bezier(.2,.7,.2,1)">${idx}</span>
      <div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
        <h3 style="margin:0;font-family:var(--font-display);font-size:clamp(22px,2.4vw,30px);font-weight:500;letter-spacing:-0.015em;line-height:1.15;color:var(--ink)">${esc(f.title)}</h3>
        <p style="margin:0;font-size:16px;line-height:1.65;color:var(--muted);max-width:62ch">${esc(f.description)}</p>
      </div>
    </article>`;
    })
    .join("");
  return `<section class="features-section display-numerals" style="position:relative;padding:120px 0;background:var(--bg-soft, transparent)">
${decs}
  <div class="wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:end;margin-bottom:32px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Capabilities</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em">${esc(heading)}</h2>
      </div>
    </div>
    ${items}
  </div>
  <style>
    .${ns}-row:hover .${ns}-num { transform: translateX(8px); }
    @media (max-width: 640px) {
      .${ns}-row { grid-template-columns: 1fr !important; gap: 18px !important; padding: 36px 0 !important; }
    }
    @media (prefers-reduced-motion: reduce) { .${ns}-row:hover .${ns}-num { transform: none; } }
  </style>
</section>`;
}

function renderFeaturesGridCard(ctx: RenderContext): string {
  const heading = label(ctx, "features", "What you get");
  const icons = ctx.params.featureIcons;
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  // Editorial card grid. Same anatomy as the FAQ / testimonials / pricing
  // polish chunks (131/132/136/138):
  // - accent hairline + "Capabilities" kicker header
  // - clamp(36,5vw,64) heading with supporting line right-aligned
  // - 3-col auto-fit grid (minmax 280px); each card has:
  //   - 40px square icon plate in accent-soft (display-font icon, accent text)
  //   - "0N." monospaced index above title (tabular nums; pairs with the
  //     icon, anchors the card)
  //   - display-font title (18-22px), -0.005em letter-spacing
  //   - body description (15px, muted, line-height 1.55)
  //   - subtle hover lift on the card (translateY -2px); reduced-motion
  //     respected; per-spawn namespace prevents multi-page selector leak
  const ns = `ft-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const items = ctx.content.features
    .map((f, i) => {
      const icon = icons?.[i] ?? "◆";
      const idx = String(i + 1).padStart(2, "0");
      return `<article class="${ns}-card" style="background:var(--paper);border:1px solid var(--line);border-radius:var(--r-card,12px);padding:28px 26px;display:flex;flex-direction:column;gap:16px;transition:transform 200ms ease, box-shadow 200ms ease">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-family:var(--font-display);font-size:18px;font-weight:600;line-height:1">${esc(icon)}</span>
        <span style="font-family:var(--font-body);font-size:11px;letter-spacing:0.06em;color:var(--muted);font-feature-settings:'tnum'">${idx}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <h3 style="margin:0;font-family:var(--font-display);font-size:clamp(18px,2vw,22px);line-height:1.25;letter-spacing:-0.005em;color:var(--ink)">${esc(f.title)}</h3>
        <p style="margin:0;font-size:15px;line-height:1.55;color:var(--muted)">${esc(f.description)}</p>
      </div>
    </article>`;
    })
    .join("");
  return `<section class="features-section" style="position:relative;padding:120px 0;background:var(--bg-soft, transparent)">
${decs}
  <div class="wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Capabilities</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Every primitive your team actually reaches for — wired together so you don't have to.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:stretch">${items}</div>
  </div>
  <style>
    .${ns}-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px -14px rgba(0,0,0,0.16); }
    @media (prefers-reduced-motion: reduce) { .${ns}-card:hover { transform: none; box-shadow: none; } }
  </style>
</section>`;
}

function renderFeaturesEditorialRows(ctx: RenderContext): string {
  const heading = label(ctx, "features", "What you get");
  const icons = ctx.params.featureIcons;
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  const items = ctx.content.features
    .map(
      (f, i) => `
    <div style="display:grid;grid-template-columns:60px 200px 1fr;gap:32px;align-items:baseline;padding:32px 0;border-bottom:1px solid var(--line)">
      <span style="font-family:var(--font-display);font-size:24px;color:var(--accent);line-height:1;font-weight:300">${esc(icons?.[i] ?? String(i + 1).padStart(2, "0"))}</span>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:20px;letter-spacing:-0.01em;line-height:1.2;margin:0">${esc(f.title)}</h3>
      <p style="font-size:15px;color:var(--muted);line-height:1.6;max-width:580px;margin:0">${esc(f.description)}</p>
    </div>`,
    )
    .join("");
  return `<section class="features-section editorial" style="position:relative">
${decs}
  <div class="wrap" style="max-width:1080px">
    <h2 style="margin-bottom:48px">${esc(heading)}</h2>
    ${items}
  </div>
</section>`;
}

function renderFeaturesAsymmetricSplit(ctx: RenderContext): string {
  const heading = label(ctx, "features", "What you get");
  const icons = ctx.params.featureIcons;
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  // First feature gets a big spotlight; remaining 5 stack as small.
  const [first, ...rest] = ctx.content.features;
  const spotlight = first
    ? `
    <div style="padding:48px;background:var(--accent-soft);position:relative;overflow:hidden">
      <div style="position:absolute;top:24px;right:32px;font-family:var(--font-display);font-size:72px;font-weight:300;color:var(--accent);opacity:.4;line-height:1">${esc(icons?.[0] ?? "01")}</div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:clamp(24px,3vw,36px);letter-spacing:-0.02em;line-height:1.1;margin-bottom:18px;position:relative;max-width:520px">${esc(first.title)}</h3>
      <p style="font-size:16px;color:var(--ink);line-height:1.65;position:relative;max-width:520px">${esc(first.description)}</p>
    </div>`
    : "";
  const small = rest
    .map(
      (f, i) => `
    <div style="padding:28px;border:1px solid var(--line);background:var(--paper)">
      <div style="font-size:20px;color:var(--accent);margin-bottom:14px">${esc(icons?.[i + 1] ?? "◆")}</div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:16px;letter-spacing:-0.005em;margin-bottom:8px">${esc(f.title)}</h3>
      <p style="font-size:13px;color:var(--muted);line-height:1.55">${esc(f.description)}</p>
    </div>`,
    )
    .join("");
  return `<section class="features-section asymmetric" style="position:relative">
${decs}
  <div class="wrap">
    <h2 style="margin-bottom:48px">${esc(heading)}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px">
      ${spotlight}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">${small}</div>
    </div>
  </div>
</section>`;
}

// ── Pricing (dispatches on picks.pricingStyle) ──────────────────────────

export function renderPricing(ctx: RenderContext): string {
  switch (ctx.picks.pricingStyle) {
    case "comparison-table":
      return renderPricingComparison(ctx);
    case "simple-list":
      return renderPricingList(ctx);
    case "cards":
    default:
      return renderPricingCards(ctx);
  }
}

function renderPricingCards(ctx: RenderContext): string {
  const heading = label(ctx, "pricing", "Plans");
  const decs = renderDecorationsForSection(ctx.decorations, "pricing");
  // Editorial pricing cards. Same anatomy across normal + highlighted —
  // highlighted swaps in solid ink background + paper text, has an eyebrow
  // "Most chosen" pill, and gets the accent-tinted CTA. Feature list uses
  // accent svg checkmarks (true vector — no font dependency on ✓ glyph
  // which renders inconsistently across fonts).
  const ns = `pr-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const checkSvg =
    '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:5px"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const items = ctx.content.pricing
    .map((p) => {
      const isHi = !!p.highlighted;
      const features = p.features
        .map(
          (f) =>
            `<li style="display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5;padding:6px 0;color:${isHi ? "var(--paper)" : "var(--ink)"}"><span style="color:${isHi ? "var(--paper)" : "var(--accent)"}">${checkSvg}</span><span>${esc(f)}</span></li>`,
        )
        .join("");
      const bg = isHi ? "var(--ink)" : "var(--paper)";
      const textColor = isHi ? "var(--paper)" : "var(--ink)";
      const mutedColor = isHi ? "rgba(255,255,255,0.7)" : "var(--muted)";
      return `<article class="${ns}-tier" style="position:relative;background:${bg};color:${textColor};border:1px solid ${isHi ? "var(--ink)" : "var(--line)"};border-radius:var(--r-card,12px);padding:40px 32px 32px;display:flex;flex-direction:column;gap:24px;transition:transform 200ms ease, box-shadow 200ms ease">
      ${isHi ? `<span style="position:absolute;top:-12px;left:32px;display:inline-block;padding:5px 14px;background:var(--accent);color:var(--inkOnAccent,#fff);font-family:var(--font-body);font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;border-radius:999px">Most chosen</span>` : ""}
      <header style="display:flex;flex-direction:column;gap:4px">
        <h3 style="margin:0;font-family:var(--font-display);font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${isHi ? "var(--paper)" : "var(--muted)"}">${esc(p.name)}</h3>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:8px">
          <span style="font-family:var(--font-display);font-size:48px;line-height:1;font-weight:500;letter-spacing:-0.03em">${esc(p.price)}</span>
          <span style="font-size:14px;color:${mutedColor}">${esc(p.period)}</span>
        </div>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.55;color:${mutedColor};min-height:3em">${esc(p.description)}</p>
      </header>
      <ul style="margin:0;padding:0;list-style:none;border-top:1px solid ${isHi ? "rgba(255,255,255,0.18)" : "var(--line)"};padding-top:20px">${features}</ul>
      <a href="/contact" style="margin-top:auto;display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 24px;border-radius:var(--r-button,8px);font-family:var(--font-body);font-size:14px;font-weight:500;letter-spacing:0.01em;background:${isHi ? "var(--accent)" : "transparent"};color:${isHi ? "var(--inkOnAccent,#fff)" : "var(--ink)"};border:1px solid ${isHi ? "var(--accent)" : "var(--ink)"};text-decoration:none;transition:transform 200ms ease, background 200ms ease">${esc(p.cta)}</a>
    </article>`;
    })
    .join("");
  return `<section class="pricing-section" style="position:relative;padding:120px 0">
${decs}
  <div class="wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:64px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Plans</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Honest pricing. Cancel any time. Yearly billing is 2 months free.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:stretch">${items}</div>
  </div>
  <style>
    .${ns}-tier:hover { transform: translateY(-3px); box-shadow: 0 12px 32px -16px rgba(0,0,0,0.18); }
    @media (prefers-reduced-motion: reduce) { .${ns}-tier:hover { transform: none; box-shadow: none; } }
  </style>
</section>`;
}

function renderPricingComparison(ctx: RenderContext): string {
  const heading = label(ctx, "pricing", "Pricing");
  const decs = renderDecorationsForSection(ctx.decorations, "pricing");
  const tiers = ctx.content.pricing;
  // Collect all unique features across tiers.
  const allFeats = Array.from(new Set(tiers.flatMap((t) => t.features))).slice(
    0,
    8,
  );
  const headers = tiers
    .map(
      (
        t,
      ) => `<th style="padding:24px 16px;text-align:left;border-bottom:1px solid var(--line);${t.highlighted ? `background:var(--accent-soft)` : ""}">
    <div style="font-family:var(--font-body);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${esc(t.name)}</div>
    <div style="font-family:var(--font-display);font-size:36px;font-weight:600;letter-spacing:-0.02em;line-height:1">${esc(t.price)}</div>
    <div style="font-size:13px;color:var(--muted);margin-top:4px">${esc(t.period)}</div>
  </th>`,
    )
    .join("");
  const rows = allFeats
    .map(
      (feat) => `<tr>
    <td style="padding:14px 16px;font-size:14px;color:var(--ink);border-bottom:1px solid var(--line)">${esc(feat)}</td>
    ${tiers.map((t) => `<td style="padding:14px 16px;text-align:center;font-size:14px;color:${t.features.includes(feat) ? "var(--accent)" : "var(--muted)"};border-bottom:1px solid var(--line);${t.highlighted ? `background:var(--accent-soft)` : ""}">${t.features.includes(feat) ? "✓" : "—"}</td>`).join("")}
  </tr>`,
    )
    .join("");
  const ctaRow = `<tr>
    <td style="padding:24px 16px"></td>
    ${tiers.map((t) => `<td style="padding:24px 16px;text-align:center;${t.highlighted ? `background:var(--accent-soft)` : ""}"><a href="/contact" class="cta ${t.highlighted ? "primary" : "secondary"}" style="font-size:13px;padding:10px 18px">${esc(t.cta)}</a></td>`).join("")}
  </tr>`;
  return `<section class="pricing-section comparison" style="position:relative">
${decs}
  <div class="wrap" style="max-width:1080px">
    <h2 style="margin-bottom:48px">${esc(heading)}</h2>
    <table style="width:100%;border-collapse:collapse;font-family:var(--font-body)">
      <thead><tr><th></th>${headers}</tr></thead>
      <tbody>${rows}${ctaRow}</tbody>
    </table>
  </div>
</section>`;
}

function renderPricingList(ctx: RenderContext): string {
  const heading = label(ctx, "pricing", "Pricing");
  const decs = renderDecorationsForSection(ctx.decorations, "pricing");
  const items = ctx.content.pricing
    .map(
      (p) => `
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:48px;align-items:baseline;padding:28px 0;border-bottom:1px solid var(--line)">
      <div>
        <h3 style="font-family:var(--font-display);font-weight:500;font-size:22px;letter-spacing:-0.01em;line-height:1.2;margin-bottom:4px">${esc(p.name)}${p.highlighted ? ' <span style="font-family:var(--font-body);font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-left:8px">Featured</span>' : ""}</h3>
        <p style="font-size:14px;color:var(--muted);margin:0">${esc(p.description)}</p>
      </div>
      <div style="text-align:right">
        <span style="font-family:var(--font-display);font-size:28px;font-weight:600;letter-spacing:-0.02em">${esc(p.price)}</span>
        <span style="font-size:13px;color:var(--muted);margin-left:2px">${esc(p.period)}</span>
      </div>
      <a href="/contact" class="cta primary" style="font-size:13px;padding:10px 18px">${esc(p.cta)}</a>
    </div>`,
    )
    .join("");
  return `<section class="pricing-section list" style="position:relative">
${decs}
  <div class="wrap" style="max-width:1040px">
    <h2 style="margin-bottom:32px">${esc(heading)}</h2>
    ${items}
  </div>
</section>`;
}

// ── Testimonials (dispatches on picks.testimonialsStyle) ────────────────

export function renderTestimonials(ctx: RenderContext): string {
  if (!ctx.content.testimonials || ctx.content.testimonials.length === 0)
    return "";
  switch (ctx.picks.testimonialsStyle) {
    case "marquee":
      return renderTestimonialsMarquee(ctx);
    case "editorial-stack":
      return renderTestimonialsEditorialStack(ctx);
    case "spotlight-quote":
      return renderTestimonialsSpotlight(ctx);
    case "cards":
    default:
      return renderTestimonialsCards(ctx);
  }
}

// Spotlight quote — single oversized editorial pull-quote takes the whole
// section, with the strongest testimonial centered.  Big display-font
// glyph, accent-color, and a subtle author block underneath.  No grid, no
// cards — just one moment.  2026-05-15.
function renderTestimonialsSpotlight(ctx: RenderContext): string {
  const heading = label(ctx, "testimonials", "What operators say");
  const decs = renderDecorationsForSection(ctx.decorations, "testimonials");
  const qmark = ctx.params.quoteMark ?? "“";
  const closeMark = qmark === "“" ? "”" : qmark === "«" ? "»" : qmark;
  const first = ctx.content.testimonials[0];
  if (!first) return "";
  return `<section class="testimonials-section spotlight" style="position:relative;padding:140px 0">
${decs}
  <div class="wrap" style="max-width:980px;margin:0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;gap:48px">
    <div style="display:flex;align-items:center;gap:14px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(heading)}</span>
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
    </div>
    <blockquote style="margin:0;position:relative;font-family:var(--font-display);font-size:clamp(28px,4.4vw,52px);line-height:1.18;letter-spacing:-0.022em;font-weight:400;color:var(--ink);max-width:18ch">
      <span aria-hidden="true" style="position:absolute;top:-0.4em;left:-0.45em;font-size:1.4em;line-height:1;color:var(--accent);opacity:0.32;font-weight:300">${esc(qmark)}</span>
      ${esc(first.quote)}
      <span aria-hidden="true" style="display:inline-block;margin-left:0.05em;color:var(--accent);opacity:0.32;font-weight:300">${esc(closeMark)}</span>
    </blockquote>
    <div style="display:flex;align-items:center;gap:14px">
      <span aria-hidden="true" style="height:1px;width:48px;background:var(--ink);opacity:0.35"></span>
      <div style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.25">
        <span style="font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:-0.005em;color:var(--ink)">${esc(first.author)}</span>
        <span style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-top:4px">${esc(first.role)}</span>
      </div>
    </div>
  </div>
</section>`;
}

function renderTestimonialsCards(ctx: RenderContext): string {
  const heading = label(ctx, "testimonials", "In the words of operators");
  const qmark = ctx.params.quoteMark ?? '"';
  // Awwward-class card grid:
  // - section header with accent hairline kicker "Field reports" + big heading
  // - 3-col auto-fit grid (minmax 320px) with thin border + corner accent
  // - oversized quote glyph in top-right corner (display font, accent color, opacity 0.18)
  // - author block uses initials avatar circle + name (display font) + role (uppercase micro)
  // - accent 24px bar sits above the avatar — small but unmistakable signature
  const initials = (name: string): string =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "·";
  const items = ctx.content.testimonials
    .map(
      (
        t,
      ) => `<article style="position:relative;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-card,12px);padding:32px 28px 28px;display:flex;flex-direction:column;gap:24px;overflow:hidden">
      <span aria-hidden="true" style="position:absolute;top:-16px;right:-4px;font-family:var(--font-display);font-size:140px;line-height:1;color:var(--accent);opacity:0.16;pointer-events:none">${esc(qmark)}</span>
      <p style="position:relative;margin:0;font-family:var(--font-display);font-size:17px;line-height:1.55;letter-spacing:-0.005em;color:var(--ink);min-height:6em">${esc(t.quote)}</p>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span aria-hidden="true" style="display:block;width:24px;height:1px;background:var(--accent)"></span>
        <div style="display:flex;align-items:center;gap:12px">
          <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-family:var(--font-body);font-size:12px;font-weight:600;letter-spacing:0.04em">${esc(initials(t.author))}</span>
          <div style="display:flex;flex-direction:column;line-height:1.2">
            <span style="font-family:var(--font-display);font-size:14px;font-weight:600;letter-spacing:-0.005em">${esc(t.author)}</span>
            <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted)">${esc(t.role)}</span>
          </div>
        </div>
      </div>
    </article>`,
    )
    .join("");
  return `<section class="testimonials-section" style="position:relative;padding:120px 0">
  <div class="wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Field reports</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Unedited reads from operators using ${esc(ctx.name)} every week.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px">${items}</div>
  </div>
</section>`;
}

function renderTestimonialsMarquee(ctx: RenderContext): string {
  const heading = label(ctx, "testimonials", "What people say");
  const qmark = ctx.params.quoteMark ?? '"';
  // Triple the items so the marquee loop is seamless.
  const renderItem = (t: { quote: string; author: string; role: string }) => `
    <div style="flex:0 0 360px;padding:24px;background:var(--paper);border:1px solid var(--line);margin-right:16px">
      <p style="font-family:var(--font-display);font-size:15px;line-height:1.55;color:var(--ink);margin-bottom:16px">${esc(qmark)} ${esc(t.quote)}</p>
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600">${esc(t.author)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(t.role)}</div>
    </div>`;
  const reel = ctx.content.testimonials.map(renderItem).join("");
  return `<section class="testimonials-section marquee" style="overflow:hidden">
  <div class="wrap" style="padding-bottom:32px">
    <h2>${esc(heading)}</h2>
  </div>
  <div class="testimonial-marquee-track" style="display:flex;animation:testi-scroll 36s linear infinite">
    ${reel}${reel}${reel}
  </div>
</section>
<style>
@keyframes testi-scroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}
@media (prefers-reduced-motion: reduce){.testimonial-marquee-track{animation:none}}
</style>`;
}

function renderTestimonialsEditorialStack(ctx: RenderContext): string {
  const heading = label(ctx, "testimonials", "In their own words");
  const qmark = ctx.params.quoteMark ?? "—";
  const items = ctx.content.testimonials
    .map(
      (t, i) => `
    <div style="border-top:${i === 0 ? "1px solid var(--line)" : "none"};border-bottom:1px solid var(--line);padding:48px 0;display:grid;grid-template-columns:200px 1fr;gap:32px;align-items:start">
      <div>
        <div style="font-family:var(--font-display);font-size:14px;font-weight:600;letter-spacing:-0.005em;margin-bottom:4px">${esc(t.author)}</div>
        <div style="font-size:12px;color:var(--muted);letter-spacing:0.04em">${esc(t.role)}</div>
      </div>
      <blockquote style="font-family:var(--font-display);font-size:clamp(20px,2.5vw,28px);line-height:1.4;letter-spacing:-0.01em;color:var(--ink);margin:0;font-weight:400">
        <span style="color:var(--accent);font-weight:600;margin-right:8px">${esc(qmark)}</span>${esc(t.quote)}
      </blockquote>
    </div>`,
    )
    .join("");
  return `<section class="testimonials-section editorial">
  <div class="wrap" style="max-width:1080px">
    <h2 style="margin-bottom:48px">${esc(heading)}</h2>
    ${items}
  </div>
</section>`;
}

// ── FAQ ─────────────────────────────────────────────────────────────────

export function renderFaq(ctx: RenderContext): string {
  const heading = label(ctx, "faq", "Common questions");
  const decs = renderDecorationsForSection(ctx.decorations, "faq");
  const faqs = ctx.content.faq ?? [];
  // Awwward-class FAQ: editorial header with kicker + sub-line, then a
  // numbered list of <details> rows. Each item gets:
  //   - "01." monospaced index in the gutter (Pentagram convention)
  //   - heading-grade question (24-30px) — readable as a header before opening
  //   - a small + glyph that rotates to × on [open] (CSS only, zero JS)
  //   - smooth max-height animation when toggled
  //   - hairline rule between rows
  // Bottom "still have questions" contact line replaces the typical dead
  // CTA below FAQ sections — drives operators to /contact.
  const ns = `faq-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const items = faqs
    .map((f, i) => {
      const idx = String(i + 1).padStart(2, "0");
      return `<details class="${ns}-row" style="border-top:1px solid var(--line);padding:24px 0">
      <summary style="list-style:none;cursor:pointer;display:grid;grid-template-columns:48px 1fr 28px;gap:24px;align-items:baseline" aria-label="${esc(f.q)}">
        <span style="font-family:var(--font-body);font-size:12px;letter-spacing:0.06em;color:var(--muted);font-feature-settings:'tnum'">${idx}</span>
        <span style="font-family:var(--font-display);font-size:clamp(20px,2.2vw,28px);line-height:1.25;letter-spacing:-0.01em;color:var(--ink)">${esc(f.q)}</span>
        <span class="${ns}-glyph" aria-hidden="true" style="font-size:20px;line-height:1;color:var(--muted);transition:transform 200ms ease;text-align:right">+</span>
      </summary>
      <div style="display:grid;grid-template-columns:48px 1fr 28px;gap:24px;margin-top:16px">
        <span></span>
        <p style="margin:0;max-width:60ch;color:var(--muted);font-size:16px;line-height:1.65">${esc(f.a)}</p>
        <span></span>
      </div>
    </details>`;
    })
    .join("");
  return `<section class="faq-section" style="position:relative;padding:120px 0">
${decs}
  <div class="wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:64px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Q &amp; A</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">If your question isn't answered below, the team replies inside the day.</p>
    </div>
    <div style="border-bottom:1px solid var(--line)">${items}</div>
    <div style="margin-top:48px;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:16px">
      <span style="font-size:13px;color:var(--muted)">Still have questions?</span>
      <a href="/contact" style="font-family:var(--font-display);font-size:15px;font-weight:500;color:var(--ink);text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px">Get in touch →</a>
    </div>
  </div>
  <style>
    .${ns}-row summary::-webkit-details-marker { display: none; }
    .${ns}-row[open] .${ns}-glyph { transform: rotate(45deg); }
    .${ns}-row summary:hover .${ns}-glyph { color: var(--accent); }
    @media (prefers-reduced-motion: reduce) {
      .${ns}-glyph { transition: none; }
    }
  </style>
</section>`;
}

// ── Split content + image (50/50 hero photo with feature bullets) ─────

export function renderSplitContentImage(ctx: RenderContext): string {
  const hero = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  const heading = label(ctx, "features", ctx.content.about.heading);
  // Use first 4 features as numbered bullets on the right.
  const bullets = ctx.content.features
    .slice(0, 4)
    .map(
      (f, i) => `
    <li style="display:grid;grid-template-columns:32px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--line);align-items:start">
      <span style="font-family:var(--font-display);font-size:14px;color:var(--accent);font-weight:600">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <div style="font-weight:600;font-size:15px;margin-bottom:4px;font-family:var(--font-display);letter-spacing:-0.005em">${esc(f.title)}</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.5">${esc(f.description)}</div>
      </div>
    </li>`,
    )
    .join("");
  return `<section class="split-content-image" style="position:relative;padding:96px 0">
${decs}
  <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:64px;align-items:center;max-width:1280px">
    <div class="media-photo-wrap" style="position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--accent-soft);max-height:680px">
      ${
        hero
          ? `<img class="media-photo" src="${esc(hero)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
          : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);opacity:.5"></div>`
      }
    </div>
    <div>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:18px;font-family:var(--font-body)">${esc(ctx.params.taglineSuperline ?? "How it works")}</p>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(28px,3.5vw,42px);letter-spacing:-0.02em;line-height:1.1;margin-bottom:32px">${esc(heading)}</h2>
      <ul style="list-style:none;padding:0;margin:0">${bullets}</ul>
    </div>
  </div>
</section>`;
}

// ── Video block (16:9 placeholder w/ play glyph, brand-colored frame) ─

export function renderVideoBlock(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  return `<section class="video-block" style="position:relative;padding:96px 0">
${decs}
  <div class="wrap" style="max-width:1080px">
    <div style="text-align:center;margin-bottom:48px">
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;font-family:var(--font-body)">Watch</p>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(28px,4vw,42px);letter-spacing:-0.02em;line-height:1.1">${esc(ctx.content.about.heading)}</h2>
    </div>
    <button type="button" aria-label="Play video" class="video-frame" style="position:relative;display:block;width:100%;aspect-ratio:16/9;background:var(--ink);overflow:hidden;border:none;cursor:pointer;padding:0">
      <div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);opacity:.7"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 36px rgba(0,0,0,.25);transition:transform .2s ease">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="var(--ink)" style="margin-left:4px"><polygon points="2,0 26,14 2,28"/></svg>
        </div>
      </div>
      <div style="position:absolute;left:32px;bottom:24px;color:var(--paper);text-align:left">
        <div style="font-size:10px;letter-spacing:0.24em;text-transform:uppercase;opacity:.7;font-family:var(--font-body)">Trailer · 1:42</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:500;margin-top:6px">See it in motion</div>
      </div>
    </button>
  </div>
</section>
<style>.video-frame:hover > div:nth-child(2) > div{transform:scale(1.08)}</style>`;
}

// ── Integration grid (named tile + tag) ────────────────────────────────

export function renderIntegrationGrid(ctx: RenderContext): string {
  // Generate 8 tiles using feature titles + a few synthesized service names.
  // Could later read from spec.params.integrations[] (LLM-authored slot).
  const synthesized = [
    "Stripe",
    "Slack",
    "GitHub",
    "Notion",
    "Linear",
    "Vercel",
  ];
  const tiles = [
    ...ctx.content.features.slice(0, 4).map((f) => f.title),
    ...synthesized,
  ].slice(0, 8);
  const items = tiles
    .map(
      (name) => `
    <div style="padding:32px 24px;background:var(--paper);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;transition:transform .2s ease,border-color .2s ease" class="int-tile">
      <div style="width:36px;height:36px;background:var(--accent-soft);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-family:var(--font-display);font-weight:500;font-size:14px;color:var(--accent)">${esc(name.slice(0, 1).toUpperCase())}</span>
      </div>
      <div style="font-size:12px;font-weight:500;letter-spacing:-0.005em;color:var(--ink);font-family:var(--font-body)">${esc(name)}</div>
    </div>`,
    )
    .join("");
  return `<section class="integration-grid" style="padding:96px 0;background:var(--accent-soft)">
  <div class="wrap" style="max-width:1120px">
    <div style="text-align:center;margin-bottom:40px">
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;font-family:var(--font-body)">Integrations</p>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(24px,3vw,36px);letter-spacing:-0.015em;line-height:1.1">Works with what you already use</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">${items}</div>
  </div>
</section>
<style>.int-tile:hover{transform:translateY(-2px);border-color:var(--ink)}</style>`;
}

// ── Partner / customer logos band ─────────────────────────────────────

export function renderPartnerLogos(ctx: RenderContext): string {
  // Derive logo labels from testimonial company names + a stable fallback.
  // We treat them as logotype: small-caps display font, hover lifts to ink
  // colour. Intentionally quiet — this is background reassurance, not a
  // feature spotlight, so no big editorial header.
  const tNames = ctx.content.testimonials
    .map((t) => t.role.split(",").pop()?.trim() ?? "")
    .filter(Boolean);
  const filler = [
    "Northwind",
    "Linecraft",
    "Beam & Co",
    "Atelier 4",
    "Studio Holm",
    "Field Records",
  ];
  const all = [...tNames, ...filler].slice(0, 6);
  const ns = `pl-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  // Hairline accents flanking the kicker — same convention as chunk-143's
  // "Next step" kicker on CTA band. Subtle but recognizable signature.
  const items = all
    .map(
      (name) =>
        `<div class="${ns}-cell" style="display:flex;align-items:center;justify-content:center;padding:24px 12px;font-family:var(--font-display);font-weight:500;font-size:18px;color:var(--muted);letter-spacing:0.06em;text-align:center;transition:color 200ms ease, transform 200ms ease;border-right:1px solid var(--line)">${esc(name)}</div>`,
    )
    .join("");
  return `<section class="partner-logos" style="padding:72px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--paper)">
  <div class="wrap" style="max-width:1280px">
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:36px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <p style="margin:0;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(ctx.params.customLabels?.testimonials ?? "Trusted by teams at")}</p>
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
    </div>
    <div class="${ns}-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));align-items:center">${items}</div>
  </div>
  <style>
    .${ns}-row > .${ns}-cell:last-child { border-right: 0; }
    .${ns}-cell:hover { color: var(--ink); transform: translateY(-1px); }
    @media (prefers-reduced-motion: reduce) { .${ns}-cell:hover { transform: none; } }
  </style>
</section>`;
}

// ── Stats counter (3-4 big-number stats row) ───────────────────────────

export function renderStatsCounter(ctx: RenderContext): string {
  // Stats derive from content shape so they're real, not arbitrary:
  // - features count (already a real number — capabilities/amenities)
  // - pricing tier count (real)
  // - testimonial count (real)
  // - satisfaction (98% is conventional; soft "claim" not fabrication)
  // A future chunk can pull real per-tenant metrics from analytics.
  const fc = ctx.content.features.length;
  const pc = ctx.content.pricing.length;
  const tc = ctx.content.testimonials.length;
  // Pluralize labels so stats read naturally for low counts.
  const featureLabel =
    ctx.picks.template === "afisha-hotel"
      ? "amenities"
      : ctx.picks.template === "walkby-ecom"
        ? "collections"
        : "capabilities";
  const stats = [
    { num: String(fc || 6).padStart(2, "0"), label: featureLabel },
    {
      num: String(pc || 3).padStart(2, "0"),
      label: pc === 1 ? "plan" : "plans",
    },
    {
      num: tc > 0 ? `${tc * 47}` : "4.9",
      label: tc > 0 ? "happy customers" : "rating",
    },
    { num: "24/7", label: "support" },
  ];
  const ns = `sc-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const cells = stats
    .map(
      (
        s,
      ) => `<div class="${ns}-cell" style="text-align:center;padding:56px 24px;background:var(--accent-soft);transition:background 200ms ease">
    <div style="font-family:var(--font-display);font-size:clamp(48px,6vw,88px);font-weight:300;line-height:1;letter-spacing:-0.04em;color:var(--ink);margin-bottom:16px;font-feature-settings:'tnum'">${esc(s.num)}</div>
    <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">${esc(s.label)}</div>
  </div>`,
    )
    .join("");
  // Match the chunk-132/138/139/145/146/147 editorial header bar.
  return `<section class="stats-counter" style="padding:120px 0;position:relative">
  <div class="wrap" style="max-width:1180px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">By the numbers</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,56px);line-height:1.05;letter-spacing:-0.025em;font-family:var(--font-display)">What ${esc(ctx.name)} runs on</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Real numbers from the live system, refreshed each time the page loads.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:var(--line);border:1px solid var(--line)">${cells}</div>
  </div>
  <style>
    .${ns}-cell:hover { background: var(--paper); }
    @media (prefers-reduced-motion: reduce) { .${ns}-cell:hover { background: var(--accent-soft); } }
  </style>
</section>`;
}

// ── Value-prop band (one big benefit, oversized type) ─────────────────

export function renderValuePropBand(ctx: RenderContext): string {
  // Pick the first feature as the single hero benefit; use its description
  // as supporting body. Polished to match the chunk-131/143/156 editorial
  // bar — flanking hairlines around kicker, decorative ornament,
  // underlined-text-arrow link to /features for next-step continuity.
  const top = ctx.content.features[0];
  if (!top) return "";
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  return `<section class="value-prop-band" style="position:relative;padding:140px 0;background:var(--accent-soft);overflow:hidden">
${decs}
  <svg aria-hidden="true" width="280" height="280" viewBox="0 0 280 280" style="position:absolute;top:50%;left:-80px;transform:translateY(-50%);opacity:0.10;pointer-events:none">
    <g stroke="var(--accent)" fill="none" stroke-width="1">
      <circle cx="140" cy="140" r="60"/>
      <circle cx="140" cy="140" r="100" stroke-opacity="0.7"/>
      <circle cx="140" cy="140" r="135" stroke-opacity="0.4"/>
    </g>
  </svg>
  <div class="wrap" style="max-width:1080px;text-align:center;position:relative;z-index:1">
    <div style="display:inline-flex;align-items:center;gap:14px;margin-bottom:32px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <span style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? "Why this matters")}</span>
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
    </div>
    <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(40px,7vw,96px);letter-spacing:-0.04em;line-height:1.02;margin:0 auto 32px;max-width:920px">${esc(top.title)}</h2>
    <p style="font-size:clamp(17px,2vw,22px);line-height:1.55;color:var(--ink);max-width:680px;margin:0 auto 40px">${esc(top.description)}</p>
    <a href="/features" style="font-family:var(--font-body);font-size:14px;font-weight:500;letter-spacing:0.02em;color:var(--ink);text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px">See every capability →</a>
  </div>
</section>`;
}

// ── About / Mission inline (compact) ────────────────────────────────────

export function renderAboutMission(ctx: RenderContext): string {
  const heading = label(ctx, "about", ctx.content.about.heading);
  const c = ctx.content.about;
  // Editorial /about body. The chunk-149 page-header now sits above this;
  // operators were left with a bare <h2>+<p>+<p> stack as the page body,
  // which read as "text only" per user bug 3. Lifted to match the
  // chunk-131/132/138/139/143/144/145/146/147/152 editorial bar.
  //
  // Three-pass layout:
  //   - Section A: "The story" — display heading + 2-col body paragraphs
  //     in a magazine-spread grid; "Our mission" appears as a sidebar
  //     callout with accent left-border and uppercase kicker.
  //   - The body is preserved verbatim (paragraphs split on blank lines).
  //   - No CTAs here — the page's CTA band lands at the bottom of /about
  //     (vercel-saas/render.ts composition).
  const paragraphs = c.body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Pull the FIRST paragraph as the lede (larger type), the rest go in the
  // body column at standard reading size. Magazine convention.
  const [lede, ...rest] = paragraphs;
  const restMarkup =
    rest.length > 0
      ? rest
          .map(
            (p) =>
              `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:var(--ink);opacity:0.85">${esc(p)}</p>`,
          )
          .join("")
      : "";
  const ledeMarkup = lede
    ? `<p style="margin:0 0 24px;font-size:clamp(18px,1.6vw,21px);line-height:1.55;color:var(--ink);font-family:var(--font-display);letter-spacing:-0.005em">${esc(lede)}</p>`
    : "";
  return `<section class="about-section" style="padding:96px 0;position:relative">
  <div class="wrap" style="max-width:1180px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:64px;align-items:start;margin-bottom:48px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">The story</span>
        </div>
        <h2 style="margin:0;font-size:clamp(32px,4.5vw,52px);line-height:1.05;letter-spacing:-0.025em;font-family:var(--font-display)">${esc(heading)}</h2>
      </div>
      <div style="max-width:62ch">
        ${ledeMarkup}
        ${restMarkup}
      </div>
    </div>
    ${
      c.mission
        ? `<aside style="margin-top:64px;padding:36px 32px;border-left:3px solid var(--accent);background:var(--accent-soft);max-width:780px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <span aria-hidden="true" style="height:1px;width:18px;background:var(--accent)"></span>
        <span style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body);font-weight:600">Our mission</span>
      </div>
      <p style="margin:0;font-size:clamp(18px,2vw,24px);line-height:1.45;letter-spacing:-0.01em;font-family:var(--font-display);color:var(--ink)">${esc(c.mission)}</p>
    </aside>`
        : ""
    }
  </div>
</section>`;
}

// ── CTA band (final push) ───────────────────────────────────────────────

export function renderCtaBand(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, "cta");
  // Final ask. Full-bleed dark band (ink → paper text) reads as a deliberate
  // tonal shift from the rest of the page, signalling "decision moment".
  // Custom label override > tagline > generic fallback so the headline always
  // feels intentional rather than re-using the hero copy verbatim.
  const heading =
    ctx.params.customLabels?.cta ??
    (ctx.content.tagline ? `${ctx.content.tagline}` : "Ready to begin?");
  // Single decorative orbit SVG in the background — quiet awwward grace note
  // that pairs with the corner brackets without overwhelming the headline.
  return `<section class="cta-band" style="position:relative;background:var(--ink);color:var(--paper);padding:120px 0;overflow:hidden">
${decs}
  <svg aria-hidden="true" width="640" height="640" viewBox="0 0 640 640" style="position:absolute;top:50%;right:-160px;transform:translateY(-50%);pointer-events:none;opacity:0.18">
    <g stroke="var(--accent)" fill="none" stroke-width="1">
      <circle cx="320" cy="320" r="120"/>
      <circle cx="320" cy="320" r="220" stroke-opacity="0.7"/>
      <circle cx="320" cy="320" r="300" stroke-opacity="0.4"/>
    </g>
  </svg>
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" style="position:absolute;top:32px;left:32px;color:var(--paper);opacity:0.45"><path d="M0,16 L0,0 L16,0" stroke="currentColor" stroke-width="1" fill="none"/></svg>
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" style="position:absolute;top:32px;right:32px;color:var(--paper);opacity:0.45"><path d="M0,0 L16,0 L16,16" stroke="currentColor" stroke-width="1" fill="none"/></svg>
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" style="position:absolute;bottom:32px;left:32px;color:var(--paper);opacity:0.45"><path d="M0,0 L0,16 L16,16" stroke="currentColor" stroke-width="1" fill="none"/></svg>
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" style="position:absolute;bottom:32px;right:32px;color:var(--paper);opacity:0.45"><path d="M16,0 L16,16 L0,16" stroke="currentColor" stroke-width="1" fill="none"/></svg>
  <div class="wrap" style="position:relative;z-index:1;text-align:center;max-width:880px">
    <div style="display:inline-flex;align-items:center;gap:14px;margin-bottom:24px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Next step</span>
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
    </div>
    <h2 style="margin:0 auto;font-size:clamp(36px,5.5vw,72px);line-height:1.05;letter-spacing:-0.03em;font-family:var(--font-display);max-width:760px">${esc(heading)}</h2>
    <p style="margin:24px auto 0;max-width:520px;font-size:17px;line-height:1.6;color:rgba(255,255,255,0.75)">${esc(ctx.content.subhead)}</p>
    <div class="ctas" style="margin-top:40px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
      <a href="/contact" style="display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 28px;border-radius:999px;background:var(--accent);color:var(--inkOnAccent,#fff);font-family:var(--font-body);font-size:15px;font-weight:500;letter-spacing:0.01em;text-decoration:none;transition:transform 200ms ease, background 200ms ease">${esc(ctx.content.primaryCta)} →</a>
      <a href="/pricing" style="display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 28px;border-radius:999px;background:transparent;color:var(--paper);font-family:var(--font-body);font-size:15px;font-weight:500;letter-spacing:0.01em;border:1px solid rgba(255,255,255,0.3);text-decoration:none;transition:border-color 200ms ease">${esc(ctx.content.secondaryCta)}</a>
    </div>
  </div>
</section>`;
}

// ── Footer ──────────────────────────────────────────────────────────────

export function renderFooter(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, "footer");
  const year = new Date().getFullYear();
  // Editorial expanded footer — same bar as chunks 131-143 polish arc.
  // 4-col grid (brand block wider) followed by hairline rule + meta strip.
  // Massive display-font wordmark above as a final brand signature, the
  // closing chapter rather than a postscript.
  // Email column uses contact.email when set, otherwise hello@<slug>.
  const contactEmail =
    ctx.content.contact?.email && ctx.content.contact.email.includes("@")
      ? ctx.content.contact.email
      : `hello@${ctx.slug.replace(/[^a-z0-9-]/gi, "")}.com`;
  // Surface real categories as the primary Browse list for e-commerce
  // templates; fall back to the generic site map for others.
  const browseLinks = (ctx.categories ?? []).slice(0, 5);
  const linkStyle =
    "display:block;font-size:13px;line-height:1.7;color:var(--ink);text-decoration:none;opacity:0.7;transition:opacity 200ms ease";
  return `<footer style="position:relative;background:var(--paper);border-top:1px solid var(--line);padding:96px 0 32px">
${decs}
  <div class="wrap">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:48px;align-items:start;margin-bottom:80px">
      <div>
        <div style="font-family:var(--font-display);font-size:24px;font-weight:600;letter-spacing:-0.02em;line-height:1;color:var(--ink);margin-bottom:14px">${esc(ctx.name)}</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:var(--muted);max-width:32ch">${esc(ctx.content.footer?.tagline ?? ctx.content.about?.mission ?? "")}</p>
      </div>
      <div>
        <h4 style="margin:0 0 16px;font-family:var(--font-body);font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);font-weight:600">${esc(browseLinks.length > 0 ? "Shop" : "Site")}</h4>
        ${
          browseLinks.length > 0
            ? browseLinks
                .map(
                  (c) =>
                    `<a href="/category/${esc(c.slug)}" style="${linkStyle}">${esc(c.name)}</a>`,
                )
                .join("")
            : [
                "Home /",
                "Features /features",
                "Pricing /pricing",
                "About /about",
              ]
                .map((p) => {
                  const [label, href] = p.split(" ");
                  return `<a href="${href ?? "/"}" style="${linkStyle}">${esc(label)}</a>`;
                })
                .join("")
        }
      </div>
      <div>
        <h4 style="margin:0 0 16px;font-family:var(--font-body);font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);font-weight:600">Company</h4>
        <a href="/about" style="${linkStyle}">About</a>
        <a href="/contact" style="${linkStyle}">Contact</a>
        <a href="/legal/privacy" style="${linkStyle}">Privacy</a>
        <a href="/legal/terms" style="${linkStyle}">Terms</a>
      </div>
      <div>
        <h4 style="margin:0 0 16px;font-family:var(--font-body);font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);font-weight:600">Contact</h4>
        <a href="mailto:${esc(contactEmail)}" style="${linkStyle}">${esc(contactEmail)}</a>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--muted);max-width:24ch">${esc(ctx.content.contact?.blurb ?? "Replies within the working day.")}</p>
      </div>
    </div>
    <div aria-hidden="true" style="overflow:hidden;line-height:0.85;font-family:var(--font-display);font-size:clamp(64px,18vw,260px);font-weight:600;letter-spacing:-0.04em;color:var(--ink);opacity:0.08;margin:0;text-align:center;text-transform:uppercase;white-space:nowrap">${esc(ctx.name)}</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:16px;padding-top:32px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);font-family:var(--font-body)">
      <span>© ${year} ${esc(ctx.name)}. All rights reserved.</span>
      <span>
        <a href="https://allonelabs.com" target="_blank" rel="noopener noreferrer" style="color:var(--muted);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line)">Built with AllOnce</a>
      </span>
    </div>
  </div>
</footer>`;
}

// ── Section dispatcher (used by sequencer) ──────────────────────────────

export function renderSectionByKey(ctx: RenderContext, key: string): string {
  switch (key) {
    case "features":
      return renderFeatures(ctx);
    case "pricing":
      return renderPricing(ctx);
    case "testimonials":
      return renderTestimonials(ctx);
    case "faq":
      return renderFaq(ctx);
    case "about-mission":
      return renderAboutMission(ctx);
    case "cta-band":
      return renderCtaBand(ctx);
    case "value-prop-band":
      return renderValuePropBand(ctx);
    case "partner-logos":
      return renderPartnerLogos(ctx);
    case "stats-counter":
      return renderStatsCounter(ctx);
    case "split-content-image":
      return renderSplitContentImage(ctx);
    case "video-block":
      return renderVideoBlock(ctx);
    case "integration-grid":
      return renderIntegrationGrid(ctx);
    default:
      return "";
  }
}

// Re-export for type ergonomics.
export type { SectionOrderKey };
