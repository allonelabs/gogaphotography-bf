import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const SPEC: VariantSpec = {
  picks: {
    template: 'equivalenza-retail', layout: 'centered', hero: 'photo-split',
    heroPhotoStyle: 'product-isolation', palette: 'warm-paper', background: 'solid',
    fonts: 'display-serif', sectionOrder: 'classic', density: 'balanced',
    motion: 'subtle-fade', cta: 'pill', radius: 'sharp', imageFx: 'tinted',
    typeScale: 'balanced', logoPos: 'top-center',
    navStyle: 'minimal-flat',
    footerStyle: 'compact',
    hoverEffect: 'color-swap',
    dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
  },
  params: {
    accentColor: '#7C2D12',
    paperColor: '#FBF7F0',
    customLabels: { features: 'Collection', pricing: 'Shop', faq: 'Care', about: 'Story' },
    featureIcons: ['❀', '◇', '✦', '◈', '☉', '◐'],
    taglineSuperline: 'Volume 01 · 2026',
  },
  decorations: [],
  content: fallbackContent('Volans Fragrance', 'A small-batch perfumery in Tbilisi crafting fragrances inspired by the Caucasus mountains. Single-origin notes, slow maceration.'),
};

const dir = '/tmp/equivalenza-smoke';
mkdirSync(dir, { recursive: true });
const pages = renderSiteByTemplate({ name: 'Volans Fragrance', slug: 'volans-fragrance', paragraph: SPEC.content.subhead, spec: SPEC });
for (const [filename, html] of Object.entries(pages)) {
  const p = join(dir, filename);
  writeFileSync(p, html);
  console.log(`wrote ${p} (${html.length} bytes)`);
}
console.log(`\nopen ${dir}/index.html`);
