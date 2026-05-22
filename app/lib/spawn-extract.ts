// Deterministic entity extraction from the operator's paragraph.
// Powers (a) auto-pre-seed of jurisdiction + language in the wizard
// so users don't have to re-state what they already wrote, and
// (b) the live entities pill row on step 0 that shows what the
// classifier picked up.

interface JurisdictionHint {
  iso: 'GE' | 'DE' | 'US' | 'NL' | 'UK' | 'FR' | null;
  language: string | null;
}

const JURISDICTION_RULES: Array<{ iso: JurisdictionHint['iso']; language: string; tokens: readonly string[] }> = [
  { iso: 'GE', language: 'ka-GE', tokens: ['tbilisi', 'georgian', 'georgia', 'vake', 'batumi', 'kutaisi'] },
  { iso: 'DE', language: 'de-DE', tokens: ['berlin', 'germany', 'german', 'munich', 'hamburg', 'kreuzberg'] },
  { iso: 'NL', language: 'nl-NL', tokens: ['amsterdam', 'dutch', 'nederland', 'netherlands', 'rotterdam', 'utrecht'] },
  { iso: 'UK', language: 'en-GB', tokens: ['london', 'uk', 'british', 'england', 'manchester', 'edinburgh'] },
  { iso: 'FR', language: 'fr-FR', tokens: ['paris', 'french', 'france', 'lyon', 'marseille'] },
  { iso: 'US', language: 'en-US', tokens: ['new york', 'nyc', 'brooklyn', 'manhattan', 'california', 'la', 'sf', 'san francisco', 'austin', 'us-based', 'american', 'denver', 'chicago'] },
];

export function detectJurisdiction(paragraph: string): JurisdictionHint {
  const t = paragraph.toLowerCase();
  for (const rule of JURISDICTION_RULES) {
    if (rule.tokens.some((tok) => t.includes(tok))) {
      return { iso: rule.iso, language: rule.language };
    }
  }
  return { iso: null, language: null };
}

// ── Entity extraction (UI surface) ────────────────────────────────

const VERTICAL_TOKENS: ReadonlyArray<{ vertical: string; tokens: readonly string[] }> = [
  { vertical: 'food & bev',     tokens: ['coffee', 'roastery', 'restaurant', 'cafe', 'bakery', 'wine', 'tea'] },
  { vertical: 'SaaS',           tokens: ['saas', 'platform', 'api', 'software', 'cloud', 'devtool'] },
  { vertical: 'legal-tech',     tokens: ['legal', 'law firm', 'compliance', 'gdpr', 'contract'] },
  { vertical: 'nonprofit',      tokens: ['nonprofit', 'charity', 'climate', 'foundation', 'ngo'] },
  { vertical: 'e-commerce',     tokens: ['dtc', 'shop', 'storefront', 'cookware', 'apparel'] },
  { vertical: 'fitness',        tokens: ['gym', 'fitness', 'pilates', 'yoga', 'crossfit'] },
  { vertical: 'wellness',       tokens: ['clinic', 'wellness', 'therapy', 'practitioner'] },
  { vertical: 'creative',       tokens: ['agency', 'design studio', 'film', 'photography'] },
  { vertical: 'professional',   tokens: ['consultancy', 'consulting', 'advisory', 'broker'] },
];

const MODEL_TOKENS: ReadonlyArray<{ label: string; tokens: readonly string[] }> = [
  { label: 'subscription',  tokens: ['subscription', 'recurring'] },
  { label: 'B2B',           tokens: ['b2b', 'enterprise', 'wholesale'] },
  { label: 'B2C',           tokens: ['b2c', 'consumer', 'direct-to-consumer', 'dtc'] },
  { label: 'marketplace',   tokens: ['marketplace', 'two-sided'] },
  { label: 'storefront',    tokens: ['storefront', 'retail', 'shop'] },
  { label: 'nonprofit',     tokens: ['nonprofit', 'ngo', 'charity'] },
];

const TARGET_TOKENS: ReadonlyArray<{ label: string; tokens: readonly string[] }> = [
  { label: 'SMBs',          tokens: ['small business', 'small businesses', 'smb', 'mom and pop'] },
  { label: 'enterprise',    tokens: ['enterprise', 'fortune 500'] },
  { label: 'developers',    tokens: ['developer', 'engineer', 'devops'] },
  { label: 'designers',     tokens: ['designer'] },
  { label: 'firms',         tokens: ['firms', 'firm'] },
  { label: 'patients',      tokens: ['patient'] },
  { label: 'students',      tokens: ['student'] },
  { label: 'consumers',     tokens: ['consumer', 'subscriber'] },
];

const LOCATION_LABEL: Record<string, string> = {
  GE: 'Georgia',
  DE: 'Germany',
  NL: 'Netherlands',
  UK: 'United Kingdom',
  FR: 'France',
  US: 'United States',
};

export interface ExtractedEntities {
  readonly vertical: string | null;
  readonly location: string | null;
  readonly model: readonly string[];
  readonly target: readonly string[];
}

function pickFirst<T>(rules: ReadonlyArray<{ tokens: readonly string[] } & T>, t: string): T | null {
  for (const r of rules) {
    if (r.tokens.some((tok) => t.includes(tok))) {
      const { tokens: _t, ...rest } = r;
      return rest as T;
    }
  }
  return null;
}

function pickAll<T>(rules: ReadonlyArray<{ tokens: readonly string[] } & T>, t: string): T[] {
  const out: T[] = [];
  for (const r of rules) {
    if (r.tokens.some((tok) => t.includes(tok))) {
      const { tokens: _t, ...rest } = r;
      out.push(rest as T);
    }
  }
  return out;
}

export function extractEntities(paragraph: string): ExtractedEntities {
  const t = paragraph.toLowerCase();
  if (t.length < 10) {
    return { vertical: null, location: null, model: [], target: [] };
  }
  const verticalHit = pickFirst<{ vertical: string }>(VERTICAL_TOKENS, t);
  const jurisdiction = detectJurisdiction(paragraph);
  const location = jurisdiction.iso ? LOCATION_LABEL[jurisdiction.iso] ?? jurisdiction.iso : null;
  const modelHits = pickAll<{ label: string }>(MODEL_TOKENS, t).map((m) => m.label);
  const targetHits = pickAll<{ label: string }>(TARGET_TOKENS, t).map((m) => m.label);
  return {
    vertical: verticalHit?.vertical ?? null,
    location: location ?? null,
    model: modelHits,
    target: targetHits,
  };
}
