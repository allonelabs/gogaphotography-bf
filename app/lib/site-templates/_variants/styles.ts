// Motion, CTA shape, radius, density, type-scale, image-fx — all rendered as
// CSS snippets keyed off the picks. Each function returns the rules that
// should land in the page <style>.

import type {
  MotionKey, CtaKey, RadiusKey, DensityKey, TypeScaleKey, ImageFxKey, ResolvedPalette,
  NavStyleKey, FooterStyleKey, HoverEffectKey, DividersKey,
} from '../schema';

// ── Motion ──────────────────────────────────────────────────────────────

export function motionCss(key: MotionKey): string {
  switch (key) {
    case 'none':
      return '';
    case 'subtle-fade':
      return `@keyframes ao-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
section{animation:ao-fade .6s ease both}
section:nth-of-type(2){animation-delay:.1s}section:nth-of-type(3){animation-delay:.2s}section:nth-of-type(4){animation-delay:.3s}
@media (prefers-reduced-motion: reduce){section{animation:none}}`;
    case 'scroll-stagger':
      return `@keyframes ao-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
section,.feature,.tier,.testimonial{animation:ao-rise .7s cubic-bezier(.16,.84,.44,1) both;animation-timeline:view();animation-range:entry 0% cover 30%}
@supports not (animation-timeline: view()){section,.feature,.tier,.testimonial{animation:ao-rise .6s ease both}}
@media (prefers-reduced-motion: reduce){section,.feature,.tier,.testimonial{animation:none}}`;
    case 'parallax-hero':
      return `@keyframes ao-parallax{from{transform:translateY(0) scale(1.04)}to{transform:translateY(-40px) scale(1.04)}}
.hero-photo{animation:ao-parallax linear both;animation-timeline:scroll(root)}
@media (prefers-reduced-motion: reduce){.hero-photo{animation:none}}`;
    case 'counter-numbers':
      return `.tier .price .amount{font-variant-numeric:tabular-nums}
@keyframes ao-count{from{opacity:.2;transform:translateY(6px)}to{opacity:1;transform:none}}
.tier .price .amount{animation:ao-count .8s cubic-bezier(.2,.7,.3,1) both}`;
    case 'hover-tilt':
      return `.feature,.tier,.testimonial{transition:transform .25s cubic-bezier(.16,.84,.44,1),box-shadow .25s ease}
.feature:hover,.tier:hover,.testimonial:hover{transform:translateY(-3px) rotate(-.2deg);box-shadow:0 10px 30px rgba(0,0,0,.08)}
@media (prefers-reduced-motion: reduce){.feature:hover,.tier:hover,.testimonial:hover{transform:none}}`;
    case 'magnetic-cta':
      // Subtle scale + shadow boost on .cta hover; pseudo-magnetic feel.
      return `.cta{transition:transform .18s cubic-bezier(.16,.84,.44,1),box-shadow .18s ease}
.cta:hover{transform:translateY(-2px) scale(1.02)}
.cta.primary:hover,.cta.accent:hover{box-shadow:0 12px 28px color-mix(in srgb, currentColor 18%, transparent)}
@media (prefers-reduced-motion: reduce){.cta:hover{transform:none}}`;
    case 'letter-stagger':
      // Apply to h1 only (most impact); requires JS-free letter-by-letter via :nth-letter pseudo (not real, so use word-level pseudo with CSS).
      // Best CSS-only approximation: stagger each h1 word via inline-block + delays.
      return `@keyframes ao-letter-stag{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
h1{display:block}
@supports (animation-timeline: view()){h1{animation:ao-letter-stag .7s cubic-bezier(.16,.84,.44,1) both}}
@supports not (animation-timeline: view()){h1{animation:ao-letter-stag .7s cubic-bezier(.16,.84,.44,1) both}}
@media (prefers-reduced-motion: reduce){h1{animation:none}}`;
    case 'marquee-text-line':
      // Adds a scrolling text strip behind .hero (uses ::before with content read from data-marquee).
      return `.hero{position:relative;overflow:hidden}
.hero::before{content:"";position:absolute;left:0;right:0;bottom:0;height:42px;background:var(--ink);color:var(--paper);overflow:hidden;pointer-events:none;display:flex;align-items:center;justify-content:flex-start;z-index:2}
.hero::after{content:"◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW ◆ NEW";position:absolute;left:0;bottom:0;height:42px;color:var(--paper);font-size:12px;letter-spacing:0.32em;font-family:var(--font-body);font-weight:500;line-height:42px;white-space:nowrap;animation:hero-marq 24s linear infinite;z-index:3;padding-left:24px}
@keyframes hero-marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){.hero::after{animation:none}}`;
    default:
      return '';
  }
}

// ── CTAs ────────────────────────────────────────────────────────────────

export function ctaCss(key: CtaKey, palette: ResolvedPalette): string {
  const base = `.cta{display:inline-flex;align-items:center;gap:8px;font-weight:600;letter-spacing:-0.01em;transition:transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease;cursor:pointer;text-decoration:none}`;
  const primary = `.cta.primary{background:${palette.ink};color:${palette.paper}}`;
  const secondary = `.cta.secondary{background:transparent;color:${palette.ink};border:1px solid ${palette.line}}.cta.secondary:hover{border-color:${palette.ink}}`;
  const accent = `.cta.accent{background:${palette.accent};color:${palette.inkOnAccent}}.cta.accent:hover{transform:translateY(-1px)}`;
  const hoverPrimary = `.cta.primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.18)}`;
  const ghostable = `${base}${primary}${secondary}${accent}${hoverPrimary}`;
  switch (key) {
    case 'pill':
      return `${ghostable}.cta{padding:14px 22px;border-radius:999px;font-size:15px}`;
    case 'square':
      return `${ghostable}.cta{padding:14px 22px;border-radius:6px;font-size:15px}`;
    case 'filled-block':
      return `${ghostable}.cta{padding:18px 28px;border-radius:0;font-size:15px;text-transform:uppercase;letter-spacing:0.08em;font-size:13px;font-weight:700}`;
    case 'underline':
      return `${ghostable}.cta{padding:6px 0;border:none;border-bottom:2px solid currentColor;border-radius:0;background:transparent;color:${palette.ink};font-size:16px}.cta.primary,.cta.accent{background:transparent;color:${palette.ink};border-bottom-color:${palette.accent}}.cta.primary:hover,.cta.accent:hover{transform:none;color:${palette.accent};box-shadow:none}`;
    case 'text-arrow':
      return `${ghostable}.cta{padding:8px 0;border-radius:0;background:transparent;color:${palette.ink};font-size:16px;font-weight:500}.cta::after{content:"→";transition:transform .2s ease}.cta:hover::after{transform:translateX(4px)}.cta.primary,.cta.accent{background:transparent;color:${palette.accent}}.cta.primary:hover,.cta.accent:hover{transform:none;box-shadow:none}`;
    default:
      return `${ghostable}.cta{padding:14px 22px;border-radius:999px;font-size:15px}`;
  }
}

// ── Radius scheme ───────────────────────────────────────────────────────

export function radiusCss(key: RadiusKey): string {
  switch (key) {
    case 'sharp':
      return `:root{--r-card:0;--r-tier:0;--r-pill:0;--r-feature:0}.tier,.feature,.testimonial,.contact-card{border-radius:0}.tier.highlighted::before{border-radius:0}`;
    case 'soft-12':
      return `:root{--r-card:12px;--r-tier:16px;--r-pill:999px;--r-feature:0}.tier{border-radius:16px}.testimonial,.contact-card{border-radius:12px}`;
    case 'pill':
      return `:root{--r-card:24px;--r-tier:28px;--r-pill:999px}.tier{border-radius:28px}.feature{border-radius:20px}.testimonial,.contact-card{border-radius:24px}`;
    case 'mixed':
      return `:root{--r-card:0;--r-tier:20px;--r-pill:999px}.tier{border-radius:20px}.testimonial{border-radius:4px}.feature{border-radius:0;border-bottom:2px solid currentColor}.contact-card{border-radius:20px}`;
    default:
      return ``;
  }
}

// ── Density (section padding + gap) ─────────────────────────────────────

export function densityCss(key: DensityKey): string {
  switch (key) {
    case 'tight':
      return `section{padding:64px 0}.features,.pricing,.testimonials{margin-top:36px;gap:16px}`;
    case 'balanced':
      return `section{padding:96px 0}.features,.pricing,.testimonials{margin-top:56px}`;
    case 'spacious':
      return `section{padding:128px 0}.features,.pricing,.testimonials{margin-top:72px;gap:24px}`;
    case 'luxe':
      return `section{padding:160px 0}.features,.pricing,.testimonials{margin-top:96px;gap:32px}.wrap{max-width:1040px}`;
    default:
      return `section{padding:96px 0}`;
  }
}

// ── Type scale ──────────────────────────────────────────────────────────

export function typeScaleCss(key: TypeScaleKey): string {
  switch (key) {
    case 'compressed':
      return `h1{font-size:clamp(40px,5.5vw,68px);line-height:1.04;letter-spacing:-0.03em}h2{font-size:clamp(28px,3.5vw,40px);line-height:1.1}`;
    case 'balanced':
      return `h1{font-size:clamp(44px,7vw,84px);line-height:1.02;letter-spacing:-0.04em}h2{font-size:clamp(32px,5vw,52px);line-height:1.08;letter-spacing:-0.03em}`;
    case 'luxurious':
      return `h1{font-size:clamp(56px,9vw,128px);line-height:0.98;letter-spacing:-0.045em;font-weight:600}h2{font-size:clamp(40px,6.5vw,72px);line-height:1.04;letter-spacing:-0.035em;font-weight:600}`;
    case 'small':
      return `h1{font-size:clamp(32px,4.5vw,52px);line-height:1.1;letter-spacing:-0.025em}h2{font-size:clamp(24px,3vw,36px);line-height:1.15}`;
    default:
      return `h1{font-size:clamp(44px,7vw,84px);line-height:1.02;letter-spacing:-0.04em}`;
  }
}

// ── Image FX (hero + photos) ────────────────────────────────────────────

export function imageFxCss(key: ImageFxKey, palette: ResolvedPalette): string {
  switch (key) {
    case 'none':
      return `.hero-photo,.media-photo{filter:none}`;
    case 'grayscale':
      return `.hero-photo,.media-photo{filter:grayscale(1) contrast(1.06)}`;
    case 'duotone':
      return `.hero-photo,.media-photo{filter:grayscale(1) contrast(1.15);mix-blend-mode:multiply;background:${palette.accent}}.hero-photo-wrap,.media-photo-wrap{background:${palette.accent}}`;
    case 'tinted':
      return `.hero-photo,.media-photo{filter:saturate(0.88) contrast(1.04)}.hero-photo-wrap::after,.media-photo-wrap::after{content:"";position:absolute;inset:0;background:${palette.accent}1A;mix-blend-mode:overlay;pointer-events:none}`;
    case 'overlay':
      return `.hero-photo-wrap::after,.media-photo-wrap::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, transparent 0%, ${palette.ink}66 100%);pointer-events:none}`;
    case 'film':
      return `.hero-photo,.media-photo{filter:contrast(1.08) saturate(0.92) sepia(0.07)}.hero-photo-wrap,.media-photo-wrap{position:relative}.hero-photo-wrap::after,.media-photo-wrap::after{content:"";position:absolute;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.18'/></svg>");pointer-events:none;mix-blend-mode:overlay}`;
    default:
      return ``;
  }
}

// ── Nav style ───────────────────────────────────────────────────────────

export function navStyleCss(key: NavStyleKey, _palette: ResolvedPalette): string {
  switch (key) {
    case 'minimal-flat':
      return `header.nav{background:var(--paper);border-bottom:1px solid var(--line);box-shadow:none;backdrop-filter:none}`;
    case 'floating-pill':
      return `header.nav{position:sticky;top:14px;margin:0 14px;background:color-mix(in srgb, var(--paper) 92%, transparent);backdrop-filter:saturate(180%) blur(20px);border:1px solid var(--line);border-radius:999px;padding:0 12px;box-shadow:0 8px 32px rgba(0,0,0,.06)}
header.nav .row{height:56px;padding:0 16px}`;
    case 'fullwidth-bordered':
      return `header.nav{background:var(--paper);border-top:3px solid var(--accent);border-bottom:1px solid var(--line);box-shadow:none;backdrop-filter:none}`;
    case 'sidebar-rail':
      return `@media (min-width: 1080px){
  header.nav{position:fixed;top:0;left:0;bottom:0;width:200px;border-bottom:none;border-right:1px solid var(--line);background:var(--paper);padding:32px 24px}
  header.nav .row{flex-direction:column;align-items:flex-start;height:auto;gap:32px}
  header.nav nav{flex-direction:column;align-items:flex-start;gap:14px}
  body > section, .cta-band, footer{margin-left:200px}
}`;
    default:
      return ``;
  }
}

// ── Footer style ────────────────────────────────────────────────────────

export function footerStyleCss(key: FooterStyleKey, _palette: ResolvedPalette): string {
  switch (key) {
    case 'compact':
      return `footer{padding:48px 0 32px}footer .row{align-items:center}`;
    case 'expanded-columns':
      return `footer{padding:96px 0 48px}
footer .row > div:first-child{flex:1 1 280px}
footer .links{flex:1 1 480px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:18px}
footer .links a{display:block;padding:6px 0}`;
    case 'cta-card-bottom':
      return `footer{padding:48px 0 32px;background:transparent}
footer::before{content:"";display:block;height:60px;margin-bottom:48px;background:linear-gradient(180deg, transparent 0%, var(--accent-soft) 100%)}`;
    case 'minimal-watermark':
      return `footer{padding:48px 0 28px;color:var(--muted);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-align:center}
footer .row{justify-content:center;flex-direction:column;align-items:center;gap:14px}
footer .links{justify-content:center}
footer .meta{justify-content:center}`;
    default:
      return ``;
  }
}

// ── Hover effect (nav + footer anchors) ─────────────────────────────────

export function hoverEffectCss(key: HoverEffectKey, _palette: ResolvedPalette): string {
  switch (key) {
    case 'none':
      return ``;
    case 'underline-slide':
      return `header.nav nav a, footer .links a{position:relative;display:inline-block}
header.nav nav a::after, footer .links a::after{content:"";position:absolute;left:0;bottom:-2px;width:0;height:1px;background:currentColor;transition:width .2s cubic-bezier(.4,0,.2,1)}
header.nav nav a:hover::after, footer .links a:hover::after{width:100%}`;
    case 'color-swap':
      return `header.nav nav a, footer .links a{transition:color .15s ease}
header.nav nav a:hover, footer .links a:hover{color:var(--accent)}`;
    case 'arrow-grow':
      return `header.nav nav a::after{content:" →";opacity:0;transition:opacity .15s ease,transform .2s ease;display:inline-block;margin-left:4px}
header.nav nav a:hover::after{opacity:1;transform:translateX(2px)}`;
    case 'scale-tilt':
      return `header.nav nav a{transition:transform .2s ease;display:inline-block}
header.nav nav a:hover{transform:translateY(-1px)}`;
    default:
      return ``;
  }
}

// ── Section dividers ────────────────────────────────────────────────────

export function dividersCss(key: DividersKey, _palette: ResolvedPalette): string {
  switch (key) {
    case 'none':
      return `section + section{border-top:none}`;
    case 'thin-line':
      return `section + section{border-top:1px solid var(--line)}`;
    case 'hairline-fade':
      return `section + section{position:relative}
section + section::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:80%;max-width:560px;height:1px;background:linear-gradient(90deg, transparent 0%, var(--line) 50%, transparent 100%)}`;
    case 'chunky-rule':
      return `section + section{border-top:4px solid var(--ink)}`;
    case 'decorative-glyph':
      return `section + section{position:relative;padding-top:120px}
section + section::before{content:"✦";position:absolute;top:48px;left:50%;transform:translateX(-50%);font-size:18px;color:var(--accent);opacity:.6}`;
    default:
      return ``;
  }
}
