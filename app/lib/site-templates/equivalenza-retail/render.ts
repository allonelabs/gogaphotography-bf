// equivalenza-retail template — polished boutique retail.
//
// Aesthetic source: github.com/allonelabs/equivalenza-geo. Marquee bands,
// USP trust strip, featured collection product cards, shop-by-mood slider,
// info tabs, retail-style newsletter capture.
//
// Fits perfumery / cosmetics / candle / fragrance / curated retail briefs.

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
import { renderNav, renderTestimonials, renderFaq, renderCtaBand, renderFooter } from '../_sections/blocks';
import {
  renderMarquee, renderUSPStrip, renderFeaturedCollection,
  renderMoodSlider, renderInfoTabs, renderRetailNewsletter,
} from '../_sections/retail';
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
h1,h2,h3{font-family:var(--font-display);font-weight:500}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1280px;margin:0 auto;padding:0 32px}
.row{display:flex;gap:32px;align-items:center}

/* Nav — boutique retail flat */
header.nav{position:sticky;top:0;z-index:50;background:var(--paper);border-bottom:1px solid var(--line)}
header.nav .row{height:68px;justify-content:space-between;max-width:1280px;margin:0 auto;padding:0 32px}
header.nav .logo{font-family:var(--font-display);font-weight:500;letter-spacing:0.18em;font-size:20px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:5px;height:5px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:28px;align-items:center}
header.nav nav a{font-size:12px;font-weight:500;color:var(--ink);letter-spacing:0.16em;text-transform:uppercase;transition:color .15s ease}
header.nav nav a:hover{color:var(--accent)}
header.nav nav a[aria-current]{color:var(--accent)}
header.nav .cta{padding:10px 22px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase}

/* Hero override for retail aesthetic */
.hero h1{letter-spacing:-0.02em;font-weight:500;font-family:var(--font-display)}
.hero p.subhead{margin-top:24px;font-size:17px;color:var(--muted);max-width:600px;letter-spacing:0;line-height:1.6}
.hero .ctas{margin-top:36px;display:flex;gap:12px;flex-wrap:wrap}
.kicker{font-size:11px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;display:inline-flex;align-items:center;gap:12px;font-family:var(--font-body)}
.kicker::before{content:"";width:32px;height:1px;background:var(--accent)}

/* Sections */
section{padding:80px 0}

/* CTA band */
.cta-band{margin:96px 32px;max-width:1216px;margin-left:auto;margin-right:auto;padding:80px 48px;background:var(--accent);color:var(--on-accent);text-align:center}
.cta-band h2{color:var(--on-accent);margin:0 auto;max-width:780px;font-weight:500;letter-spacing:-0.02em;font-family:var(--font-display)}
.cta-band p{color:color-mix(in srgb, var(--on-accent) 80%, transparent);margin-top:18px;font-size:16px;line-height:1.6;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:32px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:var(--on-accent);color:var(--accent)}
.cta-band .cta.secondary{border-color:color-mix(in srgb, var(--on-accent) 35%, transparent);color:var(--on-accent)}

/* Contact card */
.contact-card{margin-top:48px;max-width:560px;padding:40px;border:1px solid var(--line)}
.contact-card .email{font-size:22px;font-weight:500;letter-spacing:-0.01em;color:var(--accent);margin-bottom:12px;font-family:var(--font-display)}
.contact-card .blurb{color:var(--muted);font-size:15px;line-height:1.6}

/* Footer — boutique 4-col retail grid: Brand · Shop · Wellness · Connect */
footer{padding:64px 0 40px;background:var(--paper);border-top:1px solid var(--line);color:var(--muted);font-size:13px;letter-spacing:0.02em}
footer > .wrap, footer .footer-grid, footer .meta{max-width:1280px;margin-left:auto;margin-right:auto;padding-left:32px;padding-right:32px}
footer .footer-grid{display:grid;grid-template-columns:1fr;gap:40px;padding:48px 0}
@media (min-width:640px){footer .footer-grid{grid-template-columns:1fr 1fr}}
@media (min-width:1024px){footer .footer-grid{grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px}}
footer .col-brand h3{font-family:var(--font-display);font-weight:500;color:var(--ink);font-size:24px;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:14px}
footer .col-brand p{max-width:300px;line-height:1.7;letter-spacing:0;color:var(--muted);font-size:13px}
footer h4{font-family:var(--font-body);font-size:10px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:var(--ink);margin-bottom:20px}
footer ul{list-style:none}
footer ul li{margin-bottom:10px}
footer ul a{font-size:13px;color:var(--muted);transition:color .25s ease;letter-spacing:0.02em}
footer ul a:hover{color:var(--accent)}
footer .social{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
footer .social a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--line);border-radius:50%;color:var(--muted);transition:color .25s ease,border-color .25s ease}
footer .social a:hover{color:var(--accent);border-color:var(--accent)}
footer .meta{padding-top:24px;padding-bottom:0;border-top:1px solid var(--line);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border-bottom:1px solid var(--line);padding:24px 0}
.faq summary{font-size:17px;font-weight:500;cursor:pointer;letter-spacing:-0.01em;list-style:none;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display)}
.faq summary::after{content:"+";font-size:22px;color:var(--muted);font-weight:300;transition:transform .2s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:14px;color:var(--muted);font-size:14px;line-height:1.6;max-width:680px}

/* Testimonials carousel-y */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:48px}
.testimonial{padding:36px;background:var(--accent-soft);border:none}
.testimonial blockquote{font-size:16px;line-height:1.6;color:var(--ink);margin-bottom:24px;letter-spacing:0;font-family:var(--font-display);font-style:italic}
.testimonial .qmark{font-size:30px;color:var(--accent);line-height:0;margin-right:6px;font-style:normal}
.testimonial .author{font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:500}
.testimonial .role{font-size:11px;color:var(--muted);margin-top:4px;letter-spacing:0.08em}

@media (max-width: 640px){
  .wrap{padding:0 20px}
  header.nav nav{display:none}
  section{padding:56px 0}
  .cta-band{margin:64px 16px;padding:56px 28px}
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

  // Boutique 4-col footer — Brand / Shop / Wellness / Follow.
  function renderEquivalenzaFooter(ctx: RenderContext): string {
    const year = new Date().getFullYear();
    return `<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="col-brand">
        <h3>${esc(ctx.name)}</h3>
        <p>${esc(ctx.content.footer.tagline)}</p>
      </div>
      <div>
        <h4>Shop</h4>
        <ul>
          <li><a href="/features">New arrivals</a></li>
          <li><a href="/features">Collection</a></li>
          <li><a href="/pricing">All products</a></li>
          <li><a href="/about">Story</a></li>
        </ul>
      </div>
      <div>
        <h4>Care</h4>
        <ul>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/contact">Shipping</a></li>
          <li><a href="/contact">Returns</a></li>
          <li><a href="/contact">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Follow</h4>
        <div class="social">
          <a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor"/></svg></a>
          <a href="#" aria-label="Pinterest"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.5 0-10 4.5-10 10 0 4.3 2.7 7.9 6.5 9.3-.1-.8-.2-2 0-2.8.2-.8 1.2-4.9 1.2-4.9s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .8-.5 2.1-.8 3.2-.2.9.5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.3 0-2.3-1.6-3.9-3.9-3.9-2.7 0-4.2 2-4.2 4 0 .8.3 1.6.7 2.1.1.1.1.2.1.3 0 .3-.2 1-.2 1.2-.1.2-.2.2-.4.1-1.4-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.6 7.2-6.6 3.8 0 6.7 2.7 6.7 6.3 0 3.8-2.4 6.8-5.7 6.8-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.3 1-.9 2.2-1.3 3 .9.3 1.9.5 3 .5 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg></a>
          <a href="#" aria-label="Email"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg></a>
        </div>
      </div>
    </div>
    <div class="meta">
      <span>© ${year} ${esc(ctx.name)}</span>
      <span>Built with AllOnce</span>
    </div>
  </div>
</footer>`;
  }

  function renderHome(): string {
    const ctx = makeCtx('/');
    return shell({
      title: `${input.name} — ${spec.content.tagline}`,
      description: spec.content.subhead,
      route: '/',
      body: `${renderHero(ctx)}
${renderMarquee(ctx)}
${renderFeaturedCollection(ctx, spec.content.about.heading)}
${renderUSPStrip(ctx)}
${renderMoodSlider(ctx)}
${renderInfoTabs(ctx)}
${renderTestimonials(ctx)}
${renderRetailNewsletter(ctx)}
${renderEquivalenzaFooter(ctx)}`,
    });
  }

  function renderAbout(): string {
    const ctx = makeCtx('/about');
    return shell({
      title: `About — ${input.name}`,
      description: spec.content.about.mission,
      route: '/about',
      body: `${renderHero(ctx)}
${renderInfoTabs(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderEquivalenzaFooter(ctx)}`,
    });
  }

  function renderFeaturesPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Collection — ${input.name}`,
      description: `Browse ${input.name} — every product, every category.`,
      route: '/features',
      body: `${renderHero(ctx)}
${renderMarquee(ctx, 'NEW ARRIVALS · WORLDWIDE SHIPPING · 30 DAY RETURNS')}
${renderFeaturedCollection(ctx, 'New arrivals')}
${renderMoodSlider(ctx)}
${renderUSPStrip(ctx)}
${renderRetailNewsletter(ctx)}
${renderEquivalenzaFooter(ctx)}`,
    });
  }

  function renderPricingPage(): string {
    const ctx = makeCtx('/pricing');
    return shell({
      title: `Shop — ${input.name}`,
      description: `Shop ${input.name} — every product, every price.`,
      route: '/pricing',
      body: `${renderHero(ctx)}
${renderFeaturedCollection(ctx, 'Shop')}
${renderFaq(ctx)}
${renderCtaBand(ctx)}
${renderEquivalenzaFooter(ctx)}`,
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
${renderRetailNewsletter(ctx)}
${renderEquivalenzaFooter(ctx)}`,
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
