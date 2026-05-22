// Deterministic quality scoring for the operator's spawn paragraph.
// Powers the live rubric on step 0 — gives the user a concrete signal
// of which dimensions the classifier still has to guess at.
//
// The four dimensions mirror what spawn.ts's adHocBrief() looks for:
//   industry-clarity   — does the paragraph name a vertical?
//   model-clarity      — b2b / b2c / nonprofit / marketplace signals
//   target-clarity     — who's the customer?
//   geographic-clarity — where does the business operate?
//
// Each dimension scores 0..1. The composite is the average.

export interface BriefQuality {
  readonly industry: number;
  readonly model: number;
  readonly target: number;
  readonly geographic: number;
  readonly composite: number;
  readonly suggestions: readonly string[];
}

const INDUSTRY_TOKENS: readonly string[] = [
  'coffee', 'roastery', 'restaurant', 'cafe', 'bakery', 'kitchen', 'wine', 'tea', 'bistro',
  'saas', 'platform', 'api', 'software', 'cloud', 'devtool', 'dashboard',
  'legal', 'law firm', 'compliance', 'gdpr', 'contract', 'attorney',
  'nonprofit', 'charity', 'climate', 'restoration', 'foundation', 'ngo',
  'dtc', 'shop', 'storefront', 'commerce', 'cookware', 'apparel', 'subscription',
  'gym', 'fitness', 'pilates', 'yoga', 'crossfit', 'studio',
  'clinic', 'wellness', 'mental health', 'therapy', 'practitioner',
  'agency', 'design studio', 'film', 'photography', 'creative',
  'consultancy', 'consulting', 'advisory', 'broker',
];

const MODEL_TOKENS: readonly string[] = [
  'b2b', 'b2c', 'b2b2c', 'marketplace', 'nonprofit', 'ngo',
  'enterprise', 'small business', 'consumer', 'subscription',
  'wholesale', 'retail', 'direct-to-consumer', 'dtc',
];

const TARGET_TOKENS: readonly string[] = [
  'customer', 'customers', 'client', 'clients', 'user', 'users',
  'employee', 'employees', 'team', 'teams', 'developer', 'developers',
  'designer', 'designers', 'founder', 'founders', 'investor', 'investors',
  'student', 'students', 'patient', 'patients', 'member', 'members',
  'practitioner', 'practitioners', 'firm', 'firms', 'subscriber', 'subscribers',
  'consumer', 'consumers',
];

// Geographic signals = locations + jurisdiction tokens + country names.
const GEO_TOKENS: readonly string[] = [
  'tbilisi', 'georgian', 'georgia', 'vake', 'batumi',
  'berlin', 'germany', 'german', 'munich', 'hamburg', 'kreuzberg',
  'amsterdam', 'dutch', 'netherlands', 'rotterdam',
  'london', 'uk', 'british', 'england',
  'paris', 'french', 'france', 'lyon',
  'new york', 'nyc', 'brooklyn', 'manhattan', 'california', 'sf', 'austin', 'denver',
  'eu', 'european', 'us', 'american',
  'tokyo', 'japan', 'barcelona', 'spanish', 'singapore',
];

function scoreTokens(paragraph: string, tokens: readonly string[]): number {
  const t = paragraph.toLowerCase();
  // First match counts; any subsequent match shifts the score from 0.5 → 1.0.
  // Two-or-more matches → 1.0; one match → 0.5; zero → 0.
  let hits = 0;
  for (const tok of tokens) {
    if (t.includes(tok)) {
      hits++;
      if (hits >= 2) return 1;
    }
  }
  return hits === 1 ? 0.5 : 0;
}

export function scoreBrief(paragraph: string): BriefQuality {
  const trimmed = paragraph.trim();
  if (trimmed.length < 10) {
    return {
      industry: 0,
      model: 0,
      target: 0,
      geographic: 0,
      composite: 0,
      suggestions: ['Add at least one full sentence describing the business.'],
    };
  }
  const industry = scoreTokens(paragraph, INDUSTRY_TOKENS);
  const model = scoreTokens(paragraph, MODEL_TOKENS);
  const target = scoreTokens(paragraph, TARGET_TOKENS);
  const geographic = scoreTokens(paragraph, GEO_TOKENS);
  const composite = (industry + model + target + geographic) / 4;

  const suggestions: string[] = [];
  if (industry < 0.5) suggestions.push('Name the industry or product category (e.g. "speciality coffee", "legal-tech SaaS").');
  if (model < 0.5)    suggestions.push('Mention the business model (e.g. "subscription", "B2B", "DTC", "marketplace").');
  if (target < 0.5)   suggestions.push('Describe the target customer (e.g. "small EU law firms", "design studios").');
  if (geographic < 0.5) suggestions.push('Add a location or jurisdiction (e.g. "Tbilisi", "EU-wide", "New York").');

  return { industry, model, target, geographic, composite, suggestions };
}

export function qualityLabel(score: number): { label: string; tone: 'critical' | 'caution' | 'positive' } {
  if (score < 0.34) return { label: 'thin',     tone: 'critical' };
  if (score < 0.67) return { label: 'workable', tone: 'caution' };
  return { label: 'strong', tone: 'positive' };
}

// ── Sentence stubs ────────────────────────────────────────────────
//
// One-click appendable sentence starters keyed to the dimension that's
// thin. The operator clicks → the stub is appended to the paragraph and
// they fill in the blank. Not Claude — deterministic, instant, no
// network. Pairs with the quality rubric: each stub closes one of the
// missing dimensions.

export interface StubSuggestion {
  readonly dimension: 'industry' | 'model' | 'target' | 'geographic';
  readonly stub: string;
  readonly hint: string;
}

const STUBS: ReadonlyArray<StubSuggestion> = [
  { dimension: 'industry',   stub: ' We focus on ',            hint: 'Name the product or vertical (e.g. "speciality coffee", "legal-tech SaaS")' },
  { dimension: 'model',      stub: ' We sell via ',            hint: 'B2B / B2C / DTC / subscription / marketplace' },
  { dimension: 'target',     stub: ' Our customers are ',      hint: 'Who buys from you (e.g. "small EU law firms", "design studios")' },
  { dimension: 'geographic', stub: ' Based in ',               hint: 'City + country, or region (e.g. "Tbilisi", "EU-wide")' },
];

/** Returns a sentence stub for each thin dimension. Skips dimensions
 *  already covered. Order matches the rubric so the UI can stack them
 *  alongside the dimension bars. */
export function suggestStubs(paragraph: string): StubSuggestion[] {
  const score = scoreBrief(paragraph);
  const out: StubSuggestion[] = [];
  for (const stub of STUBS) {
    const dimScore = score[stub.dimension];
    if (dimScore < 0.5) out.push(stub);
  }
  return out;
}
