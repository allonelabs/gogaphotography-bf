// Polish bundle smoke — exercises new palettes, backgrounds, hero variants.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const basePicks: VariantPicks = {
  template: 'vercel-saas', layout: 'centered', hero: 'split-image-caption',
  heroPhotoStyle: 'editorial', palette: 'oxblood', background: 'paper-grain',
  fonts: 'editorial-serif', sectionOrder: 'feature-deep', density: 'spacious',
  motion: 'subtle-fade', cta: 'underline', radius: 'sharp', imageFx: 'film',
  typeScale: 'luxurious', logoPos: 'top-left',
  navStyle: 'floating-pill', footerStyle: 'minimal-watermark',
  hoverEffect: 'underline-slide', dividers: 'decorative-glyph',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
};

const VARIANTS: Array<[string, VariantPicks]> = [
  ['oxblood-papergrain-split', basePicks],
  ['mint-crosshatch-numbers', { ...basePicks, palette: 'mint', background: 'crosshatch', hero: 'side-numbers', fonts: 'neo-grotesk' }],
  ['slate-noise-vmarquee', { ...basePicks, palette: 'slate', background: 'noise-overlay', hero: 'vertical-marquee', fonts: 'mono-led' }],
  ['terracotta-vignette-bignum', { ...basePicks, palette: 'terracotta', background: 'vignette', hero: 'big-number-display', sectionOrder: 'metrics-first' }],
];

for (const [id, picks] of VARIANTS) {
  const spec: VariantSpec = {
    picks,
    params: { taglineSuperline: 'POLISH BUNDLE · 06' },
    decorations: [],
    content: fallbackContent('Polished Co', 'A demonstration of the new palettes, backgrounds, and hero variants now available in the variant system.'),
  };
  const dir = `/tmp/polish-smoke/${id}`;
  mkdirSync(dir, { recursive: true });
  const pages = renderSiteByTemplate({ name: 'Polished Co', slug: 'polished-co', paragraph: spec.content.subhead, spec });
  for (const [f, html] of Object.entries(pages)) writeFileSync(join(dir, f), html);
  console.log(`${id}: file://${dir}/index.html`);
}
