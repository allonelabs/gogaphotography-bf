// Reference template: vercel-saas.
//
// Composes the page from picks + params + decorations + content. Reads from
// every _variants/* and _sections/* module. Returns all 5 routes as a record.
//
// Other templates (walkby-ecom, afisha-hotel, equivalenza-retail, ...) will
// mirror this shape; only the section sequence and template-specific
// extensions differ. The shared variant system means every template gets
// every customization axis for free.

import {
  type VariantSpec,
  type ResolvedPalette,
  type ResolvedFonts,
  type RenderContext,
  type VariantParams,
} from '../schema';
import { resolvePalette } from '../_variants/palettes';
import { resolveFonts } from '../_variants/fonts';
import { backgroundCss } from '../_variants/backgrounds';
import {
  motionCss, ctaCss, radiusCss, densityCss, typeScaleCss, imageFxCss,
  navStyleCss, footerStyleCss, hoverEffectCss, dividersCss,
} from '../_variants/styles';
import { resolveSectionOrder } from '../_variants/section-orders';
import { sanitizeParams, validateDecorations } from '../_variants/validators';
import { renderHero } from '../_sections/heroes';
import {
  renderNav, renderFeatures, renderPricing, renderTestimonials, renderFaq,
  renderAboutMission, renderCtaBand, renderFooter, renderSectionByKey,
} from '../_sections/blocks';
import { esc, linkStyleCss, accentEmphasisCss, selectStyleCss, focusRingStyleCss, scrollIndicatorCss, cardElevationCss, inputStyleCss, badgeStyleCss, imageBorderRadiusCss, customCssOverride } from '../_sections/helpers';

// (Chunk 149 had a vercel-saas-only renderPageHeader here. Chunk 151
// promoted that logic into renderHero in _sections/heroes.ts where it
// dispatches on ctx.currentRoute, so all templates benefit. This file
// just calls renderHero(ctx) on every route — home gets the marketing
// hero, sub-routes get the compact page header automatically.)

export interface TemplateInput {
  name: string;
  slug: string;
  paragraph: string;
  spec: VariantSpec;
  /** Optional generated hero image URL — written by the hero-photo phase. */
  heroImageUrl?: string;
}

export function renderSite(input: TemplateInput): Record<string, string> {
  const { spec } = input;

  // ── Resolve tokens (validated) ────────────────────────────────────────

  // Palette family first to know the paper color, then sanitize params against it.
  const initialPalette = resolvePalette(spec.picks.palette);
  const params: VariantParams = sanitizeParams(spec.params, initialPalette.paper);
  const palette: ResolvedPalette = resolvePalette(spec.picks.palette, params);
  const fonts: ResolvedFonts = resolveFonts(spec.picks.fonts);
  const decorations = validateDecorations(spec.decorations);
  const order = resolveSectionOrder(spec.picks.sectionOrder);

  // ── Build a shared base CSS once ──────────────────────────────────────

  const baseCss = `
:root{
  --ink:${palette.ink};
  --paper:${palette.paper};
  --accent:${palette.accent};
  --accent-soft:${palette.accentSoft};
  --muted:${palette.muted};
  --line:${palette.line};
  --on-accent:${palette.inkOnAccent};
  --font-display:${fonts.display};
  --font-body:${fonts.body};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
h1,h2,h3{font-family:var(--font-display);font-weight:700}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 32px}
.row{display:flex;gap:32px;align-items:center}

/* Nav */
header.nav{position:sticky;top:0;z-index:50;background:color-mix(in srgb, var(--paper) 88%, transparent);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--line)}
header.nav .row{height:64px;justify-content:space-between}
header.nav .logo{font-family:var(--font-display);font-weight:700;letter-spacing:-0.02em;font-size:18px;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:28px;align-items:center}
header.nav nav a{font-size:14px;font-weight:500;color:var(--muted);transition:color .15s ease}
header.nav nav a:hover,header.nav nav a[aria-current]{color:var(--ink)}
header.nav .cta{padding:8px 16px;font-size:13px}

/* Hero base */
.hero h1{letter-spacing:-0.04em}
.hero p.subhead{margin-top:24px;font-size:clamp(18px,2vw,22px);color:var(--muted);max-width:680px;line-height:1.4;letter-spacing:-0.01em}
.hero .ctas{margin-top:40px;display:flex;gap:12px;flex-wrap:wrap}
.kicker{font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;display:inline-flex;align-items:center;gap:8px;font-family:var(--font-body)}
.kicker::before{content:"";width:24px;height:1px;background:var(--muted)}

/* Section base */
section{padding:96px 0}
section.muted{background:color-mix(in srgb, var(--paper) 92%, var(--ink) 4%);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
h2{letter-spacing:-0.03em;max-width:780px}
h2 + p.lede{margin-top:16px;font-size:18px;color:var(--muted);max-width:640px;line-height:1.5}

/* Features */
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;margin-top:56px;background:var(--line);border:1px solid var(--line);overflow:hidden}
.feature{background:var(--paper);padding:40px 32px;position:relative}
.feature-icon{display:inline-flex;width:40px;height:40px;border-radius:10px;background:var(--accent-soft);color:var(--accent);align-items:center;justify-content:center;font-size:20px;margin-bottom:20px;font-family:var(--font-body)}
.feature h3{font-size:18px;font-weight:600;letter-spacing:-0.01em;margin-bottom:8px}
.feature p{font-size:15px;color:var(--muted);line-height:1.55}

/* Pricing */
.pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:56px;align-items:stretch}
.tier{border:1px solid var(--line);padding:40px 32px;background:var(--paper);position:relative;display:flex;flex-direction:column}
.tier.highlighted{border-color:var(--ink);box-shadow:0 4px 24px rgba(0,0,0,.06)}
.tier.highlighted::before{content:"Most popular";position:absolute;top:-12px;left:32px;background:var(--ink);color:var(--paper);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;font-family:var(--font-body)}
.tier h3{font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;font-family:var(--font-body)}
.tier .price{display:flex;align-items:baseline;gap:6px;margin-bottom:8px}
.tier .price .amount{font-size:44px;font-weight:700;letter-spacing:-0.03em;font-family:var(--font-display)}
.tier .price .period{font-size:15px;color:var(--muted)}
.tier .desc{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.5}
.tier ul{list-style:none;margin-bottom:32px;flex:1}
.tier li{font-size:14px;padding:8px 0;display:flex;align-items:flex-start;gap:10px;color:var(--ink)}
.tier li::before{content:"✓";color:var(--accent);font-weight:700;flex-shrink:0}
.tier .cta{width:100%;justify-content:center}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border-bottom:1px solid var(--line);padding:24px 0}
.faq summary{font-size:18px;font-weight:600;cursor:pointer;letter-spacing:-0.01em;list-style:none;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display)}
.faq summary::after{content:"+";font-size:24px;color:var(--muted);font-weight:400;transition:transform .2s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:14px;color:var(--muted);font-size:15px;line-height:1.55;max-width:680px}

/* Testimonials */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:56px}
.testimonial{padding:32px;border:1px solid var(--line);background:var(--paper)}
.testimonial blockquote{font-size:17px;line-height:1.5;letter-spacing:-0.01em;color:var(--ink);margin-bottom:24px;position:relative;font-family:var(--font-display)}
.testimonial .qmark{font-size:32px;color:var(--accent);line-height:1;margin-right:6px;font-family:var(--font-display)}
.testimonial .author{font-size:14px;font-weight:600}
.testimonial .role{font-size:13px;color:var(--muted);margin-top:2px}

/* About */
.about-section .about-body{margin-top:32px;max-width:680px;font-size:17px;line-height:1.65;color:var(--ink)}
.about-section .about-body p{margin-bottom:20px}
.about-section .mission{margin-top:36px;padding:32px;border-left:3px solid var(--accent);background:var(--accent-soft);font-size:18px;line-height:1.5;letter-spacing:-0.01em;font-family:var(--font-display)}
.about-section .mission .label{font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;font-family:var(--font-body)}

/* CTA band */
.cta-band{margin:120px 32px;max-width:1056px;margin-left:auto;margin-right:auto;padding:80px 48px;background:var(--ink);color:var(--paper);text-align:center;border-radius:var(--r-card,12px)}
.cta-band h2{color:var(--paper);margin:0 auto;max-width:720px}
.cta-band p{color:color-mix(in srgb, var(--paper) 80%, transparent);margin-top:16px;font-size:18px;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:36px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:var(--paper);color:var(--ink)}
.cta-band .cta.secondary{border-color:color-mix(in srgb, var(--paper) 25%, transparent);color:var(--paper)}

/* Contact card */
.contact-card{margin-top:48px;max-width:560px;padding:40px;border:1px solid var(--line);border-radius:var(--r-card,12px)}
.contact-card .email{font-size:24px;font-weight:600;letter-spacing:-0.02em;color:var(--accent);margin-bottom:12px;font-family:var(--font-display)}
.contact-card .email a:hover{text-decoration:underline}
.contact-card .blurb{color:var(--muted);font-size:16px;line-height:1.55}

/* Footer */
footer{padding:64px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .row{justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:32px}
footer .brand{font-weight:600;color:var(--ink);font-size:16px;margin-bottom:4px;font-family:var(--font-display)}
footer .tagline{max-width:320px;line-height:1.5}
footer .links{display:flex;flex-wrap:wrap;gap:24px}
footer .links a{font-size:14px;transition:color .15s ease}
footer .links a:hover{color:var(--ink)}
footer .meta{margin-top:32px;padding-top:24px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}

@media (max-width: 640px){
  .wrap{padding:0 20px}
  header.nav nav{display:none}
  section{padding:64px 0}
  .cta-band{margin:80px 16px;padding:48px 28px}
  .tier{padding:32px 24px}
}
`;

  // Per-pick CSS layers stack after the base.
  const overlayCss = [
    backgroundCss(spec.picks.background, palette, params),
    motionCss(spec.picks.motion),
    ctaCss(spec.picks.cta, palette),
    radiusCss(spec.picks.radius),
    densityCss(spec.picks.density),
    typeScaleCss(spec.picks.typeScale),
    imageFxCss(spec.picks.imageFx, palette),
    navStyleCss(spec.picks.navStyle, palette),
    footerStyleCss(spec.picks.footerStyle, palette),
    hoverEffectCss(spec.picks.hoverEffect, palette),
    dividersCss(spec.picks.dividers, palette),
  ].filter(Boolean).join('\n');

  // ── Page shell ─────────────────────────────────────────────────────────

  function shell(opts: { title: string; description: string; route: '/' | '/about' | '/features' | '/pricing' | '/contact'; body: string }): string {
    const ctxForNav: RenderContext = makeCtx(opts.route);
    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${esc(fonts.googleFontsUrl)}"/>
<style>${baseCss}${overlayCss}${linkStyleCss(spec.picks.linkStyle)}${accentEmphasisCss(spec.picks.accentEmphasis)}${selectStyleCss(spec.picks.selectStyle)}${focusRingStyleCss(spec.picks.focusRingStyle)}${scrollIndicatorCss(spec.picks.scrollIndicator)}${cardElevationCss(spec.picks.cardElevation)}${inputStyleCss(spec.picks.inputStyle)}${badgeStyleCss(spec.picks.badgeStyle)}${imageBorderRadiusCss(spec.picks.imageBorderRadius)}${customCssOverride(spec.params.customCss)}</style>
</head>
<body>
${renderNav(ctxForNav)}
${opts.body}
</body></html>`;
  }

  // ── Build a per-route RenderContext ────────────────────────────────────

  function makeCtx(route: '/' | '/about' | '/features' | '/pricing' | '/contact'): RenderContext {
    return {
      name: input.name,
      slug: input.slug,
      paragraph: input.paragraph,
      palette,
      fonts,
      picks: spec.picks,
      params,
      decorations,
      content: spec.content,
      assets: { heroImageUrl: input.heroImageUrl },
      currentRoute: route,
    };
  }

  // ── Home: hero + ordered sections + footer ────────────────────────────

  function renderHome(): string {
    const ctx = makeCtx('/');
    const sections = order.map((k) => renderSectionByKey(ctx, k)).join('\n');
    return shell({
      title: `${input.name} — ${spec.content.tagline}`,
      description: spec.content.subhead,
      route: '/',
      body: `${renderHero(ctx)}\n${sections}\n${renderFooter(ctx)}`,
    });
  }

  // ── About ─────────────────────────────────────────────────────────────

  function renderAboutPage(): string {
    const ctx = makeCtx('/about');
    const c = spec.content;
    return shell({
      title: `About — ${input.name}`,
      description: c.about.mission,
      route: '/about',
      body: `${renderHero(ctx)}
${renderAboutMission(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  // ── Features ──────────────────────────────────────────────────────────

  function renderFeaturesPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Features — ${input.name}`,
      description: `What ${input.name} does, in detail.`,
      route: '/features',
      body: `${renderHero(ctx)}
${renderFeatures(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  // ── Pricing ───────────────────────────────────────────────────────────

  function renderPricingPage(): string {
    const ctx = makeCtx('/pricing');
    return shell({
      title: `Pricing — ${input.name}`,
      description: `Plans and pricing for ${input.name}.`,
      route: '/pricing',
      body: `${renderHero(ctx)}
${renderPricing(ctx)}
${renderFaq(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  // ── Contact ───────────────────────────────────────────────────────────

  function renderContactPage(): string {
    const ctx = makeCtx('/contact');
    const c = spec.content;
    return shell({
      title: `Contact — ${input.name}`,
      description: c.contact.blurb,
      route: '/contact',
      body: `${renderHero(ctx)}
<section style="padding:80px 0">
  <div class="wrap">
    <div class="contact-card">
      <div class="email"><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></div>
      <div class="blurb">${esc(c.contact.blurb)}</div>
    </div>
  </div>
</section>
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  return {
    'index.html': renderHome(),
    'about.html': renderAboutPage(),
    'features.html': renderFeaturesPage(),
    'pricing.html': renderPricingPage(),
    'contact.html': renderContactPage(),
  };
}
