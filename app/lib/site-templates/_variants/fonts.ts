// Eight curated font pairs. Each is a complete display/body stack with the
// Google Fonts URL pre-built. LLM picks the pair via `picks.fonts`; the
// renderer drops the URL into <head> and the stacks into CSS variables.

import type { FontsKey, ResolvedFonts } from '../schema';

interface FontPair {
  display: string;
  body: string;
  googleFontsUrl: string;
}

const FONTS: Record<FontsKey, FontPair> = {
  'editorial-serif': {
    display: '"Fraunces", "Times New Roman", Georgia, serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
  },
  'swiss-grotesk': {
    display: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    body: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  },
  'neo-grotesk': {
    display: '"Space Grotesk", "Inter", system-ui, sans-serif',
    body: '"Space Grotesk", "Inter", system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  'display-serif': {
    display: '"Playfair Display", Georgia, "Times New Roman", serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap',
  },
  'mono-led': {
    display: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
    body: '"Inter", system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap',
  },
  'humanist': {
    display: '"DM Serif Display", Georgia, serif',
    body: '"DM Sans", system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap',
  },
  'rounded-friendly': {
    display: '"Nunito", system-ui, -apple-system, sans-serif',
    body: '"Nunito", system-ui, -apple-system, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
  },
  'classical': {
    display: '"Cormorant Garamond", Garamond, Georgia, serif',
    body: '"Cormorant Garamond", Garamond, Georgia, serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap',
  },
};

export function resolveFonts(key: FontsKey): ResolvedFonts {
  return FONTS[key] ?? FONTS['swiss-grotesk'];
}
