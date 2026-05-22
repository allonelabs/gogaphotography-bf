import type { ReactNode, ReactElement } from 'react';

interface Props {
  /** Operator-language title. NEVER include internal jargon (cell, bridge, forge, etc).
   *  Examples: "Your brand isn't set up yet", "No customers yet", "Billing isn't configured". */
  title: string;
  /** Optional one-line elaboration. */
  body?: ReactNode;
  /** Eyebrow above the title (small-caps section label). */
  eyebrow?: string;
  /** Optional CTA — usually "Generate brand", "Connect Stripe", etc. */
  action?: ReactNode;
  /** Compact variant for inline empty states inside a tab/section. */
  compact?: boolean;
  className?: string;
}

/** Confident-default empty state. Replaces every "No data" / "Nothing here yet"
 *  string in the operator UI. The default tone is "your business is ready
 *  to do this thing — generate it" rather than "the system has nothing". */
export function EmptyState({
  title,
  body,
  eyebrow,
  action,
  compact,
  className,
}: Props): ReactElement {
  return (
    <div
      className={`mx-auto rounded-[var(--radius-lg)] bg-[var(--bg-surface)] text-center shadow-[var(--shadow-sm)] ${
        compact ? 'max-w-[480px] px-6 py-8' : 'max-w-[640px] px-8 py-12'
      } ${className ?? ''}`}
    >
      {eyebrow && (
        <p className="font-semibold uppercase tracking-[0.14em] text-[10.5px] text-[var(--ink-700)]">
          {eyebrow}
        </p>
      )}
      <h2 className={`text-[var(--ink-900)] ${compact ? 'mt-1.5 text-[18px]' : 'mt-2 text-[22px]'}`}>
        {title}
      </h2>
      {body && (
        <div className={`mx-auto text-[var(--ink-500)] ${compact ? 'mt-2 max-w-[40ch] text-[12.5px]' : 'mt-3 max-w-[50ch] text-[13px]'}`}>
          {body}
        </div>
      )}
      {action && <div className={compact ? 'mt-4' : 'mt-6'}>{action}</div>}
    </div>
  );
}
