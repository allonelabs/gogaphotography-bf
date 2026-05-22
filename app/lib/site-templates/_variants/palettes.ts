// Eight hand-tuned palettes. Each is a complete token set.
//
// LLM picks one via `picks.palette`; params can override individual hex values
// (accent / ink / paper) post-pick. `accentSoft` is derived for translucent
// section backgrounds. `inkOnAccent` is the best foreground when text sits
// on top of the accent (computed from WCAG contrast).

import type { PaletteKey, ResolvedPalette } from '../schema';

interface RawPalette {
  ink: string;
  paper: string;
  accent: string;
  muted: string;
  line: string;
}

const PALETTES: Record<PaletteKey, RawPalette> = {
  'mono-ink': {
    ink: '#0a0a0a',
    paper: '#fafafa',
    accent: '#0047ff',
    muted: '#6b6b6b',
    line: '#e5e5e5',
  },
  'warm-paper': {
    ink: '#1a1410',
    paper: '#fbf7f0',
    accent: '#c2410c',
    muted: '#78716c',
    line: '#e7e5e4',
  },
  'cool-tech': {
    ink: '#0c1117',
    paper: '#f6f8fa',
    accent: '#2563eb',
    muted: '#57606a',
    line: '#d0d7de',
  },
  'earth': {
    ink: '#1c1917',
    paper: '#f4f1ec',
    accent: '#7c6e4d',
    muted: '#736b5e',
    line: '#d6d3d0',
  },
  'electric': {
    ink: '#0a0a0a',
    paper: '#ffffff',
    accent: '#ff3b00',
    muted: '#52525b',
    line: '#e4e4e7',
  },
  'pastel': {
    ink: '#27272a',
    paper: '#fef9f5',
    accent: '#d946a0',
    muted: '#71717a',
    line: '#f4e7dd',
  },
  'bw-contrast': {
    ink: '#000000',
    paper: '#ffffff',
    accent: '#000000',
    muted: '#525252',
    line: '#171717',
  },
  'jewel': {
    ink: '#0c0c10',
    paper: '#f5f3f0',
    accent: '#7c2d12',
    muted: '#5b5b66',
    line: '#d4d4d8',
  },
  'oxblood': {
    ink: '#1a0a0a',
    paper: '#faf6f2',
    accent: '#6a1320',
    muted: '#6b4f4f',
    line: '#e8d8d8',
  },
  'mint': {
    ink: '#0a1410',
    paper: '#f0f7f2',
    accent: '#0e7a4e',
    muted: '#5b7c6f',
    line: '#d4e5dc',
  },
  'slate': {
    ink: '#0f1419',
    paper: '#eef1f4',
    accent: '#3b4252',
    muted: '#5e6776',
    line: '#cdd4dc',
  },
  'terracotta': {
    ink: '#2a1810',
    paper: '#fcf4ec',
    accent: '#b65a3a',
    muted: '#8a6d5b',
    line: '#e8d6c4',
  },
};

// Hex helpers (no external dep).
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}
function luminance([r, g, b]: [number, number, number]): number {
  const norm = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (norm[0] ?? 0) + 0.7152 * (norm[1] ?? 0) + 0.0722 * (norm[2] ?? 0);
}
export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(hexToRgb(fg));
  const l2 = luminance(hexToRgb(bg));
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}
function rgbaFromHex(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolvePalette(key: PaletteKey, overrides?: { accentColor?: string; inkColor?: string; paperColor?: string }): ResolvedPalette {
  const raw = PALETTES[key] ?? PALETTES['mono-ink'];
  const accent = overrides?.accentColor ?? raw.accent;
  const ink = overrides?.inkColor ?? raw.ink;
  const paper = overrides?.paperColor ?? raw.paper;
  // Best foreground over accent — pick whichever of {paper, ink} hits >= 4.5.
  const ratioPaper = contrastRatio(paper, accent);
  const ratioInk = contrastRatio(ink, accent);
  const inkOnAccent = ratioPaper >= ratioInk ? paper : ink;
  return {
    ink,
    paper,
    accent,
    accentSoft: rgbaFromHex(accent, 0.08),
    muted: raw.muted,
    line: raw.line,
    inkOnAccent,
  };
}

export function isAccentReadableOnPaper(accent: string, paper: string): boolean {
  return contrastRatio(accent, paper) >= 3.0;
}
