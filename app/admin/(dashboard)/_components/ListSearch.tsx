"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Generic debounced `?q=` search input. Preserves any other query
 * params (e.g. `?status=confirmed`) so it composes cleanly with
 * FilterChips.
 */
export function ListSearch({
  placeholder = "Search…",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [, start] = useTransition();

  useEffect(() => {
    setQ(initial);
  }, [initial]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = q.trim();
      const next = new URLSearchParams(params.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const queryString = next.toString();
      start(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
      });
    }, 220);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pathname]);

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-400)]"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="block w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
        />
      </div>
      {q ? (
        <button
          type="button"
          onClick={() => setQ("")}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
