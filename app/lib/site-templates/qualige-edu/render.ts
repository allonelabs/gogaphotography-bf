// qualige-edu template — corporate LMS / online education.
//
// Warm professional aesthetic, course-led layout, syllabus stepper,
// instructor profile, enrollment-focused CTAs, trust-badges row.
// For online courses, bootcamps, corporate LMS, professional certificates,
// training platforms, executive education.

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
  renderCourseGrid, renderSyllabus, renderInstructorCard,
  renderEnrollmentBand, renderEduTrustBadges,
} from '../_sections/edu';
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
h1,h2,h3{font-family:var(--font-display);font-weight:600}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1280px;margin:0 auto;padding:0 32px}
.row{display:flex;gap:32px;align-items:center}

/* Nav — friendly LMS chrome */
header.nav{position:sticky;top:0;z-index:50;background:var(--paper);border-bottom:1px solid var(--line)}
header.nav .row{height:68px;justify-content:space-between;max-width:1280px;margin:0 auto;padding:0 32px}
header.nav .logo{font-family:var(--font-display);font-weight:700;letter-spacing:-0.01em;font-size:20px;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:6px;height:6px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:24px;align-items:center}
header.nav nav a{font-size:14px;font-weight:500;color:var(--ink);transition:color .15s ease}
header.nav nav a:hover{color:var(--accent)}
header.nav nav a[aria-current]{color:var(--accent)}
header.nav .cta{padding:9px 18px;font-size:13px;font-weight:600}

/* Hero — confident, accessible */
.hero h1{letter-spacing:-0.025em;font-weight:700;font-family:var(--font-display)}
.hero p.subhead{margin-top:24px;font-size:18px;color:var(--muted);max-width:600px;line-height:1.6}
.hero .ctas{margin-top:36px;display:flex;gap:12px;flex-wrap:wrap}
.kicker{font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:var(--accent-soft);border-radius:999px;font-family:var(--font-body)}
.kicker::before{content:""}

section{padding:96px 0}

/* CTA band — accent over paper */
.cta-band{margin:96px 32px;max-width:1216px;margin-left:auto;margin-right:auto;padding:80px 48px;background:var(--accent-soft);color:var(--ink);text-align:center;border-radius:16px}
.cta-band h2{color:var(--ink);margin:0 auto;max-width:780px;font-weight:600;letter-spacing:-0.02em;font-family:var(--font-display);font-size:clamp(32px,4.5vw,48px);line-height:1.1}
.cta-band p{color:var(--muted);margin-top:18px;font-size:16px;line-height:1.6;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:32px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:var(--accent);color:var(--on-accent)}
.cta-band .cta.secondary{border-color:var(--ink);color:var(--ink)}

/* Contact card */
.contact-card{margin-top:48px;max-width:560px;padding:40px;border:1px solid var(--line);border-radius:12px}
.contact-card .email{font-size:22px;font-weight:600;letter-spacing:-0.01em;color:var(--accent);margin-bottom:12px;font-family:var(--font-display)}
.contact-card .blurb{color:var(--muted);font-size:15px;line-height:1.6}

/* Footer */
footer{padding:64px 0 40px;background:var(--paper);border-top:1px solid var(--line);color:var(--muted);font-size:13px}
footer .row{justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:48px;max-width:1280px;margin:0 auto;padding:0 32px}
footer .brand{font-weight:700;color:var(--ink);font-size:18px;margin-bottom:8px;font-family:var(--font-display);letter-spacing:-0.01em}
footer .tagline{max-width:320px;line-height:1.5}
footer .links{display:flex;flex-wrap:wrap;gap:24px}
footer .links a{font-size:13px;transition:color .15s ease}
footer .links a:hover{color:var(--accent)}
footer .meta{margin-top:48px;padding:24px 32px 0;border-top:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;max-width:1280px;margin-left:auto;margin-right:auto}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border:1px solid var(--line);border-radius:8px;padding:18px 22px;margin-bottom:12px;background:var(--paper)}
.faq summary{font-size:16px;font-weight:600;cursor:pointer;letter-spacing:-0.005em;list-style:none;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display)}
.faq summary::after{content:"+";font-size:22px;color:var(--accent);font-weight:300;transition:transform .2s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:12px;color:var(--muted);font-size:14px;line-height:1.6}

/* Testimonials — student stories */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:48px}
.testimonial{padding:32px;background:var(--paper);border:1px solid var(--line);border-radius:12px}
.testimonial blockquote{font-size:15px;line-height:1.65;color:var(--ink);margin-bottom:22px;letter-spacing:0;font-family:var(--font-body);font-style:normal}
.testimonial .qmark{font-size:24px;color:var(--accent);line-height:0;margin-right:6px}
.testimonial .author{font-size:13px;font-weight:600;color:var(--ink)}
.testimonial .role{font-size:12px;color:var(--muted);margin-top:4px}

@media (max-width: 640px){
  .wrap{padding:0 20px}
  header.nav nav{display:none}
  section{padding:64px 0}
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

  function renderHome(): string {
    const ctx = makeCtx('/');
    return shell({
      title: `${input.name} — ${spec.content.tagline}`,
      description: spec.content.subhead,
      route: '/',
      body: `${renderHero(ctx)}
${renderEduTrustBadges(ctx)}
${renderCourseGrid(ctx)}
${renderSyllabus(ctx)}
${renderInstructorCard(ctx)}
${renderTestimonials(ctx)}
${renderEnrollmentBand(ctx)}
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
${renderInstructorCard(ctx)}
${renderEduTrustBadges(ctx)}
${renderTestimonials(ctx)}
${renderEnrollmentBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderFeaturesPage(): string {
    const ctx = makeCtx('/features');
    return shell({
      title: `Courses — ${input.name}`,
      description: `Browse all courses at ${input.name}.`,
      route: '/features',
      body: `${renderHero(ctx)}
${renderCourseGrid(ctx)}
${renderSyllabus(ctx)}
${renderCtaBand(ctx)}
${renderFooter(ctx)}`,
    });
  }

  function renderPricingPage(): string {
    const ctx = makeCtx('/pricing');
    return shell({
      title: `Tuition — ${input.name}`,
      description: `Tuition and enrollment for ${input.name}.`,
      route: '/pricing',
      body: `${renderHero(ctx)}
${renderFaq(ctx)}
${renderEnrollmentBand(ctx)}
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
${renderEduTrustBadges(ctx)}
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
