// Smoke test for the variant system.
//
// Renders three intentionally different variant picks to /tmp so you can
// open them in a browser and confirm the LLM signal space actually produces
// distinct, sophisticated sites.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSite } from '../app/lib/site-templates/vercel-saas/render';
import type { VariantSpec } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

// Three representative picks.

const PREMIUM_CRAFT: VariantSpec = {
  picks: {
    template: 'vercel-saas',
    layout: 'asymmetric',
    hero: 'photo-fullbleed',
    heroPhotoStyle: 'editorial',
    palette: 'earth',
    background: 'subtle-grain',
    fonts: 'editorial-serif',
    sectionOrder: 'story-first',
    density: 'luxe',
    motion: 'subtle-fade',
    cta: 'underline',
    radius: 'sharp',
    imageFx: 'film',
    typeScale: 'luxurious',
    logoPos: 'top-left',
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
    inkColor: '#1A1410',
    paperColor: '#F7F1E8',
    bgGradientStops: ['#F7F1E8', '#F0E6D6'],
    customLabels: { features: 'The Craft', pricing: 'Editions', faq: 'Curiosities', about: 'Our Studio' },
    featureIcons: ['⌘', '◇', '▲', '❋', '✧', '◈'],
    taglineSuperline: 'EST 2024',
    quoteMark: '—',
    dividerStyle: 'single-line',
  },
  decorations: [
    {
      section: 'hero', anchor: 'bottom-left',
      svg: '<g stroke="currentColor" fill="none" stroke-width="0.5"><circle cx="0" cy="0" r="60"/><line x1="0" y1="-60" x2="0" y2="60"/><line x1="-60" y1="0" x2="60" y2="0"/></g>',
      opacity: 0.4, scale: 1.5,
    },
  ],
  content: fallbackContent('Atelier Volans', 'A leather workshop making hand-finished travel goods, one piece at a time.'),
};

const TECH_SAAS: VariantSpec = {
  picks: {
    template: 'vercel-saas',
    layout: 'centered',
    hero: 'typography-only',
    heroPhotoStyle: 'cinematic',
    palette: 'cool-tech',
    background: 'dot-grid',
    fonts: 'neo-grotesk',
    sectionOrder: 'classic',
    density: 'balanced',
    motion: 'scroll-stagger',
    cta: 'pill',
    radius: 'soft-12',
    imageFx: 'none',
    typeScale: 'balanced',
    logoPos: 'top-left',
    navStyle: 'minimal-flat',
    footerStyle: 'compact',
    hoverEffect: 'color-swap',
    dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
  },
  params: {
    accentColor: '#2563EB',
    customLabels: { features: 'Features', pricing: 'Pricing', faq: 'FAQ' },
    featureIcons: ['◆', '◆', '◆', '◆', '◆', '◆'],
  },
  decorations: [],
  content: fallbackContent('Stackform', 'API-first data ingestion for engineering teams. Schema-aware, replay-safe, fully typed.'),
};

const CONSUMER_PASTEL: VariantSpec = {
  picks: {
    template: 'vercel-saas',
    layout: 'split',
    hero: 'photo-split',
    heroPhotoStyle: 'natural-light',
    palette: 'pastel',
    background: 'gradient-mesh',
    fonts: 'rounded-friendly',
    sectionOrder: 'social-first',
    density: 'spacious',
    motion: 'hover-tilt',
    cta: 'pill',
    radius: 'pill',
    imageFx: 'tinted',
    typeScale: 'balanced',
    logoPos: 'top-left',
    navStyle: 'minimal-flat',
    footerStyle: 'compact',
    hoverEffect: 'color-swap',
    dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
  },
  params: {
    accentColor: '#D946A0',
    bgGradientStops: ['#FEF9F5', '#FCE7F3', '#FDF2F8'],
    customLabels: { features: 'What\'s Included', pricing: 'Plans', faq: 'Good to Know' },
    featureIcons: ['🌸', '✿', '❀', '✼', '✿', '🌺'],
    quoteMark: '«',
  },
  decorations: [
    {
      section: 'features', anchor: 'top-right',
      svg: '<circle cx="0" cy="0" r="80" fill="currentColor" opacity="0.08"/>',
      opacity: 0.6, scale: 1.2,
    },
  ],
  content: fallbackContent('Calmly', 'A daily ritual app that helps you wind down before sleep.'),
};

const VARIANTS = {
  'premium-craft': { spec: PREMIUM_CRAFT, name: 'Atelier Volans', slug: 'atelier-volans' },
  'tech-saas': { spec: TECH_SAAS, name: 'Stackform', slug: 'stackform' },
  'consumer-pastel': { spec: CONSUMER_PASTEL, name: 'Calmly', slug: 'calmly' },
};

const outBase = '/tmp/variant-smoke';
mkdirSync(outBase, { recursive: true });

for (const [variantId, { spec, name, slug }] of Object.entries(VARIANTS)) {
  const dir = join(outBase, variantId);
  mkdirSync(dir, { recursive: true });
  const pages = renderSite({
    name, slug,
    paragraph: spec.content.subhead,
    spec,
  });
  for (const [filename, html] of Object.entries(pages)) {
    const p = join(dir, filename);
    writeFileSync(p, html);
    console.log(`wrote ${p} (${html.length} bytes)`);
  }
  console.log(`  → file://${dir}/index.html\n`);
}

console.log('Open all three to compare:');
console.log('  open ' + Object.keys(VARIANTS).map((id) => `${outBase}/${id}/index.html`).join(' '));
