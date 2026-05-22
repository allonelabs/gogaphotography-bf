// walkby-ecom template — high-fashion editorial e-commerce.
//
// Aesthetic source: github.com/allonelabs/walkby. Uppercase tracking-wide
// typography, full-bleed photographic hero, 5-up category grid, lookbook,
// announcement bar at the top, newsletter capture before the footer.
//
// Consumes the same VariantSpec as vercel-saas — the variant system still
// drives palette/fonts/motion/decorations/content. Only the section
// composition (and a handful of ecom-flavored sections) differs.

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
  renderNav, renderTestimonials, renderFaq, renderAboutMission,
  renderCtaBand, renderFooter,
} from '../_sections/blocks';
import {
  renderAnnouncementBar, renderCollectionGrid, renderLookbook, renderLookbookMosaic,
  renderFeaturedProducts, renderNewsletter, renderProductDetail,
  renderCartBody, renderCheckoutBody, renderThankYouBody, renderReviewsGrid,
  renderCategoryBody,
} from '../_sections/ecom';
import { esc, linkStyleCss, accentEmphasisCss, selectStyleCss, focusRingStyleCss, scrollIndicatorCss, cardElevationCss, inputStyleCss, badgeStyleCss, imageBorderRadiusCss, customCssOverride } from '../_sections/helpers';

export interface TemplateInput {
  name: string;
  slug: string;
  paragraph: string;
  spec: VariantSpec;
  heroImageUrl?: string;
  products?: ReadonlyArray<{
    id: string; name: string; slug: string; description: string;
    priceCents: number; currency: string; imageName: string; inventory: number;
    status: 'draft' | 'active' | 'archived';
    categorySlug?: string;
  }>;
  categories?: ReadonlyArray<{
    id: string; name: string; slug: string; description: string;
  }>;
}

export function renderSite(input: TemplateInput): Record<string, string> {
  const { spec } = input;
  const initialPalette = resolvePalette(spec.picks.palette);
  const params: VariantParams = sanitizeParams(spec.params, initialPalette.paper);
  const palette: ResolvedPalette = resolvePalette(spec.picks.palette, params);
  const fonts: ResolvedFonts = resolveFonts(spec.picks.fonts);
  const decorations = validateDecorations(spec.decorations);

  // ── Base CSS — adapted from vercel-saas but with walkby's spacing rules ──

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
h1,h2,h3{font-family:var(--font-display);font-weight:300}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1440px;margin:0 auto;padding:0 24px}
@media (min-width:768px){.wrap{padding:0 40px}}
@media (min-width:1024px){.wrap{padding:0 40px}}
.row{display:flex;gap:32px;align-items:center}

/* Walkby sticky nav — centered logo, links flanking */
header.nav{position:sticky;top:0;z-index:50;background:color-mix(in srgb, var(--paper) 94%, transparent);backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);border-bottom:1px solid var(--line)}
header.nav .row{height:72px;justify-content:space-between;max-width:1440px;margin:0 auto;padding:0 24px}
@media (min-width:768px){header.nav .row{padding:0 40px}}
header.nav .logo{font-family:var(--font-display);font-weight:400;letter-spacing:0.32em;font-size:16px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:5px;height:5px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:32px;align-items:center}
header.nav nav a{font-size:11px;font-weight:500;color:var(--ink);letter-spacing:0.24em;text-transform:uppercase;transition:opacity .25s ease}
header.nav nav a:hover{opacity:.55}
header.nav nav a[aria-current]{opacity:.55}
header.nav .cta{padding:10px 22px;font-size:10.5px;letter-spacing:0.24em;text-transform:uppercase;border:1px solid var(--ink);background:transparent;color:var(--ink)}
header.nav .cta:hover{background:var(--ink);color:var(--paper)}

/* Hero — walkby pattern: huge type uppercase tracking-wide, glass CTA */
.hero h1{letter-spacing:0.18em;text-transform:uppercase;font-weight:300;font-size:clamp(36px,5vw,72px) !important}
.hero p.subhead{margin-top:24px;font-size:13px;color:rgba(255,255,255,.78);max-width:560px;letter-spacing:0.18em;text-transform:uppercase}
.hero.hero-fullbleed p.subhead{color:rgba(255,255,255,.78)}
.hero .ctas{margin-top:40px;display:flex;gap:12px;flex-wrap:wrap}
.hero.hero-fullbleed .cta.primary,.hero.hero-fullbleed .cta.accent{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:16px 36px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;border-radius:0;transition:background .25s ease,transform .15s ease}
.hero.hero-fullbleed .cta.primary:hover,.hero.hero-fullbleed .cta.accent:hover{background:rgba(255,255,255,.28);transform:none;box-shadow:none}
.hero.hero-fullbleed .cta.secondary{background:transparent;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.32);padding:16px 32px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;border-radius:0}
.kicker{font-size:10px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px;display:inline-flex;align-items:center;gap:8px;font-family:var(--font-body)}
.hero.hero-fullbleed .kicker{color:rgba(255,255,255,.7)}
.hero.hero-fullbleed .kicker::before{content:none}
.hero:not(.hero-fullbleed) .kicker{color:var(--muted)}
.hero:not(.hero-fullbleed) .kicker::before{content:"—";color:var(--muted)}

/* Section spacing — walkby is generous */
section{padding:80px 0}
@media (min-width:768px){section{padding:96px 0}}

/* Section-eyebrow style (h2 over content) */
section.muted{background:transparent}
h2{letter-spacing:0.24em;font-weight:500;font-size:11px;text-transform:uppercase}
h2.display{letter-spacing:-0.025em;font-weight:300;font-size:clamp(32px,4vw,52px);text-transform:none}

/* Feature grid (when used) — minimal walkby tile */
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1px;margin-top:48px;background:var(--line);border:1px solid var(--line)}
.feature{background:var(--paper);padding:40px 32px;border:none}
.feature .feature-icon{font-size:16px;color:var(--accent);margin-bottom:24px;font-family:var(--font-body)}
.feature h3{font-size:13px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:10px;font-family:var(--font-body)}
.feature p{font-size:13px;color:var(--muted);line-height:1.6;letter-spacing:0.02em}

/* CTA band — walkby editorial black */
.cta-band{margin:120px 24px;max-width:1392px;margin-left:auto;margin-right:auto;padding:96px 32px;background:var(--ink);color:var(--paper);text-align:center}
@media (min-width:768px){.cta-band{margin:120px 40px;padding:120px 64px}}
.cta-band h2{color:var(--paper);margin:0 auto;max-width:780px;font-weight:300;letter-spacing:0.04em;text-transform:uppercase;font-size:clamp(28px,4vw,44px)}
.cta-band p{color:rgba(255,255,255,.65);margin-top:24px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:40px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.32);backdrop-filter:blur(12px);padding:16px 36px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase}
.cta-band .cta.primary:hover{background:rgba(255,255,255,.28)}
.cta-band .cta.secondary{border:1px solid rgba(255,255,255,.32);color:var(--paper);padding:16px 32px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase}

/* Contact card */
.contact-card{margin-top:48px;max-width:560px;padding:40px;border:1px solid var(--line)}
.contact-card .email{font-size:18px;font-weight:400;letter-spacing:0.08em;color:var(--ink);margin-bottom:12px;font-family:var(--font-body);text-transform:lowercase}
.contact-card .blurb{color:var(--muted);font-size:13px;line-height:1.6;letter-spacing:0.04em}

/* Footer — 4-col walkby grid */
footer{padding:64px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;letter-spacing:0.04em;background:var(--paper)}
footer > .wrap{max-width:1440px;margin:0 auto;padding:0 24px}
@media (min-width:768px){footer > .wrap{padding:0 40px}}
footer .footer-grid{display:grid;grid-template-columns:1fr;gap:40px;padding:64px 0}
@media (min-width:640px){footer .footer-grid{grid-template-columns:1fr 1fr}}
@media (min-width:1024px){footer .footer-grid{grid-template-columns:repeat(4,1fr);gap:40px}}
footer .col-brand h3{font-size:12px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:var(--ink);margin-bottom:24px;font-family:var(--font-body)}
footer .col-brand p{font-size:13px;color:var(--muted);line-height:1.7;letter-spacing:0.02em}
footer h4{font-size:10px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:var(--ink);margin-bottom:24px;font-family:var(--font-body)}
footer ul{list-style:none}
footer ul li{margin-bottom:12px}
footer ul a{font-size:13px;color:var(--muted);transition:color .25s ease;letter-spacing:0.02em}
footer ul a:hover{color:var(--ink)}
footer .meta{padding:24px 0;border-top:1px solid var(--line);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;letter-spacing:0.08em}
footer .social{display:flex;gap:12px;align-items:center}
footer .social a{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--line);border-radius:50%;color:var(--muted);transition:color .25s ease,border-color .25s ease}
footer .social a:hover{color:var(--ink);border-color:var(--ink)}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border-bottom:1px solid var(--line);padding:24px 0}
.faq summary{font-size:14px;font-weight:500;cursor:pointer;letter-spacing:0.08em;list-style:none;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-body);text-transform:uppercase}
.faq summary::after{content:"+";font-size:18px;color:var(--muted);font-weight:300;transition:transform .25s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:14px;color:var(--muted);font-size:13px;line-height:1.65;letter-spacing:0.04em}

/* Testimonials — flat editorial walkby */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:40px;margin-top:48px}
.testimonial{padding:32px 0;border-top:1px solid var(--line);background:transparent}
.testimonial blockquote{font-size:14px;line-height:1.7;color:var(--ink);margin-bottom:24px;letter-spacing:0.02em;font-family:var(--font-body);font-style:italic}
.testimonial .qmark{font-size:24px;color:var(--accent);line-height:1;margin-right:6px;font-style:normal}
.testimonial .author{font-size:10px;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;font-family:var(--font-body)}
.testimonial .role{font-size:10px;color:var(--muted);margin-top:4px;letter-spacing:0.16em;text-transform:uppercase;font-family:var(--font-body)}

@media (max-width: 640px){
  header.nav nav{display:none}
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
      products: input.products,
      categories: input.categories,
      currentRoute: route,
    };
  }

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
${renderAnnouncementBar(ctxForNav)}
${renderNav(ctxForNav)}
${opts.body}
</body></html>`;
  }

  // Walkby-style 4-column footer — Brand / Shop / Service / Connect.
  function renderWalkbyFooter(ctx: RenderContext): string {
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
          <li><a href="/features">All products</a></li>
          <li><a href="/features">New arrivals</a></li>
          <li><a href="/features">Featured</a></li>
          <li><a href="/pricing">Collections</a></li>
        </ul>
      </div>
      <div>
        <h4>Customer service</h4>
        <ul>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/contact">Shipping & returns</a></li>
          <li><a href="/contact">Care guide</a></li>
        </ul>
      </div>
      <div>
        <h4>Follow</h4>
        <div class="social">
          <a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor"/></svg></a>
          <a href="#" aria-label="Twitter"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1-1.5-1.6-4.1-1.7-5.8-.2-1 .8-1.5 2.1-1.4 3.4-3.4-.2-6.5-1.7-8.6-4.3-.4.7-.5 1.4-.5 2.2 0 1.5.8 2.8 1.9 3.5-.6 0-1.2-.1-1.8-.4 0 2.2 1.6 4 3.6 4.4-.6.2-1.2.2-1.8.1.5 1.7 2.1 3 4 3-1.8 1.4-4.1 2-6.3 1.8 2 1.3 4.3 2 6.7 2 8 0 12.3-6.6 12.3-12.3v-.6c.8-.6 1.6-1.4 2.1-2.2z"/></svg></a>
          <a href="#" aria-label="TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.3c-1.4 0-2.6-1.1-2.6-2.4V3h-3.4v12.5c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2c.2 0 .5 0 .7.1V10c-.2 0-.5-.1-.7-.1-3.1 0-5.6 2.5-5.6 5.6S8.3 21.1 11.4 21.1s5.6-2.5 5.6-5.6V9.7c1 .6 2.2 1 3.4 1V7.3c-.3 0-.5-.1-.8-.1z"/></svg></a>
        </div>
      </div>
    </div>
    <div class="meta">
      <span>© ${year} ${esc(ctx.name)} · All rights reserved</span>
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
${renderCollectionGrid(ctx)}
${renderLookbookMosaic(ctx)}
${renderFeaturedProducts(ctx)}
${renderReviewsGrid(ctx)}
${renderNewsletter(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  function renderAbout(): string {
    const ctx = makeCtx('/about');
    return shell({
      title: `About — ${input.name}`,
      description: spec.content.about.mission,
      route: '/about',
      body: `${renderHero(ctx)}
${renderAboutMission(ctx)}
${renderTestimonials(ctx)}
${renderCtaBand(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  function renderFeaturesPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Collection — ${input.name}`,
      description: `Browse ${input.name}'s collection.`,
      route: '/features',
      body: `${renderHero(ctx)}
${renderCollectionGrid(ctx)}
${renderFeaturedProducts(ctx)}
${renderLookbookMosaic(ctx)}
${renderCtaBand(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  function renderPricingPage(): string {
    const ctx = makeCtx('/pricing');
    return shell({
      title: `Shop — ${input.name}`,
      description: `Shop ${input.name}.`,
      route: '/pricing',
      body: `${renderHero(ctx)}
${renderFeaturedProducts(ctx)}
${renderFaq(ctx)}
${renderCtaBand(ctx)}
${renderWalkbyFooter(ctx)}`,
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
<section>
  <div class="wrap">
    <div class="contact-card">
      <div class="email"><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></div>
      <div class="blurb">${esc(c.contact.blurb)}</div>
    </div>
  </div>
</section>
${renderNewsletter(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  // Per-product detail pages — one HTML per active product.
  // Preview proxy resolves /product/<slug> → product-<slug>.html (uploaded
  // as product-<slug>.html alongside index/about/etc).
  const productPages: Record<string, string> = {};
  const activeProducts = (input.products ?? []).filter((p) => p.status === 'active');
  for (const p of activeProducts) {
    const ctx = makeCtx('/features'); // route is /product/<slug>; map to features for nav highlight
    const body = renderProductDetail(ctx, p);
    productPages[`product-${p.slug}.html`] = shell({
      title: `${p.name} — ${input.name}`,
      description: p.description.slice(0, 160) || `${p.name} — ${input.name}`,
      route: '/features',
      body: `${body}
${renderCtaBand(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  // Per-category landing pages — one HTML per category.
  // Preview proxy resolves /category/<slug> → category-<slug>.html.
  const categoryPages: Record<string, string> = {};
  for (const cat of input.categories ?? []) {
    const ctx = makeCtx('/features');
    const body = renderCategoryBody(ctx, cat);
    categoryPages[`category-${cat.slug}.html`] = shell({
      title: `${cat.name} — ${input.name}`,
      description: cat.description || `Browse ${cat.name} at ${input.name}.`,
      route: '/features',
      body: `${body}
${renderCtaBand(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  // Cart, checkout, thank-you — three additional shop routes wired by
  // the preview proxy under /cart, /checkout, /thank-you respectively.
  function renderCartPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Bag — ${input.name}`,
      description: `Your shopping bag at ${input.name}.`,
      route: '/features',
      body: `${renderCartBody(ctx)}
${renderNewsletter(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }
  function renderCheckoutPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Checkout — ${input.name}`,
      description: `Place your order at ${input.name}.`,
      route: '/features',
      body: `${renderCheckoutBody(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }
  function renderThankYouPage(): string {
    const ctx = makeCtx('/');
    return shell({
      title: `Thank you — ${input.name}`,
      description: `Order received.`,
      route: '/',
      body: `${renderThankYouBody(ctx)}
${renderWalkbyFooter(ctx)}`,
    });
  }

  return {
    'index.html': renderHome(),
    'about.html': renderAbout(),
    'features.html': renderFeaturesPage(),
    'pricing.html': renderPricingPage(),
    'contact.html': renderContactPage(),
    'cart.html': renderCartPage(),
    'checkout.html': renderCheckoutPage(),
    'thank-you.html': renderThankYouPage(),
    ...productPages,
    ...categoryPages,
  };
}
