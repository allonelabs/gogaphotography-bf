import type { ReactNode, ReactElement } from 'react';

interface Props {
  children: ReactNode;
  /** Smaller variant for nested contexts. */
  small?: boolean;
  className?: string;
}

/** Small-caps section label — the canonical "what kind of thing is this"
 *  marker used across the operator UI. */
export function Eyebrow({ children, small, className }: Props): ReactElement {
  return (
    <p
      className={`font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)] ${
        small ? 'text-[10px]' : 'text-[11px]'
      } ${className ?? ''}`}
    >
      {children}
    </p>
  );
}
