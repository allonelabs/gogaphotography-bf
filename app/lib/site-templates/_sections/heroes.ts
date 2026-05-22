// 13 hero variants. Each takes a RenderContext and returns an HTML fragment.
// The same SiteContent.tagline/subhead/primaryCta/secondaryCta drive all of
// them — only the visual treatment differs. The dispatcher at the bottom
// switches on ctx.picks.hero; add new variants by extending the HeroKey
// union in schema.ts, writing a render function here, and wiring a `case`.

import type { HeroKey, HeroOverlayKey, RenderContext } from '../schema';
import { esc, renderDecorationsForSection } from './helpers';

// Resolve picks.heroOverlay to a CSS `background` value. Bottom-to-top
// gradient using the resolved ink colour so the overlay reads on every
// palette. `vignette` is radial (corners darker, centre clear) for
// product-isolate-style heroes. Default 'medium' when not set on the
// spec — preserves chunk-127 baseline behaviour for older spawns.
function heroOverlayCss(ctx: RenderContext, defaultKey: HeroOverlayKey = 'medium'): string {
  const key: HeroOverlayKey = ctx.picks.heroOverlay ?? defaultKey;
  const ink = ctx.palette.ink;
  switch (key) {
    case 'none':     return 'transparent';
    case 'light':    return `linear-gradient(180deg, transparent 55%, ${ink}66 100%)`;
    case 'medium':   return `linear-gradient(180deg, transparent 40%, ${ink}cc 100%)`;
    case 'heavy':    return `linear-gradient(180deg, ${ink}33 0%, ${ink}ee 100%)`;
    case 'vignette': return `radial-gradient(ellipse at center, transparent 50%, ${ink}cc 100%)`;
  }
}

function ctas(ctx: RenderContext, accent = false): string {
  const c = ctx.content;
  return `<div class="ctas">
    <a href="/contact" class="cta ${accent ? 'accent' : 'primary'}">${esc(c.primaryCta)}</a>
    <a href="/features" class="cta secondary">${esc(c.secondaryCta)}</a>
  </div>`;
}

function superline(ctx: RenderContext): string {
  const text = ctx.params.taglineSuperline ?? ctx.name;
  return `<span class="kicker">${esc(text)}</span>`;
}

// ── photo-fullbleed: huge image behind text ─────────────────────────────

function heroPhotoFullbleed(ctx: RenderContext): string {
  const c = ctx.content;
  const img = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  return `<section class="hero hero-fullbleed" style="position:relative;min-height:88vh;display:flex;align-items:flex-end;color:${ctx.palette.paper};overflow:hidden">
${decs}
  <div class="hero-photo-wrap" style="position:absolute;inset:0;z-index:0">
    ${img
      ? `<img class="hero-photo" src="${esc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
      : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, ${ctx.palette.ink}, ${ctx.palette.accent})"></div>`}
    <div style="position:absolute;inset:0;background:${heroOverlayCss(ctx)}"></div>
  </div>
  <div class="wrap" style="position:relative;z-index:1;padding-bottom:96px;padding-top:140px">
    ${superline(ctx)}
    <h1 style="max-width:920px">${esc(c.tagline)}</h1>
    <p class="subhead" style="color:${ctx.palette.paper}cc;max-width:680px">${esc(c.subhead)}</p>
    ${ctas(ctx, true)}
  </div>
</section>`;
}

// ── photo-split: 50/50 text | photo ─────────────────────────────────────

function heroPhotoSplit(ctx: RenderContext): string {
  const c = ctx.content;
  const img = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  return `<section class="hero hero-split" style="position:relative">
${decs}
  <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:64px;align-items:center;padding:120px 32px">
    <div>
      ${superline(ctx)}
      <h1>${esc(c.tagline)}</h1>
      <p class="subhead">${esc(c.subhead)}</p>
      ${ctas(ctx)}
    </div>
    <div class="hero-photo-wrap" style="position:relative;aspect-ratio:4/5;border-radius:var(--r-card,12px);overflow:hidden;background:${ctx.palette.accentSoft}">
      ${img
        ? `<img class="hero-photo" src="${esc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, ${ctx.palette.accent}, ${ctx.palette.ink})"></div>`}
      ${(ctx.picks.heroOverlay ?? 'none') !== 'none' ? `<div style="position:absolute;inset:0;background:${heroOverlayCss(ctx, 'none')};pointer-events:none"></div>` : ''}
    </div>
  </div>
</section>`;
}

// ── video-loop: looping silent video bg ─────────────────────────────────

function heroVideoLoop(ctx: RenderContext): string {
  const c = ctx.content;
  // No video asset yet — degrade to abstract-gradient until video pipeline ships.
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  return `<section class="hero hero-video" style="position:relative;min-height:80vh;display:flex;align-items:center;color:${ctx.palette.paper};overflow:hidden">
${decs}
  <div style="position:absolute;inset:0;z-index:0;background:linear-gradient(135deg, ${ctx.palette.ink} 0%, ${ctx.palette.accent} 100%)"></div>
  <div style="position:absolute;inset:0;z-index:0;background-image:repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,.03) 2px, rgba(255,255,255,.03) 4px)"></div>
  <div class="wrap" style="position:relative;z-index:1">
    ${superline(ctx)}
    <h1 style="max-width:920px">${esc(c.tagline)}</h1>
    <p class="subhead" style="color:${ctx.palette.paper}cc">${esc(c.subhead)}</p>
    ${ctas(ctx, true)}
  </div>
</section>`;
}

// ── typography-only: text owns the page ─────────────────────────────────

function heroTypographyOnly(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Editorial framing: small index "01" + section label top-left, business
  // name + year top-right (magazine masthead convention). Hairline rule
  // between superline and the massive headline. Subhead lives in a narrow
  // indented column with a left-border accent — feels like a featured pull
  // quote. CTAs split: primary pill + secondary text-arrow.
  const year = new Date().getFullYear();
  const superlineText = ctx.params.taglineSuperline ?? 'Introduction';
  return `<section class="hero hero-type" style="position:relative;min-height:88vh;display:flex;flex-direction:column;justify-content:space-between;padding:48px 0">
${decs}
  <div class="wrap" style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:0">
    <div style="display:flex;gap:14px;align-items:baseline">
      <span style="font-family:var(--font-display);font-size:13px;font-weight:500;color:var(--accent);letter-spacing:0.04em">01</span>
      <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">${esc(superlineText)}</span>
    </div>
    <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">${esc(ctx.name)} · ${year}</div>
  </div>
  <div class="wrap" style="flex:1;display:flex;flex-direction:column;justify-content:center;padding-top:64px;padding-bottom:64px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:48px">
      <span aria-hidden="true" style="height:1px;width:64px;background:var(--ink);opacity:0.4"></span>
      <span style="font-family:var(--font-body);font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted)">Chapter one</span>
    </div>
    <h1 style="max-width:1080px;font-size:clamp(48px,8vw,128px);line-height:0.98;letter-spacing:-0.035em;margin:0">${esc(c.tagline)}</h1>
    <div style="margin-top:56px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:64px;align-items:start">
      <p class="subhead" style="margin:0;padding-left:24px;border-left:1px solid var(--line);max-width:560px;font-size:17px;line-height:1.6;color:var(--muted)">${esc(c.subhead)}</p>
      <div class="ctas" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-self:end">
        <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
        <a href="/about" class="cta text-arrow" style="background:transparent;border:none;padding:0;color:var(--ink);font-weight:500;font-size:14px;letter-spacing:0.02em;text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px">${esc(c.secondaryCta)} →</a>
      </div>
    </div>
  </div>
  <div class="wrap" style="display:flex;justify-content:space-between;align-items:baseline;padding-top:0">
    <span style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Scroll for chapter two</span>
    <span aria-hidden="true" style="height:1px;flex:1;margin-left:24px;background:var(--line)"></span>
  </div>
</section>`;
}

// ── abstract-gradient: pure color hero ──────────────────────────────────

function heroAbstractGradient(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Layered awwward background: a base linear gradient + two large blurred
  // radial blobs in accent/ink (Stripe/Linear/Vercel convention) + an
  // SVG noise wash on top for paper-feel texture. All-CSS, zero JS.
  // Anchored corner brackets frame the composition.
  const stops = ctx.params.bgGradientStops && ctx.params.bgGradientStops.length >= 2
    ? ctx.params.bgGradientStops
    : [ctx.palette.paper, ctx.palette.accentSoft];
  const stopCss = stops.map((s, i) => `${s} ${(i / (stops.length - 1)) * 100}%`).join(', ');
  const accent = ctx.palette.accent;
  const ink = ctx.palette.ink;
  // Single inline SVG noise pattern — deterministic, ~150 bytes, no requests.
  const noiseSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.6'/></svg>`;
  const bracket = (anchor: 'tl' | 'tr' | 'bl' | 'br') => {
    const pos = anchor === 'tl' ? 'top:32px;left:32px' :
                anchor === 'tr' ? 'top:32px;right:32px' :
                anchor === 'bl' ? 'bottom:32px;left:32px' :
                'bottom:32px;right:32px';
    const path = anchor === 'tl' ? 'M0,16 L0,0 L16,0' :
                 anchor === 'tr' ? 'M0,0 L16,0 L16,16' :
                 anchor === 'bl' ? 'M0,0 L0,16 L16,16' :
                 'M16,0 L16,16 L0,16';
    return `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" style="position:absolute;z-index:2;${pos};color:var(--ink);opacity:0.45"><path d="${path}" stroke="currentColor" stroke-width="1" fill="none"/></svg>`;
  };
  return `<section class="hero hero-abstract" style="position:relative;min-height:88vh;display:flex;align-items:center;overflow:hidden">
${decs}
  ${bracket('tl')}${bracket('tr')}${bracket('bl')}${bracket('br')}
  <div aria-hidden="true" style="position:absolute;inset:0;z-index:0;background:linear-gradient(135deg, ${stopCss})"></div>
  <div aria-hidden="true" style="position:absolute;top:-25%;left:-15%;width:65%;aspect-ratio:1;z-index:0;background:radial-gradient(circle at center, ${accent}66 0%, ${accent}00 60%);filter:blur(60px);pointer-events:none"></div>
  <div aria-hidden="true" style="position:absolute;bottom:-30%;right:-10%;width:55%;aspect-ratio:1;z-index:0;background:radial-gradient(circle at center, ${ink}44 0%, ${ink}00 65%);filter:blur(80px);pointer-events:none"></div>
  <div aria-hidden="true" style="position:absolute;inset:0;z-index:0;background-image:url(&quot;${noiseSvg}&quot;);background-size:200px 200px;opacity:0.28;mix-blend-mode:multiply;pointer-events:none"></div>
  <div class="wrap" style="position:relative;z-index:1;text-align:center;padding:120px 24px">
    ${superline(ctx)}
    <h1 style="margin:24px auto 0;max-width:1080px;font-size:clamp(48px,8vw,124px);line-height:0.98;letter-spacing:-0.04em">${esc(c.tagline)}</h1>
    <p class="subhead" style="margin:32px auto 0;max-width:640px;font-size:17px;line-height:1.6">${esc(c.subhead)}</p>
    <div class="ctas" style="margin-top:40px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
      <a href="/features" class="cta secondary">${esc(c.secondaryCta)}</a>
    </div>
  </div>
</section>`;
}

// ── illustration: ornamental SVG wash + text ────────────────────────────

function heroIllustration(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Build a deterministic ornament from the slug — orbits/dots based on hash.
  const seed = ctx.slug.split('').reduce((a, ch) => (a + ch.charCodeAt(0)) % 360, 0);
  const r1 = 180 + ((seed * 7) % 80);
  const r2 = 320 + ((seed * 13) % 100);
  const x = 60 + (seed % 35);
  return `<section class="hero hero-illustration" style="position:relative;min-height:84vh;display:flex;align-items:center;overflow:hidden">
${decs}
  <svg viewBox="0 0 800 800" style="position:absolute;top:50%;right:-5%;transform:translateY(-50%);width:60vmax;height:60vmax;opacity:.5;pointer-events:none;z-index:0" aria-hidden="true">
    <defs>
      <radialGradient id="orb-${esc(ctx.slug)}" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${ctx.palette.accent}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${ctx.palette.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${x * 8}" cy="400" r="${r2}" fill="url(#orb-${esc(ctx.slug)})"/>
    <circle cx="${x * 8}" cy="400" r="${r1}" stroke="${ctx.palette.accent}" fill="none" stroke-opacity="0.18" stroke-width="0.8"/>
    <circle cx="${x * 8}" cy="400" r="${r1 - 80}" stroke="${ctx.palette.accent}" fill="none" stroke-opacity="0.25" stroke-width="0.6"/>
  </svg>
  <div class="wrap" style="position:relative;z-index:1">
    ${superline(ctx)}
    <h1 style="max-width:780px">${esc(c.tagline)}</h1>
    <p class="subhead">${esc(c.subhead)}</p>
    ${ctas(ctx)}
  </div>
</section>`;
}

// ── product-isolate: centered hero with isolated product card ──────────

function heroProductIsolate(ctx: RenderContext): string {
  const c = ctx.content;
  const img = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  return `<section class="hero hero-product" style="position:relative;padding:120px 0 0;text-align:center;overflow:hidden">
${decs}
  <div class="wrap">
    ${superline(ctx)}
    <h1 style="margin:0 auto;max-width:780px">${esc(c.tagline)}</h1>
    <p class="subhead" style="margin-left:auto;margin-right:auto">${esc(c.subhead)}</p>
    <div style="margin-top:36px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
      <a href="/features" class="cta secondary">${esc(c.secondaryCta)}</a>
    </div>
    <div class="hero-photo-wrap" style="margin:64px auto 0;max-width:880px;aspect-ratio:16/10;border-radius:calc(var(--r-card,12px) * 1.5);overflow:hidden;box-shadow:0 30px 80px ${ctx.palette.ink}22;position:relative">
      ${img
        ? `<img class="hero-photo" src="${esc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, ${ctx.palette.accentSoft}, ${ctx.palette.paper})"></div>`}
    </div>
  </div>
</section>`;
}

// ── scroll-reveal: huge headline that shrinks as the page scrolls past it.
// Uses CSS scroll-driven animations (animation-timeline: scroll()) — zero JS.
// Browsers without support fall back to a static large headline, which is
// still a credible hero. Decorations and the subhead/CTA progressively
// reveal as the headline scales down. `prefers-reduced-motion` disables
// all animation. Anchor id `hero` makes it easy to deep-link / scroll to.

function heroScrollReveal(ctx: RenderContext): string {
  const c = ctx.content;
  const img = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Deterministic CSS class id per spawn so multiple heroes on a multi-page
  // site don't share an @keyframes namespace.
  const ns = `sr-${ctx.slug.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'hero'}`;
  // heroOverlay dials the backdrop image opacity — heavier overlay = the
  // photo bleeds through more (paper background stays light). Vignette
  // gets a middling opacity; 'none' hides the backdrop entirely.
  const overlayKey = ctx.picks.heroOverlay ?? 'medium';
  const bgOpacity = overlayKey === 'none' ? 0
    : overlayKey === 'light' ? 0.08
    : overlayKey === 'medium' ? 0.12
    : overlayKey === 'heavy' ? 0.22
    : 0.18;
  return `<section class="hero hero-scroll-reveal" id="hero" style="position:relative;min-height:130vh;overflow:hidden;background:var(--paper)">
${decs}
  ${img && bgOpacity > 0
    ? `<div class="${ns}-bg" style="position:absolute;inset:0;z-index:0;background-image:url('${esc(img)}');background-size:cover;background-position:center;opacity:${bgOpacity}"></div>`
    : ''}
  <div class="${ns}-pin" style="position:sticky;top:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:64px 24px">
    ${superline(ctx)}
    <h1 class="${ns}-headline" style="margin:24px 0;max-width:1080px;font-size:clamp(48px,9vw,140px);line-height:0.96;letter-spacing:-0.04em">${esc(c.tagline)}</h1>
    <p class="${ns}-subhead subhead" style="max-width:560px;margin:0 auto;opacity:0">${esc(c.subhead)}</p>
    <div class="${ns}-ctas ctas" style="margin-top:32px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;opacity:0;transform:translateY(12px)">
      <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
      <a href="/features" class="cta secondary">${esc(c.secondaryCta)}</a>
    </div>
  </div>
  <style>
    .${ns}-pin { animation: ${ns}-headline-scale linear; animation-timeline: scroll(); animation-range: 0 60vh; }
    .${ns}-headline { animation: ${ns}-headline-shrink linear; animation-timeline: scroll(); animation-range: 0 60vh; }
    .${ns}-subhead { animation: ${ns}-fade-in linear; animation-timeline: scroll(); animation-range: 20vh 70vh; }
    .${ns}-ctas { animation: ${ns}-rise-in linear; animation-timeline: scroll(); animation-range: 30vh 80vh; }
    @keyframes ${ns}-headline-shrink { to { transform: scale(0.45); letter-spacing: -0.02em; } }
    @keyframes ${ns}-headline-scale { to { gap: 8px; } }
    @keyframes ${ns}-fade-in { to { opacity: 1; } }
    @keyframes ${ns}-rise-in { to { opacity: 1; transform: translateY(0); } }
    @supports not (animation-timeline: scroll()) {
      .${ns}-subhead, .${ns}-ctas { opacity: 1; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .${ns}-pin, .${ns}-headline, .${ns}-subhead, .${ns}-ctas { animation: none; }
      .${ns}-subhead, .${ns}-ctas { opacity: 1; transform: none; }
    }
  </style>
</section>`;
}

// ── manifesto-statement: long-form bold statement, no CTAs above the fold

function heroManifesto(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Break tagline into 2-3 lines visually by inserting <br> at every comma/period.
  const lines = c.tagline.split(/[.,]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const linesMarkup = lines.length > 1
    ? lines.map((line) => `<span style="display:block">${esc(line)}.</span>`).join('')
    : esc(c.tagline);
  return `<section class="hero hero-manifesto" style="position:relative;min-height:92vh;display:flex;align-items:center;padding:120px 0 96px">
${decs}
  <div class="wrap" style="max-width:1120px">
    ${superline(ctx)}
    <h1 style="max-width:1040px;font-weight:400;letter-spacing:-0.035em;line-height:1.04">${linesMarkup}</h1>
    <p class="subhead" style="margin-top:48px;max-width:560px;font-size:17px;color:var(--muted);line-height:1.65">${esc(c.subhead)}</p>
    <div class="ctas" style="margin-top:48px;display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
      <a href="/about" class="cta text-arrow" style="background:transparent;border:none;padding:0;color:var(--muted);font-weight:500;font-size:14px">${esc(c.secondaryCta)} →</a>
    </div>
  </div>
</section>`;
}

// ── split-image-caption: hero photo left, caption-block right with small heading

function heroSplitImageCaption(ctx: RenderContext): string {
  const c = ctx.content;
  const img = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  return `<section class="hero hero-split-cap" style="position:relative;padding:0">
${decs}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));min-height:88vh">
    <div class="hero-photo-wrap" style="position:relative;overflow:hidden;background:var(--accent-soft);min-height:60vh">
      ${img
        ? `<img class="hero-photo" src="${esc(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%)"></div>`}
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center;padding:80px 64px;position:relative">
      ${superline(ctx)}
      <p style="font-family:var(--font-display);font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--accent);margin-bottom:24px">${esc(ctx.params.taglineSuperline ?? 'Caption · 01')}</p>
      <h1 style="font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.05;max-width:540px;margin-bottom:24px">${esc(c.tagline)}</h1>
      <p class="subhead" style="margin-top:0;font-size:17px;color:var(--muted);line-height:1.6;max-width:480px">${esc(c.subhead)}</p>
      ${ctas(ctx)}
    </div>
  </div>
</section>`;
}

// ── side-numbers: stat row beside hero text — proof-heavy

function heroSideNumbers(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  const stats = [
    { num: String((c.features?.length ?? 6)).padStart(2, '0'), label: 'capabilities' },
    { num: String((c.pricing?.length ?? 3)).padStart(2, '0'), label: 'plans' },
    { num: '4.9', label: 'rating' },
  ];
  return `<section class="hero hero-side-nums" style="position:relative;padding:120px 0">
${decs}
  <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:64px;align-items:center">
    <div>
      ${superline(ctx)}
      <h1 style="max-width:620px">${esc(c.tagline)}</h1>
      <p class="subhead">${esc(c.subhead)}</p>
      ${ctas(ctx)}
    </div>
    <div style="display:flex;flex-direction:column;gap:32px;padding-left:32px;border-left:1px solid var(--line)">
      ${stats.map((s) => `<div>
        <div style="font-family:var(--font-display);font-size:64px;font-weight:300;line-height:1;letter-spacing:-0.03em;color:var(--ink)">${esc(s.num)}</div>
        <div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);margin-top:10px;font-family:var(--font-body)">${esc(s.label)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

// ── vertical-marquee: side-strip with scrolling brand keywords

function heroVerticalMarquee(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  const words = [
    ctx.name.toUpperCase(),
    (ctx.params.taglineSuperline ?? 'EST 2026').toUpperCase(),
    (c.about.mission?.split('.')[0] ?? 'BUILT WITH CARE').toUpperCase(),
  ].filter(Boolean);
  const ribbon = (words.join(' · ') + ' · ').repeat(6);
  return `<section class="hero hero-vmarquee" style="position:relative;min-height:88vh;display:flex;align-items:center;overflow:hidden">
${decs}
  <div style="position:absolute;left:0;top:0;bottom:0;width:48px;background:var(--ink);color:var(--paper);overflow:hidden;display:flex;align-items:center;justify-content:center">
    <div style="writing-mode:vertical-rl;white-space:nowrap;animation:vmarq 40s linear infinite;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;font-family:var(--font-body)">${esc(ribbon)}</div>
  </div>
  <div class="wrap" style="padding-left:88px">
    ${superline(ctx)}
    <h1 style="max-width:880px">${esc(c.tagline)}</h1>
    <p class="subhead">${esc(c.subhead)}</p>
    ${ctas(ctx)}
  </div>
</section>
<style>@keyframes vmarq{from{transform:translateY(0)}to{transform:translateY(-50%)}}@media (prefers-reduced-motion: reduce){.hero-vmarquee div[style*="writing-mode"]{animation:none}}</style>`;
}

// ── big-number-display: stat-led hero (taken from feature count or pricing tier count)

function heroBigNumber(ctx: RenderContext): string {
  const c = ctx.content;
  const decs = renderDecorationsForSection(ctx.decorations, 'hero');
  // Synthesize three stats from content shape.
  const stats = [
    { num: String(c.features.length || 6).padStart(2, '0'), label: 'capabilities' },
    { num: String(c.pricing.length || 3).padStart(2, '0'), label: 'plans' },
    { num: '24/7', label: 'support' },
  ];
  const statsRow = stats.map((s) => `
    <div style="text-align:center">
      <div style="font-family:var(--font-display);font-size:clamp(64px,10vw,128px);font-weight:300;line-height:0.95;letter-spacing:-0.05em;color:var(--ink)">${esc(s.num)}</div>
      <div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);margin-top:14px;font-family:var(--font-body)">${esc(s.label)}</div>
    </div>`).join('');
  return `<section class="hero hero-big-number" style="position:relative;padding:120px 0 96px">
${decs}
  <div class="wrap" style="text-align:center">
    ${superline(ctx)}
    <h1 style="margin:0 auto;max-width:880px">${esc(c.tagline)}</h1>
    <p class="subhead" style="margin:24px auto 0">${esc(c.subhead)}</p>
    <div style="margin-top:80px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:48px;padding:48px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);max-width:880px;margin-left:auto;margin-right:auto">${statsRow}</div>
    <div class="ctas" style="margin-top:56px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="/contact" class="cta primary">${esc(c.primaryCta)}</a>
      <a href="/features" class="cta secondary">${esc(c.secondaryCta)}</a>
    </div>
  </div>
</section>`;
}

// ── Page header (sub-routes) ────────────────────────────────────────────
//
// Compact editorial header for /about, /features, /pricing, /contact, etc.
// Reverses the chunk-149 fix's repetition across vertical templates by
// living inside renderHero — every template that calls renderHero(ctx)
// automatically gets distinct sub-pages instead of the marketing hero
// repeating verbatim.
//
// Title source priority:
//   1. ctx.params.customLabels[<route>]   (LLM-authored per-route label)
//   2. derived from route ("/about" → "About")
// Supporting line priority:
//   /about    → content.about.mission
//   /features → content.subhead | "Capabilities, in detail."
//   /pricing  → "Pick a plan, change any time."
//   /contact  → content.contact.blurb
//   /<other>  → undefined (no support line)

const ROUTE_LABELS: Record<string, string> = {
  '/about': 'About',
  '/features': 'Features',
  '/pricing': 'Pricing',
  '/contact': 'Contact',
};

function renderPageHeader(ctx: RenderContext): string {
  const route = ctx.currentRoute;
  const c = ctx.content;
  const cl = ctx.params.customLabels ?? {};
  let kicker = ROUTE_LABELS[route];
  if (!kicker) {
    kicker = route.replace(/^\//, '').split('/').map((s) =>
      s.charAt(0).toUpperCase() + s.slice(1)
    ).join(' · ');
  }
  // The customLabels schema is narrow — only certain keys are typed —
  // so we map known routes to known keys; falls through to the kicker.
  let heading = '';
  let support = '';
  switch (route) {
    case '/about':
      heading = c.about?.heading || cl.about || `Why ${ctx.name}`;
      support = c.about?.mission || '';
      break;
    case '/features':
      heading = cl.features || 'Everything in one place';
      support = c.subhead || `What ${ctx.name} brings to the table.`;
      break;
    case '/pricing':
      heading = cl.pricing || 'Honest pricing, no surprises';
      support = 'Pick a plan, change any time. Yearly billing saves two months.';
      break;
    case '/contact':
      heading = cl.contact || 'Tell us what you need';
      support = c.contact?.blurb || '';
      break;
    default:
      heading = kicker;
      support = '';
  }
  const supportMarkup = support
    ? `<p style="margin:24px 0 0;max-width:560px;font-size:17px;line-height:1.6;color:var(--muted)">${esc(support)}</p>`
    : '';
  return `<section style="padding:96px 0 64px;border-bottom:1px solid var(--line)">
  <div class="wrap">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(kicker)}</span>
    </div>
    <h1 style="margin:0;font-size:clamp(40px,6vw,80px);line-height:1.02;letter-spacing:-0.035em;font-family:var(--font-display);max-width:980px">${esc(heading)}</h1>
    ${supportMarkup}
  </div>
</section>`;
}

// ── Dispatcher ──────────────────────────────────────────────────────────

export function renderHero(ctx: RenderContext): string {
  // Sub-routes get the compact editorial page header, not the full
  // marketing hero (which is repetitive across pages and reads as
  // "one pager" — operator-reported bug 1, closed in chunk 149 for
  // vercel-saas, now universal across all templates).
  if (ctx.currentRoute && ctx.currentRoute !== '/') {
    return renderPageHeader(ctx);
  }
  const k: HeroKey = ctx.picks.hero;
  switch (k) {
    case 'photo-fullbleed': return heroPhotoFullbleed(ctx);
    case 'photo-split': return heroPhotoSplit(ctx);
    case 'video-loop': return heroVideoLoop(ctx);
    case 'typography-only': return heroTypographyOnly(ctx);
    case 'abstract-gradient': return heroAbstractGradient(ctx);
    case 'illustration': return heroIllustration(ctx);
    case 'product-isolate': return heroProductIsolate(ctx);
    case 'scroll-reveal': return heroScrollReveal(ctx);
    case 'manifesto-statement': return heroManifesto(ctx);
    case 'big-number-display': return heroBigNumber(ctx);
    case 'split-image-caption': return heroSplitImageCaption(ctx);
    case 'side-numbers': return heroSideNumbers(ctx);
    case 'vertical-marquee': return heroVerticalMarquee(ctx);
    default: return heroTypographyOnly(ctx);
  }
}
