// Smoke alt section styles + decoration presets.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const base: VariantPicks = {
  template: 'vercel-saas', layout: 'centered', hero: 'typography-only',
  heroPhotoStyle: 'editorial', palette: 'mono-ink', background: 'subtle-grain',
  fonts: 'editorial-serif', sectionOrder: 'classic', density: 'spacious',
  motion: 'subtle-fade', cta: 'underline', radius: 'sharp', imageFx: 'none',
  typeScale: 'balanced', logoPos: 'top-left',
  navStyle: 'minimal-flat', footerStyle: 'compact',
  hoverEffect: 'underline-slide', dividers: 'thin-line',
  featuresStyle: 'editorial-rows',
  pricingStyle: 'comparison-table',
  testimonialsStyle: 'editorial-stack',
};

const SPEC: VariantSpec = {
  picks: base,
  params: { taglineSuperline: 'ALT SECTIONS · 07' },
  decorations: [
    { section: 'hero', anchor: 'bottom-left', preset: 'orbits-3', opacity: 0.4 },
    { section: 'features', anchor: 'top-right', preset: 'rule-double', opacity: 0.5 },
    { section: 'pricing', anchor: 'top-left', preset: 'bracket-corner', opacity: 0.4 },
    { section: 'cta', anchor: 'center', preset: 'asterisk-bold', opacity: 0.15 },
  ],
  content: fallbackContent('Alt Sections', 'Demonstration of the new section-style axes + decoration preset library.'),
};

const dir = '/tmp/alt-sections-smoke';
mkdirSync(dir, { recursive: true });
const pages = renderSiteByTemplate({ name: 'Alt Sections', slug: 'alt-sections', paragraph: SPEC.content.subhead, spec: SPEC });
for (const [f, html] of Object.entries(pages)) writeFileSync(join(dir, f), html);
console.log(`open ${dir}/index.html`);

// Second variant: asymmetric features + simple pricing list + marquee testimonials
const SPEC2: VariantSpec = {
  picks: { ...base, palette: 'jewel', fonts: 'display-serif', featuresStyle: 'asymmetric-split', pricingStyle: 'simple-list', testimonialsStyle: 'marquee' },
  params: { taglineSuperline: 'VARIATION B' },
  decorations: [{ section: 'features', anchor: 'top-right', preset: 'wave-stack', opacity: 0.45 }],
  content: fallbackContent('Alt Sections B', 'Different section styles in the same template.'),
};
const dir2 = '/tmp/alt-sections-smoke-b';
mkdirSync(dir2, { recursive: true });
const pages2 = renderSiteByTemplate({ name: 'Alt Sections B', slug: 'alt-sections-b', paragraph: SPEC2.content.subhead, spec: SPEC2 });
for (const [f, html] of Object.entries(pages2)) writeFileSync(join(dir2, f), html);
console.log(`open ${dir2}/index.html`);
