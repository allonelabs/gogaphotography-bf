// TeamThemeScope — applies the per-business brand tokens as CSS variables
// scoped to the team-LMS subtree. Each spawned business's Qualige experience
// reads from the same brand-forge cells the spawned site reads, so the LMS
// surface auto-themes to whatever palette / typography the brand has shipped.

import type { ReactNode } from 'react';
import type { BrandSnapshot } from '@/app/lib/brand-loader';

interface Props {
  brand: BrandSnapshot | null;
  children: ReactNode;
}

interface SimpleTokenSet {
  primary?: string;
  surface?: string;
  ink?: string;
  accent?: string;
  fontDisplay?: string;
  fontBody?: string;
}

function pickTokens(brand: BrandSnapshot | null): SimpleTokenSet {
  const out: SimpleTokenSet = {};
  if (!brand) return out;
  // Brand tree shape mirrors brand-loader's BrandTokenTree.set. We pick the
  // tokens we actually use in the LMS without a deep DTCG resolver — the
  // exported `out/<id>/.cells/brand-forge.exports/tokens.css` already has
  // resolved values, but here we read top-level leaves to keep this small.
  const set = brand.tokens?.set as Record<string, unknown> | undefined;
  if (!set) return out;
  // Common shapes: { color: { primary: { $value }, surface: { ... } } }
  const color = (set['color'] as Record<string, unknown> | undefined) ?? {};
  const font = (set['font'] as Record<string, unknown> | undefined) ?? {};

  const leaf = (group: Record<string, unknown>, k: string): string | undefined => {
    const v = group[k] as { $value?: unknown } | undefined;
    return typeof v?.$value === 'string' ? v.$value : undefined;
  };

  out.primary = leaf(color, 'primary') ?? leaf(color, 'accent');
  out.surface = leaf(color, 'surface') ?? leaf(color, 'bg');
  out.ink = leaf(color, 'ink') ?? leaf(color, 'fg');
  out.accent = leaf(color, 'accent') ?? leaf(color, 'primary');
  out.fontDisplay = leaf(font, 'display');
  out.fontBody = leaf(font, 'body');
  return out;
}

export function TeamThemeScope({ brand, children }: Props) {
  const t = pickTokens(brand);
  const style: Record<string, string> = {};
  if (t.primary) style['--lms-primary'] = t.primary;
  if (t.surface) style['--lms-surface'] = t.surface;
  if (t.ink) style['--lms-ink'] = t.ink;
  if (t.accent) style['--lms-accent'] = t.accent;
  if (t.fontDisplay) style['--lms-font-display'] = t.fontDisplay;
  if (t.fontBody) style['--lms-font-body'] = t.fontBody;

  return (
    <div
      className="lms-themed"
      style={{
        // Defaults so the page is usable when brand cells haven't authored.
        ['--lms-primary' as string]: 'var(--allonce-ink)',
        ['--lms-surface' as string]: '#fff',
        ['--lms-ink' as string]: 'var(--allonce-ink)',
        ['--lms-accent' as string]: 'var(--allonce-ink)',
        ['--lms-font-display' as string]: 'var(--font-display, system-ui)',
        ['--lms-font-body' as string]: 'var(--font-body, system-ui)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
