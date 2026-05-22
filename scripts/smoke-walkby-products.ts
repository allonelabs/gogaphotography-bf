// Smoke walkby with real products — verifies collection grid, featured
// products, and per-product detail pages all render.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const picks: VariantPicks = {
  template: 'walkby-ecom', layout: 'full-bleed', hero: 'photo-fullbleed',
  heroPhotoStyle: 'editorial', palette: 'mono-ink', background: 'solid',
  fonts: 'editorial-serif', sectionOrder: 'social-first', density: 'spacious',
  motion: 'subtle-fade', cta: 'square', radius: 'sharp', imageFx: 'film',
  typeScale: 'compressed', logoPos: 'top-center',
  navStyle: 'minimal-flat', footerStyle: 'compact',
  hoverEffect: 'underline-slide', dividers: 'thin-line',
  featuresStyle: 'grid-card', pricingStyle: 'cards', testimonialsStyle: 'cards',
};

const spec: VariantSpec = {
  picks, params: { taglineSuperline: 'AW · 26' }, decorations: [],
  content: fallbackContent('Volans Atelier', 'A small leather workshop in Tbilisi making hand-finished travel goods.'),
};

const products = [
  { id: 'p_a', name: 'Field Pouch', slug: 'field-pouch', description: 'Compact daily carry. Three pockets, hand-stitched edges, vegetable-tanned leather from a Tuscan tannery.', priceCents: 22000, currency: 'USD', imageName: '', inventory: 8, status: 'active' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p_b', name: 'Travel Bag', slug: 'travel-bag', description: 'The signature piece. Holds a long weekend.', priceCents: 68000, currency: 'USD', imageName: '', inventory: 3, status: 'active' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'p_c', name: 'Card Wallet', slug: 'card-wallet', description: 'Slim three-pocket leather wallet.', priceCents: 14000, currency: 'USD', imageName: '', inventory: 0, status: 'active' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

mkdirSync('/tmp/walkby-products-smoke', { recursive: true });
const pages = renderSiteByTemplate({
  name: 'Volans Atelier', slug: 'volans-atelier',
  paragraph: spec.content.subhead, spec, products,
});
for (const [f, html] of Object.entries(pages)) writeFileSync(join('/tmp/walkby-products-smoke', f), html);
console.log('pages emitted:', Object.keys(pages).length);
console.log('files:', Object.keys(pages).join(', '));
console.log('\nopen /tmp/walkby-products-smoke/index.html');
console.log('open /tmp/walkby-products-smoke/product-field-pouch.html');
