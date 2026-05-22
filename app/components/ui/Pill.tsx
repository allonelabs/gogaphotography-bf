import type { ReactNode, ReactElement } from 'react';

export type PillTone = 'neutral' | 'accent' | 'success' | 'warn' | 'error' | 'ghost';

interface Props {
  children: ReactNode;
  tone?: PillTone;
  /** Optional dot indicator before the label. */
  dot?: boolean;
  /** Compact (small-caps tracking) vs regular. */
  compact?: boolean;
  className?: string;
}

const TONE_BG: Record<PillTone, string> = {
  neutral: 'bg-[var(--bg-sunken)]',
  accent: 'bg-[rgba(0,71,255,0.08)]',
  success: 'bg-[rgba(40,200,64,0.10)]',
  warn: 'bg-[rgba(217,119,6,0.10)]',
  error: 'bg-[rgba(220,38,38,0.10)]',
  ghost: 'bg-white',
};

const TONE_TEXT: Record<PillTone, string> = {
  neutral: 'text-[var(--ink-700)]',
  accent: 'text-[var(--ao-accent,#0047FF)]',
  success: 'text-[var(--allonce-ok,#28C840)]',
  warn: 'text-[var(--allonce-warn,#d97706)]',
  error: 'text-[var(--allonce-err,#dc2626)]',
  ghost: 'text-[var(--ink-900)]',
};

const TONE_DOT: Record<PillTone, string> = {
  neutral: 'bg-[var(--ink-700)]',
  accent: 'bg-[var(--ao-accent,#0047FF)]',
  success: 'bg-[var(--allonce-ok,#28C840)]',
  warn: 'bg-[var(--allonce-warn,#d97706)]',
  error: 'bg-[var(--allonce-err,#dc2626)]',
  ghost: 'bg-[var(--ink-700)]',
};

export function Pill({
  children,
  tone = 'neutral',
  dot,
  compact,
  className,
}: Props): ReactElement {
  const sizing = compact
    ? 'h-5 px-2 text-[10.5px] tracking-[0.14em] uppercase font-semibold'
    : 'h-6 px-2.5 text-[11.5px] font-medium';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizing} ${TONE_BG[tone]} ${TONE_TEXT[tone]} ${className ?? ''}`}
    >
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  );
}
