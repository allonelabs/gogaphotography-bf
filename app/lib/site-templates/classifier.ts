// Brief → template hint classifier.
//
// Keyword-based scoring across the 6 templates. Returns ranked scores so
// the LLM gets a strong prior in the prompt, and so we can fall back
// deterministically if the LLM picks something obviously wrong (e.g.
// "hotel" brief but LLM returned 'vercel-saas').
//
// Pure function, zero deps. The signal is intentionally simple — the LLM
// still drives the final choice; we just nudge it.

import type { TemplateKey, SectionOrderKey, HeroKey, PaletteKey } from './schema';

interface TemplateSignal {
  template: TemplateKey;
  keywords: string[];
  /** Description for the prompt (operator-facing). */
  description: string;
  /** Preferred section orderings — first is strongest preference. */
  preferredOrders: SectionOrderKey[];
  /** Preferred hero variants — first is strongest preference. */
  preferredHeroes: HeroKey[];
  /** Preferred palette families. */
  preferredPalettes: PaletteKey[];
}

const SIGNALS: TemplateSignal[] = [
  {
    template: 'walkby-ecom',
    description: 'High-fashion DTC, apparel, accessories, lifestyle ecommerce',
    keywords: [
      'fashion', 'apparel', 'clothing', 'wear', 'wardrobe', 'streetwear', 'denim',
      'ecommerce', 'e-commerce', 'shop', 'store', 'collection', 'dtc',
      'menswear', 'womenswear', 'jewelry', 'accessories', 'sneaker',
      'launch', 'lookbook', 'season', 'capsule', 'drop',
    ],
    preferredOrders: ['social-first', 'classic'],
    preferredHeroes: ['photo-fullbleed', 'photo-split', 'product-isolate'],
    preferredPalettes: ['mono-ink', 'bw-contrast', 'warm-paper', 'oxblood'],
  },
  {
    template: 'afisha-hotel',
    description: 'Hotel, resort, retreat, villa, hospitality',
    keywords: [
      'hotel', 'resort', 'villa', 'retreat', 'lodge', 'inn', 'boutique hotel',
      'bnb', 'b&b', 'hospitality', 'accommodation', 'stay', 'suite',
      'rooms', 'booking', 'reservation', 'concierge', 'spa', 'check-in',
      'guests', 'nights', 'amenities',
    ],
    preferredOrders: ['story-first', 'value-led', 'editorial'],
    preferredHeroes: ['photo-fullbleed', 'split-image-caption'],
    preferredPalettes: ['jewel', 'earth', 'oxblood', 'terracotta'],
  },
  {
    template: 'equivalenza-retail',
    description: 'Perfumery, cosmetics, candles, fragrances, boutique retail',
    keywords: [
      'perfume', 'fragrance', 'cosmetic', 'beauty', 'skincare', 'candle',
      'eau de', 'essential oil', 'parfum', 'scent', 'aroma',
      'boutique', 'curated', 'small-batch', 'apothecary', 'wellness',
      'lifestyle store', 'home goods', 'gifts',
    ],
    preferredOrders: ['social-first', 'value-led', 'classic'],
    preferredHeroes: ['photo-split', 'product-isolate', 'split-image-caption'],
    preferredPalettes: ['warm-paper', 'pastel', 'terracotta', 'oxblood'],
  },
  {
    template: 'utopia-portfolio',
    description: 'Creative agency, motion house, design studio, photographer, portfolio',
    keywords: [
      'studio', 'agency', 'creative', 'designer', 'design firm',
      'portfolio', 'work', 'projects', 'case studies', 'awwwards',
      'art direction', 'branding agency', 'film', 'motion', 'cgi',
      'photography', 'photographer', 'illustration', 'type foundry',
      'film studio', 'production', 'visual',
    ],
    preferredOrders: ['story-first', 'editorial', 'value-led'],
    preferredHeroes: ['manifesto-statement', 'photo-fullbleed', 'typography-only'],
    preferredPalettes: ['mono-ink', 'bw-contrast', 'slate', 'earth'],
  },
  // qualige-edu intentionally NOT a classifier signal — education / LMS
  // functionality lives inside the Team surface (course/lesson/quiz/roster
  // builders in components/team/). Spawnable edu sites route to vercel-saas
  // with a marketing-led pitch instead of an in-product course platform.
  {
    template: 'vercel-saas',
    description: 'B2B SaaS, dev tools, API platforms, infrastructure, productivity',
    keywords: [
      'saas', 'platform', 'api', 'sdk', 'developer', 'devtool', 'infrastructure',
      'cloud', 'data', 'analytics', 'observability', 'devops', 'cli',
      'integration', 'workflow', 'automation', 'b2b', 'team', 'collaboration',
      'productivity', 'enterprise', 'engineering', 'database',
    ],
    preferredOrders: ['classic', 'trust-stack', 'feature-deep', 'metrics-first'],
    preferredHeroes: ['typography-only', 'abstract-gradient', 'big-number-display', 'product-isolate'],
    preferredPalettes: ['cool-tech', 'mono-ink', 'slate', 'electric'],
  },
];

export interface ClassificationResult {
  /** Best-fit template family. */
  best: TemplateKey;
  /** All templates ranked by score, highest first. */
  ranked: Array<{ template: TemplateKey; score: number; matchedKeywords: string[] }>;
  /** Confidence 0-1 — gap between best and second-best, normalized. */
  confidence: number;
}

export function classifyBrief(brief: string): ClassificationResult {
  const text = brief.toLowerCase();
  const scores = SIGNALS.map(({ template, keywords }) => {
    const matched: string[] = [];
    let score = 0;
    for (const kw of keywords) {
      // Word-boundary-ish match (handles "shop" vs "shopify").
      const re = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        matched.push(kw);
        score += 1;
      }
    }
    return { template, score, matchedKeywords: matched };
  });
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0]?.score && scores[0].score > 0 ? scores[0].template : 'vercel-saas';
  const top = scores[0]?.score ?? 0;
  const second = scores[1]?.score ?? 0;
  const confidence = top === 0 ? 0 : Math.min(1, (top - second) / Math.max(1, top));
  return { best, ranked: scores, confidence };
}

/** Return the preferred section order / hero / palette lists for a template. */
export function preferencesForTemplate(template: TemplateKey): {
  orders: SectionOrderKey[]; heroes: HeroKey[]; palettes: PaletteKey[];
} {
  const sig = SIGNALS.find((s) => s.template === template);
  return sig
    ? { orders: sig.preferredOrders, heroes: sig.preferredHeroes, palettes: sig.preferredPalettes }
    : { orders: ['classic'], heroes: ['typography-only'], palettes: ['mono-ink'] };
}

/** Prompt fragment to inject as a hint after the picks options list. */
export function classifierHint(brief: string): string {
  const c = classifyBrief(brief);
  if (c.confidence < 0.15 || c.ranked[0]?.score === 0) return '';
  const top = c.ranked.slice(0, 2).filter((r) => r.score > 0);
  if (top.length === 0) return '';
  const lines = top.map((r) => {
    const sig = SIGNALS.find((s) => s.template === r.template);
    const desc = sig?.description ?? '';
    const prefs = sig
      ? `\n      preferred picks: sectionOrder=${sig.preferredOrders[0]}, hero=${sig.preferredHeroes[0]}, palette=${sig.preferredPalettes.slice(0, 2).join('|')}`
      : '';
    return `  - ${r.template} (matched: ${r.matchedKeywords.slice(0, 4).join(', ')}) — ${desc}${prefs}`;
  });
  return `\n\nBrief classifier hints (use as a STRONG prior — override only if business voice clearly demands otherwise):\n${lines.join('\n')}`;
}

/** Safety override: if LLM picked something with zero keyword overlap AND classifier has high confidence, swap. */
export function maybeOverrideTemplate(brief: string, llmPick: TemplateKey): TemplateKey {
  const c = classifyBrief(brief);
  if (c.confidence < 0.4) return llmPick;
  // If LLM's pick has zero keyword matches in the brief but classifier has a clear winner, override.
  const llmEntry = c.ranked.find((r) => r.template === llmPick);
  if (llmEntry && llmEntry.score === 0 && c.ranked[0] && c.ranked[0].score >= 2) {
    return c.ranked[0].template;
  }
  return llmPick;
}
