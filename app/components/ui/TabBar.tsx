'use client';

import type { ReactNode, ReactElement } from 'react';

export interface TabBarItem<TKey extends string = string> {
  key: TKey;
  label: string;
  /** Optional small badge / count. */
  badge?: ReactNode;
  /** Optional icon (renders before label). */
  icon?: ReactNode;
  /** Disabled = greyed out, not clickable. */
  disabled?: boolean;
}

interface Props<TKey extends string> {
  tabs: ReadonlyArray<TabBarItem<TKey>>;
  current: TKey;
  onChange: (key: TKey) => void;
  /** Compact — small-caps style for sub-nav rows. Default = standard. */
  compact?: boolean;
  className?: string;
}

/** Operator UI canonical tab bar. Replaces ad-hoc tab implementations across
 *  workspaces (Brand, Website, Videos, Mails, Shop, Team, Automations all
 *  have their own variants today — this is the unified primitive). */
export function TabBar<TKey extends string>({
  tabs,
  current,
  onChange,
  compact,
  className,
}: Props<TKey>): ReactElement {
  return (
    <div
      className={`flex items-stretch gap-1 overflow-x-auto ${className ?? ''}`}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.key)}
            className={`group flex items-center gap-2 rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
              compact
                ? 'h-7 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]'
                : 'h-9 px-3.5 text-[13px] font-medium'
            } ${
              active
                ? 'bg-white text-[var(--ink-900)]'
                : 'text-[var(--ink-700)] hover:bg-white hover:text-[var(--ink-900)]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge != null && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px] font-semibold tabular-nums text-[var(--ink-900)]">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
