// Shared two-column settings layout. Left: groups nav. Right: content.

import Link from 'next/link';
import type { ReactNode } from 'react';

interface SettingsItem {
  href: string;
  label: string;
  sub?: string;
}

interface SettingsLayoutProps {
  activeHref: string;
  title: string;
  subtitle?: string;
  groups: Array<{ title: string; items: SettingsItem[] }>;
  children: ReactNode;
}

export function SettingsLayout({
  activeHref,
  title,
  subtitle,
  groups,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="px-10 py-9">
      <div className="mx-auto max-w-[1200px]">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="display-h1 mt-1.5">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-500)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:h-fit">
            {groups.map((g, gi) => (
              <div key={g.title} className={gi > 0 ? 'mt-6' : ''}>
                <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-400)]">
                  {g.title}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {g.items.map((it) => {
                    const active = it.href === activeHref;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          className={`flex h-8 items-center rounded-md px-2 text-[13px] transition ${
                            active
                              ? 'bg-[var(--bg-sunken)] text-[var(--ink-900)] font-medium'
                              : 'text-[var(--ink-500)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)]'
                          }`}
                        >
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

// Shared primitives for rows inside settings.
export function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-[17px] font-semibold text-[var(--ink-900)]">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-[13px] text-[var(--ink-500)]">{subtitle}</p>
      )}
      <div className="mt-4 grouped-list">{children}</div>
    </section>
  );
}

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--ink-900)]">{label}</p>
        {hint && <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function TextInput({ placeholder, defaultValue }: { placeholder?: string; defaultValue?: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="h-9 w-64 rounded-md bg-[var(--bg-surface-alt)] px-3 text-[13px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] no-ring outline-none transition focus:bg-[var(--bg-sunken)]"
    />
  );
}

export function Select({
  options,
  defaultValue,
}: {
  options: string[];
  defaultValue?: string;
}) {
  return (
    <select
      defaultValue={defaultValue}
      className="h-9 w-64 rounded-md bg-[var(--bg-surface-alt)] px-3 text-[13px] text-[var(--ink-900)] no-ring outline-none transition focus:bg-[var(--bg-sunken)]"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center">
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-[var(--bg-sunken)] transition peer-checked:bg-[var(--ink-900)]">
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
