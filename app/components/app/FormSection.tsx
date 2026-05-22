"use client";

import type { ReactNode } from "react";

/**
 * A visual grouping for form fields. Used by the per-vertical detail forms
 * to break the flat single-column layout the factory produced into
 * semantically named sections (Identity, Location, Contact, Notes, etc).
 *
 * Renders as a small uppercase eyebrow + an optional helper line, then the
 * children in a responsive 1-column / 2-column grid.
 */
export function FormSection({
  title,
  hint,
  children,
  cols = 2,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  /** 1 for stacked, 2 for two-column on >=sm */
  cols?: 1 | 2;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-500)]">
          {title}
        </h2>
        {hint && (
          <p className="mt-0.5 text-[12px] text-[var(--ink-400)]">{hint}</p>
        )}
      </header>
      <div className={cols === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {children}
      </div>
    </section>
  );
}

export function FormField({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  /** Span both columns on sm+ */
  full?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}
