// Smoke video-block + integration-grid + tech-led ordering + new presets.
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderSiteByTemplate } from '../app/lib/site-templates';
import type { VariantSpec, VariantPicks } from '../app/lib/site-templates/schema';
import { fallbackContent } from '../app/lib/site-renderer';

const picks: VariantPicks = {
  template: 'vercel-saas', layout: 'centered', hero: 'typography-only',
  heroPhotoStyle: 'cinematic', palette: 'cool-tech', background: 'dot-grid',
  fonts: 'neo-grotesk', sectionOrder: 'tech-led', density: 'balanced',
  motion: 'scroll-stagger', cta: 'pill', radius: 'soft-12', imageFx: 'none',
  typeScale: 'balanced', logoPos: 'top-left',
  navStyle: 'minimal-flat', footerStyle: 'expanded-columns',
  hoverEffect: 'underline-slide', dividers: 'thin-line',
  featuresStyle: 'grid-card', pricingStyle: 'comparison-table', testimonialsStyle: 'cards',
};

const spec: VariantSpec = {
  picks,
  params: { taglineSuperline: 'TECH-LED · 12' },
  decorations: [
    { section: 'features', anchor: 'top-right', preset: 'block-solid', opacity: 0.08, scale: 1.2 },
    { section: 'cta', anchor: 'center', preset: 'thick-rule', opacity: 0.5 },
  ],
  content: fallbackContent('Stackline', 'A B2B SaaS platform demonstrating video-block + integration-grid + tech-led ordering.'),
};

mkdirSync('/tmp/tech-sections-smoke', { recursive: true });
const pages = renderSiteByTemplate({ name: 'Stackline', slug: 'stackline', paragraph: spec.content.subhead, spec });
for (const [f, html] of Object.entries(pages)) writeFileSync(`/tmp/tech-sections-smoke/${f}`, html);
console.log('open /tmp/tech-sections-smoke/index.html');
