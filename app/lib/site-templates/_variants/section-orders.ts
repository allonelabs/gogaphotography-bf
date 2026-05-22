// Six hand-tuned page section sequences (after hero, before footer).
// LLM picks one via `picks.sectionOrder`.

import type { SectionOrderKey } from '../schema';

export type SectionType = 'features' | 'testimonials' | 'pricing' | 'faq' | 'about-mission' | 'cta-band' | 'value-prop-band' | 'partner-logos' | 'stats-counter' | 'split-content-image' | 'video-block' | 'integration-grid';

const ORDERS: Record<SectionOrderKey, SectionType[]> = {
  // Classic SaaS flow.
  classic: ['features', 'testimonials', 'pricing', 'faq', 'cta-band'],
  // Lead with social proof, then explain.
  'social-first': ['testimonials', 'features', 'pricing', 'faq', 'cta-band'],
  // Pricing-led — for commodity / clear-value plays.
  'pricing-led': ['pricing', 'features', 'testimonials', 'faq', 'cta-band'],
  // Story-first — for craft / premium positioning.
  'story-first': ['about-mission', 'features', 'testimonials', 'pricing', 'cta-band'],
  // Editorial — long-form, fewer punchy sections.
  editorial: ['about-mission', 'features', 'testimonials', 'cta-band'],
  // Minimal — just the essentials.
  minimal: ['features', 'pricing', 'cta-band'],
  // Feature-deep — explain features first, then prove with testimonials, then price.
  'feature-deep': ['features', 'features', 'testimonials', 'pricing', 'faq', 'cta-band'],
  // Metrics-first — lead with proof points, then story.
  'metrics-first': ['testimonials', 'about-mission', 'features', 'pricing', 'cta-band'],
  // Value-led — oversized value-prop hits right after hero, then proof.
  'value-led': ['value-prop-band', 'features', 'testimonials', 'pricing', 'cta-band'],
  // Trust-stack — partner logos + stats + features + pricing. For B2B.
  'trust-stack': ['partner-logos', 'stats-counter', 'features', 'testimonials', 'pricing', 'cta-band'],
  // Proof-heavy — stats + testimonials twice + features. For wellness, finance, healthcare.
  'proof-heavy': ['stats-counter', 'testimonials', 'features', 'partner-logos', 'cta-band'],
  // Visual-led — split-image immediately, features in grid, testimonials, cta. For product/craft briefs.
  'visual-led': ['split-content-image', 'features', 'testimonials', 'pricing', 'cta-band'],
  // Tech-led — features → integration-grid → video → pricing. For SaaS, devtools, platforms.
  'tech-led': ['features', 'integration-grid', 'video-block', 'testimonials', 'pricing', 'cta-band'],
  // Cinematic — video-block opens, then story, testimonials, cta. For premium service / studio.
  'cinematic': ['video-block', 'about-mission', 'features', 'testimonials', 'cta-band'],
};

export function resolveSectionOrder(key: SectionOrderKey): SectionType[] {
  return ORDERS[key] ?? ORDERS.classic;
}
