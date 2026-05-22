import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const SPEC: VariantSpec = {
  picks: {
    template: 'afisha-hotel', layout: 'full-bleed', hero: 'photo-fullbleed',
    heroPhotoStyle: 'cinematic', palette: 'jewel', background: 'solid',
    fonts: 'classical', sectionOrder: 'story-first', density: 'luxe',
    motion: 'subtle-fade', cta: 'square', radius: 'sharp', imageFx: 'film',
    typeScale: 'luxurious', logoPos: 'top-left',
    navStyle: 'minimal-flat',
    footerStyle: 'compact',
    hoverEffect: 'color-swap',
    dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
  },
  params: {
    accentColor: '#a19581',
    paperColor: '#faf8f5',
    inkColor: '#0e0e1a',
    taglineSuperline: 'Hotel · est. 2024',
    customLabels: { about: 'Heritage', features: 'Amenities', pricing: 'Suites', faq: 'Stay' },
    featureIcons: ['☉', '◐', '✦', '⌘', '⊛', '◇'],
  },
  decorations: [],
  content: fallbackContent('Hotel Volans', 'A boutique 14-room hotel in old-town Tbilisi, set inside a 1920s cinema. Quiet rooms, hand-finished interiors, a residents-only screening room.'),
};

const dir = '/tmp/afisha-smoke';
mkdirSync(dir, { recursive: true });
const pages = renderSiteByTemplate({ name: 'Hotel Volans', slug: 'hotel-volans', paragraph: SPEC.content.subhead, spec: SPEC });
for (const [filename, html] of Object.entries(pages)) {
  const p = join(dir, filename);
  writeFileSync(p, html);
  console.log(`wrote ${p} (${html.length} bytes)`);
}
console.log(`\nopen ${dir}/index.html`);
