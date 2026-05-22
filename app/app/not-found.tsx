import Link from "next/link";
import { getServerT } from "@/app/lib/i18n/server";

/**
 * Branded 404 inside the authenticated /app group. Replaces the default
 * Next.js stock 404 with a calm, monochrome page that matches the rest of
 * the operator surface.
 *
 * Triggered by:
 *   - explicit `notFound()` calls in detail pages when the row isn't found
 *   - permission-gated routes (audit, etc.) calling `requirePermission()`
 *     which falls through to notFound() to avoid leaking the route's
 *     existence.
 */
export default async function NotFound() {
  const t = await getServerT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-400)]">
          404
        </p>
        <h1 className="mt-3 text-[24px] font-medium leading-tight tracking-[-0.01em] text-[var(--ink-900)]">
          {t("errors.not_found.title")}
        </h1>
        <p className="mt-3 text-[14px] leading-[1.55] text-[var(--ink-500)]">
          {t("errors.not_found.body")}
        </p>
        <div className="mt-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-900)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-black"
          >
            {t("errors.go_home")}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
