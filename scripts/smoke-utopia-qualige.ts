import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';
import { classifyBrief } from '../app/lib/site-templates/classifier';

const basePicks: VariantPicks = {
  template: 'vercel-saas', layout: 'centered', hero: 'typography-only',
  heroPhotoStyle: 'editorial', palette: 'mono-ink', background: 'subtle-grain',
  fonts: 'editorial-serif', sectionOrder: 'classic', density: 'spacious',
  motion: 'subtle-fade', cta: 'underline', radius: 'sharp', imageFx: 'film',
  typeScale: 'luxurious', logoPos: 'top-left',
  navStyle: 'minimal-flat', footerStyle: 'expanded-columns',
  hoverEffect: 'underline-slide', dividers: 'thin-line',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards',
};

const UTOPIA: VariantSpec = {
  picks: { ...basePicks, template: 'utopia-portfolio', hero: 'manifesto-statement' },
  params: { customLabels: { features: 'Work', about: 'Approach' }, taglineSuperline: 'Studio · 2026' },
  decorations: [],
  content: fallbackContent('North Studio', 'A small motion design studio in Tbilisi. We make slow, considered work for brands that care about the craft.'),
};

const QUALIGE: VariantSpec = {
  picks: { ...basePicks, template: 'qualige-edu', fonts: 'rounded-friendly', palette: 'cool-tech', radius: 'soft-12', cta: 'pill', density: 'balanced', dividers: 'none',
    featuresStyle: 'grid-card',
    pricingStyle: 'cards',
    testimonialsStyle: 'cards', hero: 'big-number-display' },
  params: { accentColor: '#2563EB', customLabels: { features: 'Programs', pricing: 'Tuition', faq: 'Admissions' } },
  decorations: [],
  content: fallbackContent('Linecraft Academy', 'A 12-week bootcamp teaching the modern web stack. Cohorts of 30, taught by senior engineers, projects that go on your portfolio.'),
};

mkdirSync('/tmp/utopia-smoke', { recursive: true });
mkdirSync('/tmp/qualige-smoke', { recursive: true });
const utopia = renderSiteByTemplate({ name: 'North Studio', slug: 'north-studio', paragraph: UTOPIA.content.subhead, spec: UTOPIA });
const qualige = renderSiteByTemplate({ name: 'Linecraft Academy', slug: 'linecraft-academy', paragraph: QUALIGE.content.subhead, spec: QUALIGE });
for (const [f, html] of Object.entries(utopia)) writeFileSync(join('/tmp/utopia-smoke', f), html);
for (const [f, html] of Object.entries(qualige)) writeFileSync(join('/tmp/qualige-smoke', f), html);
console.log('utopia: /tmp/utopia-smoke/index.html');
console.log('qualige: /tmp/qualige-smoke/index.html');

console.log('\n--- classifier sanity ---');
const briefs = [
  ['A boutique hotel in the Tuscan countryside with eight rooms and a vineyard.', 'afisha-hotel'],
  ['A streetwear brand making heavy denim in small drops, sized inclusively.', 'walkby-ecom'],
  ['A perfumery making small-batch eau de parfum from Caucasus essential oils.', 'equivalenza-retail'],
  ['A motion design studio working on commercial film and CGI for global brands.', 'utopia-portfolio'],
  ['An 8-week React bootcamp with weekly cohorts and senior instructors.', 'qualige-edu'],
  ['A B2B SaaS platform for observability of distributed systems.', 'vercel-saas'],
];
for (const [brief, expected] of briefs) {
  const r = classifyBrief(brief as string);
  const ok = r.best === expected ? '✓' : '✗';
  console.log(`${ok} expected ${expected} → got ${r.best} (conf ${r.confidence.toFixed(2)}, matched ${r.ranked[0]?.matchedKeywords.slice(0, 3).join(',')})`);
}
