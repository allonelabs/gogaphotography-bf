import type { ReactNode, ReactElement } from 'react';

interface Props {
  children: ReactNode;
  /** Inset uses --bg-surface-alt for nested cards (e.g. inside another card). */
  inset?: boolean;
  /** Add hover-lift affordance — for clickable cards. */
  hoverable?: boolean;
  /** Tight padding; defaults to comfortable. */
  tight?: boolean;
  className?: string;
}

export function Card({ children, inset, hoverable, tight, className }: Props): ReactElement {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-lg)] ${
        inset ? 'bg-[var(--bg-surface-alt)]' : 'bg-[var(--bg-surface)]'
      } shadow-[var(--shadow-sm)] ${
        hoverable ? 'transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]' : ''
      } ${tight ? 'p-4' : 'p-6'} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
