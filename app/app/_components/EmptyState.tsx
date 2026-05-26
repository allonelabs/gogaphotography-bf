import Link from "next/link";

type Cta = { label: string; href: string };

/**
 * Premium-feeling empty state. A round muted icon disk, headline,
 * one-line description, optional primary + secondary CTA. Drop into
 * any list page where there are zero rows.
 */
export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primary?: Cta;
  secondary?: Cta;
}) {
  return (
    <div className="rounded-2xl bg-white px-8 py-12 text-center ring-1 ring-black/5">
      {icon ? (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-[var(--ink-500)]">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[16px] font-medium text-[var(--ink-900)]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-[1.6] text-[var(--ink-500)]">
          {description}
        </p>
      ) : null}
      {primary || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primary ? (
            <Link
              href={primary.href}
              className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
            >
              {primary.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link
              href={secondary.href}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Inline SVG icons — uniform 20px stroke, currentColor. */
export function Icon({
  name,
}: {
  name:
    | "inbox"
    | "calendar"
    | "scroll"
    | "image"
    | "tag"
    | "camera"
    | "grid"
    | "file"
    | "users"
    | "message"
    | "search";
}) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "inbox":
      return (
        <svg {...common}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "scroll":
      return (
        <svg {...common}>
          <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
  }
}
