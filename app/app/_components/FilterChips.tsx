import Link from "next/link";

type Chip = { value: string; label: string; count?: number };

/**
 * Server-rendered tabbed filter row. Each chip is a real link to
 * `?{param}=<value>`; the active chip carries the dark "ink" pill style.
 * `all` is special: it links to the same path with the param removed.
 */
export function FilterChips({
  basePath,
  param = "status",
  active,
  chips,
}: {
  basePath: string;
  param?: string;
  active: string | null;
  chips: Chip[];
}) {
  const allChips: Chip[] = [{ value: "all", label: "All" }, ...chips];
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1.5">
      {allChips.map((c) => {
        const isActive = c.value === "all" ? !active : active === c.value;
        const href =
          c.value === "all"
            ? basePath
            : `${basePath}?${param}=${encodeURIComponent(c.value)}`;
        return (
          <Link
            key={c.value}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
              isActive
                ? "bg-[var(--ink-900)] text-white"
                : "border border-black/10 bg-white text-[var(--ink-700)] hover:bg-slate-50"
            }`}
          >
            <span>{c.label}</span>
            {typeof c.count === "number" ? (
              <span
                className={`tabular-nums text-[10px] ${
                  isActive ? "text-white/65" : "text-[var(--ink-400)]"
                }`}
              >
                {c.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
