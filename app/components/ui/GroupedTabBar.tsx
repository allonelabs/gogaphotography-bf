'use client';

import type { ReactElement } from 'react';

export interface GroupedTab<TKey extends string = string, TGroup extends string = string> {
  key: TKey;
  label: string;
  group: TGroup;
  /** Optional — milestones get a small "ships next" dot. */
  kind?: 'real' | 'milestone';
  /** Optional roadmap label, e.g. "Slice JJ". Shown in the title attribute. */
  ships?: string;
  /** Hover hint shown via title attribute. */
  hint?: string;
}

export interface TabGroup {
  /** Group label (small-caps title above the pill container). */
  label: string;
  /** Optional sub-label (shown in title attribute). */
  sub?: string;
}

interface Props<TKey extends string, TGroup extends string> {
  /** Group definitions keyed by group key. */
  groups: Readonly<Record<TGroup, TabGroup>>;
  /** Iteration order of groups (left → right). */
  groupOrder: ReadonlyArray<TGroup>;
  /** All tabs across all groups. */
  tabs: ReadonlyArray<GroupedTab<TKey, TGroup>>;
  /** Currently active tab key. */
  activeKey: TKey;
  /** Called when operator picks a tab. */
  onPick: (key: TKey) => void;
}

/** Grouped tab bar — the canonical pattern used by every workspace editor:
 *  Customers (know/engage/support), Videos (library/create/distribute),
 *  Shop (catalog/sell/optimize/fulfill), Content (create/organize/distribute),
 *  Social (compose/channels/measure), Payments (plans/transactions/...).
 *
 *  Each group renders as a small-caps title + a pill container of tabs inside.
 *  Milestone tabs (kind='milestone') show a warning dot. Tabs are scrollable
 *  horizontally if they overflow.
 */
export function GroupedTabBar<TKey extends string, TGroup extends string>({
  groups,
  groupOrder,
  tabs,
  activeKey,
  onPick,
}: Props<TKey, TGroup>): ReactElement {
  return (
    <div className="border-b border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] px-3 py-2">
      <div className="flex items-stretch gap-3 overflow-x-auto">
        {groupOrder.map((g, gIdx) => {
          const group = groups[g];
          if (!group) return null;
          const tabsInGroup = tabs.filter((t) => t.group === g);
          if (tabsInGroup.length === 0) return null;
          return (
            <div key={g} className="flex items-stretch gap-1">
              {gIdx > 0 && <div className="my-1 w-px bg-[var(--bg-surface-alt)]" />}
              <span
                className="px-1 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]"
                title={group.sub}
              >
                {group.label}
              </span>
              <div className="flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] p-1">
                {tabsInGroup.map((t) => {
                  const isActive = activeKey === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => onPick(t.key)}
                      title={t.hint ? `${t.label} — ${t.hint}` : t.label}
                      className={`relative h-7 whitespace-nowrap rounded-[var(--radius-sm)] px-3 text-[12px] font-medium uppercase tracking-wider transition ${
                        isActive
                          ? 'bg-[var(--bg-surface)] text-[var(--ink-900)] shadow-[var(--shadow-sm)]'
                          : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                      }`}
                    >
                      {t.label}
                      {t.kind === 'milestone' && (
                        <span
                          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--allonce-warn,#d97706)]"
                          title={`Milestone — ships ${t.ships ?? 'next'}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
