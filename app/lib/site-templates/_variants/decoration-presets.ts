// Decoration preset library.
//
// 20+ named SVG snippets the LLM can reference by ID instead of authoring
// raw SVG. Way more reliable than freeform — every preset is hand-tuned,
// scales correctly, uses currentColor, ages well.
//
// Preset names are emitted as `decorationPreset` in the LLM output; the
// renderer resolves them to inner-SVG content. Free-roam SVG via the
// existing `svg` field still works as fallback / advanced use.

export interface DecorationPreset {
  id: string;
  category: 'geometric' | 'organic' | 'glyph' | 'editorial';
  /** Inner SVG content. Renderer wraps in viewBox="-100 -100 200 200". */
  svg: string;
  /** Recommended scale multiplier — finer detail wants larger, bold needs smaller. */
  scale: number;
}

export const DECORATION_PRESETS: Record<string, DecorationPreset> = {
  // ── Geometric — clean, architectural ──────────────────────────────────
  'orbits-2': {
    id: 'orbits-2', category: 'geometric', scale: 1.5,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.5"><circle cx="0" cy="0" r="80"/><circle cx="0" cy="0" r="50"/></g>',
  },
  'orbits-3': {
    id: 'orbits-3', category: 'geometric', scale: 1.6,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.5"><circle cx="0" cy="0" r="90"/><circle cx="0" cy="0" r="60"/><circle cx="0" cy="0" r="30"/></g>',
  },
  'cross': {
    id: 'cross', category: 'geometric', scale: 1.2,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.6"><line x1="0" y1="-70" x2="0" y2="70"/><line x1="-70" y1="0" x2="70" y2="0"/></g>',
  },
  'crosshair': {
    id: 'crosshair', category: 'geometric', scale: 1.3,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.5"><circle cx="0" cy="0" r="60"/><line x1="0" y1="-80" x2="0" y2="80"/><line x1="-80" y1="0" x2="80" y2="0"/></g>',
  },
  'triangle-up': {
    id: 'triangle-up', category: 'geometric', scale: 1.1,
    svg: '<polygon points="0,-60 60,40 -60,40" stroke="currentColor" fill="none" stroke-width="0.6"/>',
  },
  'square-rotate': {
    id: 'square-rotate', category: 'geometric', scale: 1.1,
    svg: '<rect x="-50" y="-50" width="100" height="100" stroke="currentColor" fill="none" stroke-width="0.5" transform="rotate(45)"/>',
  },
  'diamond-pair': {
    id: 'diamond-pair', category: 'geometric', scale: 1.2,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.5" transform="rotate(45)"><rect x="-50" y="-50" width="100" height="100"/><rect x="-30" y="-30" width="60" height="60"/></g>',
  },
  'dot-cluster': {
    id: 'dot-cluster', category: 'geometric', scale: 1.4,
    svg: '<g fill="currentColor"><circle cx="-40" cy="-40" r="3"/><circle cx="0" cy="-50" r="3"/><circle cx="40" cy="-40" r="3"/><circle cx="-50" cy="0" r="3"/><circle cx="50" cy="0" r="3"/><circle cx="-40" cy="40" r="3"/><circle cx="0" cy="50" r="3"/><circle cx="40" cy="40" r="3"/></g>',
  },
  'grid-3x3': {
    id: 'grid-3x3', category: 'geometric', scale: 1.5,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.4"><line x1="-60" y1="-20" x2="60" y2="-20"/><line x1="-60" y1="20" x2="60" y2="20"/><line x1="-60" y1="60" x2="60" y2="60"/><line x1="-60" y1="-60" x2="60" y2="-60"/><line x1="-20" y1="-60" x2="-20" y2="60"/><line x1="20" y1="-60" x2="20" y2="60"/><line x1="-60" y1="-60" x2="-60" y2="60"/><line x1="60" y1="-60" x2="60" y2="60"/></g>',
  },

  // ── Organic — wavy, soft ──────────────────────────────────────────────
  'wave-single': {
    id: 'wave-single', category: 'organic', scale: 1.8,
    svg: '<path d="M -100 0 Q -50 -20 0 0 T 100 0" stroke="currentColor" fill="none" stroke-width="0.8"/>',
  },
  'wave-stack': {
    id: 'wave-stack', category: 'organic', scale: 1.8,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.6"><path d="M -100 -20 Q -50 -40 0 -20 T 100 -20"/><path d="M -100 0 Q -50 -20 0 0 T 100 0"/><path d="M -100 20 Q -50 0 0 20 T 100 20"/></g>',
  },
  'spiral': {
    id: 'spiral', category: 'organic', scale: 1.4,
    svg: '<path d="M 0 0 Q 30 -30 0 -60 Q -60 -60 -60 0 Q -60 60 30 60 Q 90 60 90 -30" stroke="currentColor" fill="none" stroke-width="0.5"/>',
  },
  'blob': {
    id: 'blob', category: 'organic', scale: 1.6,
    svg: '<path d="M 60 -10 C 70 30 30 70 -20 60 C -70 50 -70 -10 -50 -40 C -30 -70 30 -60 60 -10 Z" stroke="currentColor" fill="none" stroke-width="0.6"/>',
  },

  // ── Glyph — type-driven marks ─────────────────────────────────────────
  'asterisk-bold': {
    id: 'asterisk-bold', category: 'glyph', scale: 1.0,
    svg: '<text x="0" y="22" text-anchor="middle" fill="currentColor" font-family="serif" font-size="120" font-weight="700">*</text>',
  },
  'plus-mark': {
    id: 'plus-mark', category: 'glyph', scale: 1.0,
    svg: '<g stroke="currentColor" stroke-width="3" stroke-linecap="square"><line x1="0" y1="-40" x2="0" y2="40"/><line x1="-40" y1="0" x2="40" y2="0"/></g>',
  },
  'arrow-down-right': {
    id: 'arrow-down-right', category: 'glyph', scale: 1.1,
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.8" stroke-linecap="square"><line x1="-50" y1="-50" x2="50" y2="50"/><polyline points="20,50 50,50 50,20"/></g>',
  },

  // ── Editorial — magazine-style marks ──────────────────────────────────
  'rule-horizontal': {
    id: 'rule-horizontal', category: 'editorial', scale: 2.0,
    svg: '<line x1="-90" y1="0" x2="90" y2="0" stroke="currentColor" stroke-width="0.5"/>',
  },
  'rule-double': {
    id: 'rule-double', category: 'editorial', scale: 2.0,
    svg: '<g stroke="currentColor" stroke-width="0.5"><line x1="-90" y1="-4" x2="90" y2="-4"/><line x1="-90" y1="4" x2="90" y2="4"/></g>',
  },
  'bracket-corner': {
    id: 'bracket-corner', category: 'editorial', scale: 1.3,
    svg: '<g stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="square"><polyline points="-50,-40 -50,-50 -40,-50"/><polyline points="40,-50 50,-50 50,-40"/><polyline points="-50,40 -50,50 -40,50"/><polyline points="40,50 50,50 50,40"/></g>',
  },
  'tally-marks': {
    id: 'tally-marks', category: 'editorial', scale: 1.0,
    svg: '<g stroke="currentColor" stroke-width="2" stroke-linecap="square"><line x1="-40" y1="-25" x2="-40" y2="25"/><line x1="-20" y1="-25" x2="-20" y2="25"/><line x1="0" y1="-25" x2="0" y2="25"/><line x1="20" y1="-25" x2="20" y2="25"/><line x1="-48" y1="20" x2="28" y2="-20"/></g>',
  },
  // ── Brutalist — heavier, more confrontational marks ───────────────────
  'block-solid': {
    id: 'block-solid', category: 'editorial', scale: 1.1,
    svg: '<rect x="-50" y="-50" width="100" height="100" fill="currentColor"/>',
  },
  'half-circle': {
    id: 'half-circle', category: 'geometric', scale: 1.4,
    svg: '<path d="M -80 0 A 80 80 0 0 1 80 0 Z" fill="currentColor"/>',
  },
  'thick-rule': {
    id: 'thick-rule', category: 'editorial', scale: 2.0,
    svg: '<line x1="-90" y1="0" x2="90" y2="0" stroke="currentColor" stroke-width="6" stroke-linecap="square"/>',
  },
  // ── More organic — vine/leaf shapes ──────────────────────────────────
  'leaf-pair': {
    id: 'leaf-pair', category: 'organic', scale: 1.3,
    svg: '<g fill="currentColor" opacity="0.6"><path d="M -40 -20 Q -10 -50 0 0 Q -10 50 -40 20 Z"/><path d="M 40 -20 Q 10 -50 0 0 Q 10 50 40 20 Z"/></g>',
  },
  'wave-thick': {
    id: 'wave-thick', category: 'organic', scale: 1.7,
    svg: '<path d="M -100 0 Q -50 -30 0 0 T 100 0" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round"/>',
  },
  // ── Editorial frame ──────────────────────────────────────────────────
  'bracket-frame-full': {
    id: 'bracket-frame-full', category: 'editorial', scale: 1.4,
    svg: '<g stroke="currentColor" fill="none" stroke-width="1" stroke-linecap="square"><polyline points="-60,-50 -60,-60 -50,-60"/><polyline points="50,-60 60,-60 60,-50"/><polyline points="-60,50 -60,60 -50,60"/><polyline points="50,60 60,60 60,50"/><line x1="-60" y1="0" x2="-50" y2="0"/><line x1="50" y1="0" x2="60" y2="0"/></g>',
  },

  // ── Typographic glyphs — magazine / editorial flourishes ─────────────
  // Each is sized inside the renderer's -100..100 viewBox; rely on
  // currentColor so palette inversion works.
  'ampersand': {
    id: 'ampersand', category: 'glyph', scale: 1.0,
    svg: '<text x="0" y="40" text-anchor="middle" fill="currentColor" font-family="Georgia, serif" font-size="160" font-style="italic" font-weight="400">&amp;</text>',
  },
  'paragraph-mark': {
    id: 'paragraph-mark', category: 'glyph', scale: 0.95,
    svg: '<text x="0" y="35" text-anchor="middle" fill="currentColor" font-family="Georgia, serif" font-size="140" font-weight="400">¶</text>',
  },
  'section-symbol': {
    id: 'section-symbol', category: 'glyph', scale: 0.95,
    svg: '<text x="0" y="35" text-anchor="middle" fill="currentColor" font-family="Georgia, serif" font-size="130" font-weight="400">§</text>',
  },

  // ── Premium minimal — ring-pulse, ticked rule, inner arrow ───────────
  'ring-pulse': {
    id: 'ring-pulse', category: 'geometric', scale: 1.5,
    // Three concentric rings with progressively fainter stroke — reads as
    // a quiet sonar/pulse without becoming a logo. Pairs with cool-tech /
    // mono-ink palettes and SaaS / wellness verticals.
    svg: '<g stroke="currentColor" fill="none"><circle cx="0" cy="0" r="40" stroke-width="0.8"/><circle cx="0" cy="0" r="60" stroke-width="0.6" opacity="0.6"/><circle cx="0" cy="0" r="82" stroke-width="0.4" opacity="0.35"/></g>',
  },
  'ticked-rule': {
    id: 'ticked-rule', category: 'editorial', scale: 1.9,
    // Hairline rule with five tiny perpendicular ticks — feels like a
    // measuring tape or stat axis. Sits well in metrics-led layouts.
    svg: '<g stroke="currentColor" stroke-width="0.5"><line x1="-90" y1="0" x2="90" y2="0"/><line x1="-80" y1="-4" x2="-80" y2="4"/><line x1="-40" y1="-4" x2="-40" y2="4"/><line x1="0" y1="-4" x2="0" y2="4"/><line x1="40" y1="-4" x2="40" y2="4"/><line x1="80" y1="-4" x2="80" y2="4"/></g>',
  },
  'inner-arrow': {
    id: 'inner-arrow', category: 'glyph', scale: 1.0,
    // Bracket containing a small forward arrow — reads as "next chapter"
    // / "into" without resorting to a clichéd play-button.
    svg: '<g stroke="currentColor" fill="none" stroke-width="0.7" stroke-linecap="square"><polyline points="-50,-40 -60,-40 -60,40 -50,40"/><polyline points="50,-40 60,-40 60,40 50,40"/><line x1="-25" y1="0" x2="25" y2="0"/><polyline points="15,-10 25,0 15,10"/></g>',
  },
};

export type DecorationPresetId = keyof typeof DECORATION_PRESETS;

/** Resolve a preset id to its SVG content + scale. Returns null on miss. */
export function resolvePreset(id: string): DecorationPreset | null {
  return DECORATION_PRESETS[id] ?? null;
}

/** All preset ids, for the LLM prompt. */
export function listPresetIds(): string[] {
  return Object.keys(DECORATION_PRESETS);
}
