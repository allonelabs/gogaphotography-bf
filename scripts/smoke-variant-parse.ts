// Smoke test the LLM-output → VariantSpec parser.
// Feeds a plausible LLM JSON output, confirms it parses, renders the site.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseVariantSpec } from '../app/lib/site-templates/variant-prompt';
import { renderSite } from '../app/lib/site-templates/vercel-saas/render';

// What a well-formed LLM response should look like — exercises all four layers.
const RAW = JSON.stringify({
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
    customLabels: { features: 'The Craft', pricing: 'Editions', faq: 'Curiosities', about: 'Our Studio' },
    featureIcons: ['⌘', '◇', '▲', '❋', '✧', '◈'],
    taglineSuperline: 'EST 2024',
    quoteMark: '—',
    heroImagePrompt: 'Editorial overhead photograph of a Georgian leather workshop, hand-tooled brass details on dark walnut, warm tungsten light, magazine quality.',
  },
  decorations: [
    {
      section: 'hero', anchor: 'bottom-left',
      svg: '<g stroke="currentColor" fill="none" stroke-width="0.5"><circle cx="0" cy="0" r="60"/><line x1="0" y1="-60" x2="0" y2="60"/><line x1="-60" y1="0" x2="60" y2="0"/></g>',
      opacity: 0.4, scale: 1.5,
    },
    // Forbidden tag — must be dropped.
    {
      section: 'hero', anchor: 'top-right',
      svg: '<image href="http://evil"/>',
    },
  ],
  content: {
    tagline: 'Hand-finished travel goods, made one piece at a time.',
    subhead: 'A leather workshop in Tbilisi, working in dark walnut and brass since 2024.',
    primaryCta: 'See pieces',
    secondaryCta: 'Our process',
    features: [
      { title: 'Made by hand', description: 'Every piece passes through three artisans before it leaves the studio.' },
      { title: 'Italian leather', description: 'Sourced from a single tannery in Tuscany; vegetable-tanned.' },
      { title: 'Solid brass', description: 'Hardware cast in Tbilisi, hand-finished, ages to a soft patina.' },
      { title: 'Heirloom-grade', description: 'Built to outlast you. Send it back at any time for refinishing.' },
      { title: 'Limited editions', description: 'Each season produces 60 pieces total across three silhouettes.' },
      { title: 'Lifetime repair', description: 'Free repair for the life of the piece. Including the second owner.' },
    ],
    pricing: [
      { name: 'Field Pouch', price: '$220', period: '', description: 'Compact daily carry. Three pockets.', features: ['Italian leather', 'Brass hardware', 'Hand-stitched edges', '4-week delivery'], cta: 'Order', highlighted: false },
      { name: 'Travel Bag', price: '$680', period: '', description: 'The signature piece.', features: ['All Field Pouch features', 'Lifetime repair', 'Personal monogram', 'Numbered edition'], cta: 'Order', highlighted: true },
      { name: 'Bespoke', price: 'from $1,400', period: '', description: 'Designed with you.', features: ['Custom dimensions', 'Leather selection', 'Personal consultation', '12-week delivery'], cta: 'Inquire', highlighted: false },
    ],
    faq: [
      { q: 'How long does a piece take to make?', a: '4–6 weeks for stock silhouettes; 8–12 for bespoke. We work to the leather, not to a deadline.' },
      { q: 'Where is everything made?', a: 'Tbilisi, Georgia. Every piece passes through our studio at least three times before it ships.' },
      { q: 'Do you ship internationally?', a: 'Yes — EU, UK, US, and Canada. DHL Express, fully insured.' },
      { q: 'Can I return a piece?', a: 'Stock silhouettes within 30 days, unused. Bespoke pieces are non-returnable because we built them for you.' },
      { q: 'What\'s the lifetime repair?', a: 'Send us any piece you own from us — at any age — and we\'ll restore it. Including the second owner.' },
      { q: 'How do I care for the leather?', a: 'Don\'t over-care. A soft cloth, occasional conditioner. It will look better at 5 years than at 5 weeks.' },
    ],
    about: { heading: 'Why we built Atelier Volans', body: 'We started because the existing tools felt like they were designed for a deck, not for actual work.\n\nToo many tabs, too many fields, too much theater. We wanted something an operator could use every day without thinking about it.\n\nQuiet, fast, useful. That\'s it.', mission: 'Make objects that improve as they age.' },
    contact: { email: 'studio@volans.ge', blurb: 'A real person reads every email. Expect a reply within a working day.' },
    testimonials: [
      { quote: 'The Field Pouch has been with me for a year. It looks twice as good as the day it arrived.', author: 'Salome Tabukashvili', role: 'Architect, Tbilisi' },
      { quote: 'I ordered the Travel Bag in April. Worth every email.', author: 'Daniel Park', role: 'Founder, Linecraft' },
      { quote: 'They repaired a stitch I\'d torn after three years. Free. Sent back in a week.', author: 'Sofia Mendez', role: 'Director of Ops, Beam & Co' },
    ],
    footer: { tagline: 'Made in Tbilisi. Built to outlast.' },
  },
});

const parsed = parseVariantSpec(RAW, 'Atelier Volans', 'A leather workshop making hand-finished travel goods.');
console.log('llm-authored layers:', parsed.llmAuthored);
console.log('picks:', parsed.spec.picks);
console.log('params keys:', Object.keys(parsed.spec.params));
console.log('decorations (after sanitization):', parsed.spec.decorations.length);
console.log('content features:', parsed.spec.content.features.length);

const pages = renderSite({
  name: 'Atelier Volans',
  slug: 'atelier-volans',
  paragraph: 'A leather workshop making hand-finished travel goods.',
  spec: parsed.spec,
});

const outDir = '/tmp/variant-parse-smoke';
mkdirSync(outDir, { recursive: true });
for (const [filename, html] of Object.entries(pages)) {
  const p = join(outDir, filename);
  writeFileSync(p, html);
  console.log(`wrote ${p} (${html.length} bytes)`);
}
console.log(`\nopen ${outDir}/index.html`);
