// Small flatten + value utilities for working with the brand token tree.
// Extracted from BrandEditor so the Designer's logo overlay (which now
// renders the same LogoCanvas component) can build its `flat` token map
// without re-implementing the recursion.

import type { BrandTokenGroup, BrandTokenLeaf } from './brand-loader';

export function flattenBrandTokens(
  group: BrandTokenGroup,
  prefix = '',
): Record<string, BrandTokenLeaf> {
  const out: Record<string, BrandTokenLeaf> = {};
  for (const [k, v] of Object.entries(group)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && '$value' in v) {
      out[path] = v as BrandTokenLeaf;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flattenBrandTokens(v as BrandTokenGroup, path));
    }
  }
  return out;
}

export function tokenStringValue(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}
