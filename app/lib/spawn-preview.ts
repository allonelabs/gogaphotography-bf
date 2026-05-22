// Deterministic preview derivations for the spawn wizard's identity step.
// Pure functions — no API calls. Generates name candidates, a palette,
// wordmark typography, and a voice sample from the user's paragraph +
// identity selections. Replaces the hardcoded "volans" + 5 grayscale
// swatches that shipped in v1.
//
// Designed to be fast (deterministic) so the right-side preview updates
// instantly on every pill click. The real spawn pipeline runs the same
// kind of derivation server-side via brand-forge.

export interface PreviewIdentity {
  archetype: string;
  aesthetic: string;
  voice: string;
}

export interface PreviewState {
  names: string[];
  palette: string[];
  wordmarkFont: string;
  wordmarkWeight: number;
  wordmarkLetterSpacing: string;
  voiceSample: string;
  vertical: Vertical;
}

export type Vertical =
  | 'food-bev'
  | 'saas'
  | 'legal-tech'
  | 'nonprofit'
  | 'e-commerce'
  | 'fitness'
  | 'health-wellness'
  | 'creative-studio'
  | 'professional-services'
  | 'general';

// ── Vertical detection ─────────────────────────────────────────────

const VERTICAL_RULES: Array<{ vertical: Vertical; tokens: readonly string[] }> = [
  { vertical: 'food-bev',              tokens: ['coffee', 'roastery', 'restaurant', 'cafe', 'bakery', 'kitchen', 'wine', 'tea', 'bistro'] },
  { vertical: 'saas',                  tokens: ['saas', 'platform', 'api', 'software', 'cloud', 'devtool', 'dashboard'] },
  { vertical: 'legal-tech',            tokens: ['legal', 'law firm', 'compliance', 'gdpr', 'contract', 'attorney'] },
  { vertical: 'nonprofit',             tokens: ['nonprofit', 'charity', 'climate', 'restoration', 'foundation', 'ngo'] },
  { vertical: 'e-commerce',            tokens: ['dtc', 'shop', 'storefront', 'commerce', 'cookware', 'apparel', 'subscription'] },
  { vertical: 'fitness',               tokens: ['gym', 'fitness', 'pilates', 'yoga', 'crossfit', 'studio'] },
  { vertical: 'health-wellness',       tokens: ['clinic', 'wellness', 'mental health', 'therapy', 'practitioner'] },
  { vertical: 'creative-studio',       tokens: ['agency', 'design studio', 'film', 'photography', 'creative'] },
  { vertical: 'professional-services', tokens: ['consultancy', 'consulting', 'advisory', 'broker'] },
];

export function detectVertical(paragraph: string): Vertical {
  const t = paragraph.toLowerCase();
  for (const rule of VERTICAL_RULES) {
    if (rule.tokens.some((tok) => t.includes(tok))) return rule.vertical;
  }
  return 'general';
}

// ── Location → name token ──────────────────────────────────────────

const LOCATION_TOKENS: ReadonlyArray<{ match: RegExp; token: string }> = [
  { match: /tbilisi|georgian|vake/i, token: 'Vake' },
  { match: /berlin|german|kreuzberg/i, token: 'Kreuz' },
  { match: /amsterdam|dutch|nederland/i, token: 'Canal' },
  { match: /new york|nyc|brooklyn|manhattan/i, token: 'Brooklyn' },
  { match: /london|uk|british/i, token: 'Soho' },
  { match: /paris|french|france/i, token: 'Marais' },
  { match: /tokyo|japan|shibuya/i, token: 'Shibuya' },
  { match: /barcelona|spanish|catalan/i, token: 'Gracia' },
];

function locationToken(paragraph: string): string | null {
  const hit = LOCATION_TOKENS.find((l) => l.match.test(paragraph));
  return hit?.token ?? null;
}

// ── Name candidates ────────────────────────────────────────────────

const VERTICAL_NAME_STEMS: Record<Vertical, readonly string[]> = {
  'food-bev':              ['Roast', 'Brew', 'Hearth', 'Knead', 'Pour'],
  'saas':                  ['Stack', 'Forge', 'Loop', 'Rail', 'Layer'],
  'legal-tech':            ['Clause', 'Counsel', 'Statute', 'Brief', 'Docket'],
  'nonprofit':             ['Watershed', 'Commons', 'Grove', 'Field', 'Renew'],
  'e-commerce':            ['Cart', 'Goods', 'Store', 'Mark', 'Ware'],
  'fitness':               ['Form', 'Stride', 'Lift', 'Move', 'Pulse'],
  'health-wellness':       ['Mend', 'Calm', 'Tonic', 'Steady', 'Care'],
  'creative-studio':       ['Studio', 'Frame', 'Canvas', 'Cipher', 'Mark'],
  'professional-services': ['Advis', 'Bench', 'Proxy', 'Counsel', 'Bridge'],
  'general':               ['Volans', 'Compass', 'Helix', 'Anchor', 'Northstar'],
};

const ARCHETYPE_PREFIXES: Record<string, readonly string[]> = {
  'Originator':  ['North', 'First', 'Origin'],
  'Caregiver':   ['Hearth', 'Tend', 'Mend'],
  'Explorer':    ['Compass', 'Wander', 'Trail'],
  'Sage':        ['Lyceum', 'Athenae', 'Council'],
  'Hero':        ['Apex', 'Summit', 'Vanguard'],
  'Lover':       ['Amare', 'Sonnet', 'Velvet'],
  'Jester':      ['Wink', 'Quip', 'Larkspur'],
  'Everyman':    ['Common', 'Daily', 'Plain'],
  'Rebel':       ['Riot', 'Spark', 'Fray'],
  'Creator':     ['Atelier', 'Forge', 'Maker'],
  'Ruler':       ['Crown', 'Sovereign', 'Reign'],
  'Magician':    ['Catalyst', 'Spell', 'Phase'],
};

/** Generates 4 candidate names from paragraph + identity. Deterministic. */
export function generateNameCandidates(paragraph: string, identity: PreviewIdentity): string[] {
  const vertical = detectVertical(paragraph);
  const stems = VERTICAL_NAME_STEMS[vertical];
  const prefixes = ARCHETYPE_PREFIXES[identity.archetype] ?? ['Volans', 'Helix', 'Compass'];
  const loc = locationToken(paragraph);

  const candidates = new Set<string>();
  // Location-anchored when possible (most identity-specific).
  if (loc) {
    candidates.add(`${loc} ${stems[0]}`);
    candidates.add(`${loc} & ${stems[1]}`);
  }
  // Archetype-stem combos.
  candidates.add(`${prefixes[0]}${stems[0]?.toLowerCase()}`);
  candidates.add(`${prefixes[1]} ${stems[2]}`);
  // Single-word fallback.
  candidates.add(`${prefixes[2] ?? prefixes[0]}`);
  return [...candidates].slice(0, 4);
}

// ── Palette derivation ─────────────────────────────────────────────

interface ColorRamp {
  /** 5 swatches: ink → mid → mid → soft → bg. Ordered for the wordmark/UI. */
  swatches: readonly [string, string, string, string, string];
}

const VERTICAL_PALETTES: Record<Vertical, ColorRamp> = {
  'food-bev':              { swatches: ['#3B2417', '#7A4A2E', '#C68B5C', '#E8D3B4', '#F8F1E5'] }, // espresso
  'saas':                  { swatches: ['#0D1B2A', '#1B4965', '#5FA8D3', '#BEE9E8', '#F0F7FA'] }, // ocean
  'legal-tech':            { swatches: ['#1A1A2E', '#16213E', '#0F3460', '#E5E5E5', '#FAFAFA'] }, // navy
  'nonprofit':             { swatches: ['#1B3A2F', '#2D5F4F', '#7FB069', '#D7E8B8', '#F5F8EE'] }, // forest
  'e-commerce':            { swatches: ['#0E0E0E', '#3A3A3A', '#D4503E', '#F4D6D0', '#FCFAF7'] }, // ember
  'fitness':               { swatches: ['#0A0A0A', '#FF3B30', '#FF8A00', '#FFE5CC', '#FFFFFF'] }, // urgent
  'health-wellness':       { swatches: ['#2D3E50', '#5D89A3', '#A8D5BA', '#E8E4D9', '#FAF7F2'] }, // sage
  'creative-studio':       { swatches: ['#0A0A0A', '#FF006E', '#8338EC', '#F2EAE0', '#FFFFFF'] }, // bold
  'professional-services': { swatches: ['#1F2937', '#374151', '#9CA3AF', '#E5E7EB', '#F9FAFB'] }, // slate
  'general':               { swatches: ['#0A0A0A', '#3F3F3F', '#8E8E8E', '#D4D4D4', '#F5F5F5'] }, // grayscale
};

/** Aesthetic shifts: brutalist boosts contrast, organic warms, austere desaturates. */
function applyAesthetic(ramp: ColorRamp, aesthetic: string): ColorRamp {
  switch (aesthetic) {
    case 'Brutalist':
      // Push the accent harder — replace mid with hot accent.
      return { swatches: [ramp.swatches[0], '#000000', ramp.swatches[2], '#FFFFFF', '#FFFFFF'] };
    case 'Organic':
      return { swatches: warmShift(ramp.swatches, 8) };
    case 'Austere':
      return { swatches: desaturate(ramp.swatches) };
    case 'Playful':
      return { swatches: [ramp.swatches[0], ramp.swatches[2], ramp.swatches[1], ramp.swatches[3], ramp.swatches[4]] };
    default:
      return ramp;
  }
}

function warmShift(s: ColorRamp['swatches'], amount: number): ColorRamp['swatches'] {
  return s.map((c) => shiftHue(c, amount)) as unknown as ColorRamp['swatches'];
}

function desaturate(s: ColorRamp['swatches']): ColorRamp['swatches'] {
  return s.map((c) => mixWithGray(c, 0.35)) as unknown as ColorRamp['swatches'];
}

function shiftHue(hex: string, deg: number): string {
  const { r, g, b } = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nh = (h + deg) % 360;
  const { r: nr, g: ng, b: nb } = hslToRgb(nh, s, l);
  return rgbToHex(nr, ng, nb);
}

function mixWithGray(hex: string, weight: number): string {
  const { r, g, b } = hexToRgb(hex);
  const gray = (r + g + b) / 3;
  return rgbToHex(
    Math.round(r * (1 - weight) + gray * weight),
    Math.round(g * (1 - weight) + gray * weight),
    Math.round(b * (1 - weight) + gray * weight),
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  const c = s === 0
    ? l
    : NaN; // unused
  let r = c, g = c, b = c;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function derivePalette(
  paragraph: string,
  identity: PreviewIdentity,
  seedHex?: string,
): string[] {
  const vertical = detectVertical(paragraph);
  const base = VERTICAL_PALETTES[vertical];
  // When the operator supplies a seed color, rebuild the ramp around it:
  // keep the inkdark→bg lightness pattern but pull every swatch's hue
  // toward the seed. Avoids the visual jolt of a single accent color
  // dropped into an otherwise unrelated palette.
  const seeded = seedHex && /^#?[0-9a-f]{6}$/i.test(seedHex)
    ? rebuildAroundSeed(base, seedHex)
    : base;
  const ramp = applyAesthetic(seeded, identity.aesthetic);
  return [...ramp.swatches];
}

function rebuildAroundSeed(base: ColorRamp, seedHex: string): ColorRamp {
  const seed = hexToRgb(seedHex.startsWith('#') ? seedHex : `#${seedHex}`);
  const [seedH, seedS] = rgbToHsl(seed.r, seed.g, seed.b);
  // Re-tone each swatch: keep its lightness, replace hue with seed,
  // blend saturation 70/30 toward seed. Position 0 (ink) stays dark
  // and gets a slight seed tint; positions 3/4 stay light.
  const next = base.swatches.map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    const [, s, l] = rgbToHsl(r, g, b);
    const blendedS = s * 0.3 + seedS * 0.7;
    const { r: nr, g: ng, b: nb } = hslToRgb(seedH, blendedS, l);
    return rgbToHex(nr, ng, nb);
  }) as unknown as ColorRamp['swatches'];
  return { swatches: next };
}

// ── Wordmark typography ────────────────────────────────────────────

export function deriveWordmarkStyle(aesthetic: string): {
  font: string;
  weight: number;
  letterSpacing: string;
} {
  switch (aesthetic) {
    case 'Editorial':
      return { font: 'Georgia, "Times New Roman", serif', weight: 600, letterSpacing: '-0.02em' };
    case 'Brutalist':
      return { font: '"Helvetica Neue", Arial, sans-serif', weight: 900, letterSpacing: '-0.04em' };
    case 'Organic':
      return { font: '"Inter", system-ui, sans-serif', weight: 500, letterSpacing: '-0.01em' };
    case 'Monospace':
      return { font: '"IBM Plex Mono", "Courier New", monospace', weight: 500, letterSpacing: '0em' };
    case 'Serif-driven':
      return { font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: '-0.015em' };
    case 'Playful':
      return { font: '"Inter", system-ui, sans-serif', weight: 700, letterSpacing: '-0.015em' };
    case 'Austere':
      return { font: '"Helvetica Neue", Arial, sans-serif', weight: 300, letterSpacing: '0.05em' };
    case 'Minimal':
    default:
      return { font: '"Inter", system-ui, sans-serif', weight: 600, letterSpacing: '-0.025em' };
  }
}

// ── Voice sample ───────────────────────────────────────────────────

export function deriveVoiceSample(paragraph: string, identity: PreviewIdentity): string {
  const vertical = detectVertical(paragraph);
  const v = identity.voice.toLowerCase();
  const noun = verticalNoun(vertical);

  // Core sample varies on voice; vertical threads in via `noun`.
  switch (v) {
    case 'confident':
      return `${capitalize(noun)}, done right. No filler, no fuss.`;
    case 'warm':
      return `Small ${noun}. Made for you. Share with someone you love.`;
    case 'authoritative':
      return `${capitalize(noun)}. Verified. Documented. Worth your time.`;
    case 'conversational':
      return `Hey — we make ${noun}. Want to try one? It only takes a minute.`;
    case 'playful':
      return `${capitalize(noun)} that doesn't take itself too seriously. Promise.`;
    case 'poetic':
      return `${capitalize(noun)} arriving at dawn. Stories in every detail.`;
    default:
      return `${capitalize(noun)}, every day, at your door.`;
  }
}

function verticalNoun(v: Vertical): string {
  switch (v) {
    case 'food-bev':              return 'cups';
    case 'saas':                  return 'integrations';
    case 'legal-tech':            return 'clauses';
    case 'nonprofit':             return 'projects';
    case 'e-commerce':            return 'orders';
    case 'fitness':               return 'sessions';
    case 'health-wellness':       return 'consults';
    case 'creative-studio':       return 'work';
    case 'professional-services': return 'engagements';
    default:                      return 'work';
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

// ── Tone-of-voice alignment ───────────────────────────────────────
//
// Token rules that hint at the operator's intent. When the paragraph
// strongly signals "Authoritative" but the operator picked "Playful",
// the rubric warns. Useful guardrail before a 30-120s spawn that
// would otherwise produce a brand identity at odds with the brief.

const VOICE_HINTS: ReadonlyArray<{ voice: string; tokens: readonly string[]; weight: number }> = [
  { voice: 'Authoritative', tokens: ['enterprise', 'compliance', 'institutional', 'professional', 'audit', 'regulated', 'legal', 'firm', 'corporate'], weight: 1 },
  { voice: 'Warm',          tokens: ['care', 'family', 'community', 'small batch', 'handmade', 'love', 'cozy', 'friend', 'wellness'], weight: 1 },
  { voice: 'Playful',       tokens: ['fun', 'playful', 'kids', 'game', 'whimsical', 'merch', 'lifestyle'], weight: 1 },
  { voice: 'Confident',     tokens: ['leader', 'first', 'best', 'fastest', 'category', 'pioneer', 'flagship'], weight: 1 },
  { voice: 'Conversational',tokens: ['saas', 'devtool', 'developer', 'startup', 'indie', 'maker'], weight: 1 },
  { voice: 'Poetic',        tokens: ['artisan', 'editorial', 'gallery', 'film', 'studio', 'craft'], weight: 1 },
];

export interface VoiceAlignment {
  /** The voice the paragraph most strongly implies (or null if no signal). */
  readonly suggested: string | null;
  /** True when the operator's picked voice doesn't match the suggestion. */
  readonly mismatch: boolean;
  /** Hint strings describing the signal (paragraph tokens that drove the
   *  suggestion, e.g. "enterprise, compliance"). */
  readonly signalTokens: readonly string[];
}

export function alignVoice(paragraph: string, selectedVoice: string): VoiceAlignment {
  const t = paragraph.toLowerCase();
  if (t.length < 10) return { suggested: null, mismatch: false, signalTokens: [] };
  // Score each candidate voice by how many of its hint tokens appear.
  let best: { voice: string; score: number; tokens: string[] } | null = null;
  for (const h of VOICE_HINTS) {
    const hits = h.tokens.filter((tok) => t.includes(tok));
    const score = hits.length * h.weight;
    if (score === 0) continue;
    if (!best || score > best.score) best = { voice: h.voice, score, tokens: hits };
  }
  if (!best) return { suggested: null, mismatch: false, signalTokens: [] };
  return {
    suggested: best.voice,
    mismatch: best.voice !== selectedVoice,
    signalTokens: best.tokens,
  };
}

// ── Top-level convenience ──────────────────────────────────────────

export function buildPreview(
  paragraph: string,
  identity: PreviewIdentity,
  seedHex?: string,
): PreviewState {
  const vertical = detectVertical(paragraph);
  const wmStyle = deriveWordmarkStyle(identity.aesthetic);
  return {
    names: generateNameCandidates(paragraph, identity),
    palette: derivePalette(paragraph, identity, seedHex),
    wordmarkFont: wmStyle.font,
    wordmarkWeight: wmStyle.weight,
    wordmarkLetterSpacing: wmStyle.letterSpacing,
    voiceSample: deriveVoiceSample(paragraph, identity),
    vertical,
  };
}
