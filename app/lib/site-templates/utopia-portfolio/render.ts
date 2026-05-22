// utopia-portfolio template — awwwards-aesthetic creative studio.
//
// Restrained monochrome, big editorial type, project-led layout, awards
// strip, manifesto block. For creative agencies, motion houses,
// independent designers, portfolio sites, type foundries.

import type { VariantSpec, RenderContext, ResolvedPalette, ResolvedFonts, VariantParams } from '../schema';
import { resolvePalette } from '../_variants/palettes';
import { resolveFonts } from '../_variants/fonts';
import { backgroundCss } from '../_variants/backgrounds';
import {
  motionCss, ctaCss, radiusCss, densityCss, typeScaleCss, imageFxCss,
  navStyleCss, footerStyleCss, hoverEffectCss, dividersCss,
} from '../_variants/styles';
import { sanitizeParams, validateDecorations } from '../_variants/validators';
import { renderHero } from '../_sections/heroes';
import {
  renderNav, renderTestimonials, renderFaq, renderCtaBand, renderFooter,
} from '../_sections/blocks';
import {
  renderProjectGrid, renderCaseStudy, renderWorkProcess,
  renderAwardsStrip, renderManifesto,
} from '../_sections/portfolio';
import { esc, linkStyleCss, accentEmphasisCss, selectStyleCss, focusRingStyleCss, scrollIndicatorCss, cardElevationCss, inputStyleCss, badgeStyleCss, imageBorderRadiusCss, customCssOverride } from '../_sections/helpers';

export interface TemplateInput {
  name: string;
  slug: string;
  paragraph: string;
  spec: VariantSpec;
  heroImageUrl?: string;
}

export function renderSite(input: TemplateInput): Record<string, string> {
  const { spec } = input;
  const initialPalette = resolvePalette(spec.picks.palette);
  const params: VariantParams = sanitizeParams(spec.params, initialPalette.paper);
  const palette: ResolvedPalette = resolvePalette(spec.picks.palette, params);
  const fonts: ResolvedFonts = resolveFonts(spec.picks.fonts);
  const decorations = validateDecorations(spec.decorations);

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
body{font-family:var(--font-body);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background:var(--paper)}
h1,h2,h3{font-family:var(--font-display);font-weight:400}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1280px;margin:0 auto;padding:0 32px}
.row{display:flex;gap:32px;align-items:center}

/* Nav — flat, type-led */
header.nav{position:sticky;top:0;z-index:50;background:var(--paper);border-bottom:1px solid var(--line)}
header.nav .row{height:80px;justify-content:space-between;max-width:1280px;margin:0 auto;padding:0 32px}
header.nav .logo{font-family:var(--font-display);font-weight:500;letter-spacing:-0.01em;font-size:22px;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:6px;height:6px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:32px;align-items:center}
header.nav nav a{font-size:13px;font-weight:500;color:var(--ink);letter-spacing:0.02em;transition:opacity .15s ease}
header.nav nav a:hover{opacity:.55}
header.nav nav a[aria-current]{opacity:.55}
header.nav .cta{padding:12px 24px;font-size:13px;letter-spacing:0;text-transform:none}

/* Hero — editorial, generous */
.hero h1{letter-spacing:-0.04em;font-weight:400;font-family:var(--font-display)}
.hero p.subhead{margin-top:32px;font-size:18px;color:var(--muted);max-width:520px;line-height:1.6}
.hero .ctas{margin-top:48px;display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.kicker{font-size:11px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;display:inline-flex;align-items:center;gap:12px;font-family:var(--font-body)}
.kicker::before{content:"";width:32px;height:1px;background:var(--muted)}

section{padding:120px 0}

/* CTA band — black + restrained */
.cta-band{margin:160px 32px;max-width:1216px;margin-left:auto;margin-right:auto;padding:120px 64px;background:var(--ink);color:var(--paper);text-align:center}
.cta-band h2{color:var(--paper);margin:0 auto;max-width:880px;font-weight:400;letter-spacing:-0.025em;font-family:var(--font-display);font-size:clamp(36px,5vw,64px);line-height:1.06}
.cta-band p{color:color-mix(in srgb, var(--paper) 75%, transparent);margin-top:24px;font-size:17px;line-height:1.6;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:48px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:var(--paper);color:var(--ink)}
.cta-band .cta.secondary{border-color:color-mix(in srgb, var(--paper) 30%, transparent);color:var(--paper)}

/* Contact card */
.contact-card{margin-top:48px;max-width:560px;padding:48px;border:1px solid var(--line)}
.contact-card .email{font-size:24px;font-weight:400;letter-spacing:-0.01em;color:var(--accent);margin-bottom:14px;font-family:var(--font-display)}
.contact-card .blurb{color:var(--muted);font-size:15px;line-height:1.65}

/* Footer */
footer{padding:96px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
footer .row{justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:48px;max-width:1280px;margin:0 auto;padding:0 32px}
footer .brand{font-weight:500;color:var(--ink);font-size:22px;margin-bottom:8px;font-family:var(--font-display);letter-spacing:-0.01em}
footer .tagline{max-width:320px;line-height:1.6}
footer .links{display:flex;flex-wrap:wrap;gap:28px}
footer .links a{font-size:13px;letter-spacing:0;transition:color .15s ease}
footer .links a:hover{color:var(--ink)}
footer .meta{margin-top:64px;padding:32px 32px 0;border-top:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;max-width:1280px;margin-left:auto;margin-right:auto}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border-bottom:1px solid var(--line);padding:28px 0}
.faq summary{font-size:20px;font-weight:400;cursor:pointer;letter-spacing:-0.015em;list-style:none;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display)}
.faq summary::after{content:"+";font-size:22px;color:var(--muted);font-weight:300;transition:transform .2s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:14px;color:var(--muted);font-size:15px;line-height:1.65;max-width:680px}

/* Testimonials */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;margin-top:64px}
.testimonial{padding:0;background:transparent;border:none;border-top:1px solid var(--line);padding-top:32px}
.testimonial blockquote{font-size:18px;line-height:1.65;color:var(--ink);margin-bottom:28px;letter-spacing:-0.005em;font-family:var(--font-display)}
.testimonial .qmark{font-size:28px;color:var(--accent);line-height:0;margin-right:6px}
.testimonial .author{font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:500}
.testimonial .role{font-size:12px;color:var(--muted);margin-top:4px;letter-spacing:0.04em}

@media (max-width: 640px){
  .wrap{padding:0 20px}
  header.nav nav{display:none}
  section{padding:80px 0}
  .cta-band{margin:96px 16px;padding:80px 28px}
}
`;

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

  function makeCtx(route: '/' | '/about' | '/features' | '/pricing' | '/contact'): RenderContext {
    return {
      name: input.name, slug: input.slug, paragraph: input.paragraph,
      palette, fonts, picks: spec.picks, params, decorations,
      content: spec.content,
      assets: { heroImageUrl: input.heroImageUrl },
      currentRoute: route,
    };
  }

  function shell(opts: { title: string; description: string; route: '/' | '/about' | '/features' | '/pricing' | '/contact'; body: string }): string {
    const ctxForNav = makeCtx(opts.route);
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

  function renderHome(): string {
    const ctx = makeCtx('/');
    return shell({
      title: `${input.name} — ${spec.content.tagline}`,
      description: spec.content.subhead,
      route: '/',
      body: `${renderHero(ctx)}
${renderProjectGrid(ctx)}
${renderCaseStudy(ctx)}
${renderManifesto(ctx)}
${renderAwardsStrip(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderAbout(): string {
    const ctx = makeCtx('/about');
    return shell({
      title: `About — ${input.name}`,
      description: spec.content.about.mission,
      route: '/about',
      body: `${renderHero(ctx)}
${renderManifesto(ctx)}
${renderWorkProcess(ctx)}
${renderAwardsStrip(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderFeaturesPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Work — ${input.name}`,
      description: `Selected work from ${input.name}.`,
      route: '/features',
      body: `${renderHero(ctx)}
${renderProjectGrid(ctx)}
${renderCaseStudy(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderPricingPage(): string {
    const ctx = makeCtx('/pricing');
    return shell({
      title: `Engagement — ${input.name}`,
      description: `How we work with clients.`,
      route: '/pricing',
      body: `${renderHero(ctx)}
${renderWorkProcess(ctx)}
${renderFaq(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderContactPage(): string {
    const ctx = makeCtx('/contact');
    const c = spec.content;
    return shell({
      title: `Contact — ${input.name}`,
      description: c.contact.blurb,
      route: '/contact',
      body: `${renderHero(ctx)}
<section style="padding-top:0">
  <div class="wrap">
    <div class="contact-card">
      <div class="email"><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></div>
      <div class="blurb">${esc(c.contact.blurb)}</div>
    </div>
  </div>
</section>
${renderAwardsStrip(ctx)}
${renderFooter(ctx)}`,
    });
  }

  return {
    'index.html': renderHome(),
    'about.html': renderAbout(),
    'features.html': renderFeaturesPage(),
    'pricing.html': renderPricingPage(),
    'contact.html': renderContactPage(),
  };
}
