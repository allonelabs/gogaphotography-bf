"use client";

/**
 * Eyebrow header for the booking-vertical list pages. Provides:
 *   - A small uppercase eyebrow label with a colored dot (per-vertical accent)
 *   - A title and subtitle
 *   - A right-side total count + an optional "new" CTA gated by permission
 *
 * Used by /app/<vertical> list pages to break the visual uniformity that
 * came out of the generic factory. The accent colors are Tailwind tokens
 * (no hex codes) — slate / teal / amber / indigo / rose / stone / sky.
 */

import Link from "next/link";
import { useHasPermission } from "@/app/lib/auth/use-permissions";

export type VerticalAccent =
  | "slate"
  | "teal"
  | "amber"
  | "indigo"
  | "rose"
  | "stone"
  | "sky";

const ACCENT_DOT: Record<VerticalAccent, string> = {
  slate: "bg-slate-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  stone: "bg-stone-500",
  sky: "bg-sky-500",
};

const ACCENT_TEXT: Record<VerticalAccent, string> = {
  slate: "text-slate-600",
  teal: "text-teal-600",
  amber: "text-amber-700",
  indigo: "text-indigo-600",
  rose: "text-rose-600",
  stone: "text-stone-600",
  sky: "text-sky-600",
};

const ACCENT_BG: Record<VerticalAccent, string> = {
  slate: "bg-slate-50 dark:bg-slate-900/30",
  teal: "bg-teal-50 dark:bg-teal-900/20",
  amber: "bg-amber-50 dark:bg-amber-900/20",
  indigo: "bg-indigo-50 dark:bg-indigo-900/20",
  rose: "bg-rose-50 dark:bg-rose-900/20",
  stone: "bg-stone-50 dark:bg-stone-900/20",
  sky: "bg-sky-50 dark:bg-sky-900/20",
};

export interface VerticalEyebrowProps {
  /** Eyebrow label, e.g. "AVIA" or "BOOKINGS · AVIA" */
  eyebrow: string;
  /** H1 page title */
  title: string;
  /** Subtitle / one-liner positioning */
  subtitle: string;
  /** Total count to show on the right (number for tabular-nums) */
  count?: number;
  /** Label suffix for the count, e.g. "airlines" */
  countLabel?: string;
  /** Per-vertical accent color */
  accent: VerticalAccent;
  /** Optional CTA URL — when set, renders a primary button on the right */
  ctaHref?: string;
  /** CTA label */
  ctaLabel?: string;
  /** Permission code that gates visibility of the CTA */
  ctaPermission?: string;
}

export function VerticalEyebrow({
  eyebrow,
  title,
  subtitle,
  count,
  countLabel,
  accent,
  ctaHref,
  ctaLabel,
  ctaPermission,
}: VerticalEyebrowProps) {
  const canCta = useHasPermission(ctaPermission ?? "");
  const showCta = Boolean(
    ctaHref && ctaLabel && (ctaPermission ? canCta : true),
  );

  return (
    <div
      className={`mb-5 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--allonce-line)] ${ACCENT_BG[accent]} px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-5`}
    >
      <div className="min-w-0">
        <div
          className={`mb-1 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] ${ACCENT_TEXT[accent]}`}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent]}`}
          />
          <span>{eyebrow}</span>
        </div>
        <h1 className="truncate text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
          {title}
        </h1>
        <p className="mt-0.5 truncate text-[13px] text-[var(--ink-500)]">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {typeof count === "number" && (
          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-400)]">
            {count} {countLabel ?? ""}
          </span>
        )}
        {showCta && (
          <Link
            href={ctaHref!}
            className="whitespace-nowrap rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--ao-accent-hover)]"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
