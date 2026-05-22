import { writeFileSync, mkdirSync } from 'node:fs';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const picks: VariantPicks = {
  template: 'vercel-saas', layout: 'centered', hero: 'manifesto-statement',
  heroPhotoStyle: 'editorial', palette: 'oxblood', background: 'paper-grain',
  fonts: 'editorial-serif', sectionOrder: 'value-led', density: 'luxe',
  motion: 'magnetic-cta', cta: 'pill', radius: 'sharp', imageFx: 'film',
  typeScale: 'luxurious', logoPos: 'top-left',
  navStyle: 'floating-pill', footerStyle: 'expanded-columns',
  hoverEffect: 'underline-slide', dividers: 'decorative-glyph',
  featuresStyle: 'asymmetric-split',
  pricingStyle: 'comparison-table',
  testimonialsStyle: 'editorial-stack',
};

const spec: VariantSpec = {
  picks,
  params: { taglineSuperline: 'VALUE-LED · 08', accentColor: '#7c2d12' },
  decorations: [
    { section: 'features', anchor: 'top-right', preset: 'asterisk-bold', opacity: 0.18 },
    { section: 'cta', anchor: 'center', preset: 'rule-double', opacity: 0.4 },
  ],
  content: fallbackContent('Value Co', 'A demonstration of value-prop-band ordering plus magnetic CTAs and new alt sections.'),
};

mkdirSync('/tmp/value-prop-smoke', { recursive: true });
const pages = renderSiteByTemplate({ name: 'Value Co', slug: 'value-co', paragraph: spec.content.subhead, spec });
for (const [f, html] of Object.entries(pages)) writeFileSync(`/tmp/value-prop-smoke/${f}`, html);
console.log('open /tmp/value-prop-smoke/index.html');
