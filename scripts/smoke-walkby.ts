// Smoke walkby-ecom template — hits the dispatcher with template=walkby-ecom.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const WALKBY_SPEC: VariantSpec = {
  picks: {
    template: 'walkby-ecom',
    layout: 'full-bleed',
    hero: 'photo-fullbleed',
    heroPhotoStyle: 'editorial',
    palette: 'mono-ink',
    background: 'solid',
    fonts: 'editorial-serif',
    sectionOrder: 'classic',
    density: 'spacious',
    motion: 'subtle-fade',
    cta: 'square',
    radius: 'sharp',
    imageFx: 'none',
    typeScale: 'compressed',
    logoPos: 'top-center',
    navStyle: 'minimal-flat',
    footerStyle: 'compact',
    hoverEffect: 'color-swap',
    dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
  },
  params: {
    accentColor: '#0a0a0a',
    inkColor: '#0a0a0a',
    paperColor: '#ffffff',
    customLabels: { features: 'Collection', pricing: 'Shop', faq: 'Help' },
    taglineSuperline: 'FALL · WINTER 25',
    quoteMark: '—',
  },
  decorations: [],
  content: fallbackContent('Volans Atelier', 'A high-fashion clothing brand based in Tbilisi, working in considered silhouettes and natural fibers.'),
};

const dir = '/tmp/walkby-smoke';
mkdirSync(dir, { recursive: true });
const pages = renderSiteByTemplate({
  name: 'Volans Atelier', slug: 'volans-atelier',
  paragraph: WALKBY_SPEC.content.subhead, spec: WALKBY_SPEC,
});
for (const [filename, html] of Object.entries(pages)) {
  const p = join(dir, filename);
  writeFileSync(p, html);
  console.log(`wrote ${p} (${html.length} bytes)`);
}
console.log(`\nopen ${dir}/index.html`);
