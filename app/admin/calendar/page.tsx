import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  CalendarGrid,
  type CalendarItem,
  type CalendarView,
} from "./_calendar-grid";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ view?: string; date?: string; month?: string }>;
}

function parseView(s: string | undefined): CalendarView {
  if (s === "week" || s === "day") return s;
  return "month";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

function parseAnchor(
  view: CalendarView,
  dateRaw: string | undefined,
  monthRaw: string | undefined,
): Date {
  // Back-compat: month=YYYY-MM still works for the month view.
  if (view === "month" && monthRaw && /^\d{4}-\d{2}$/.test(monthRaw)) {
    const [y, m] = monthRaw.split("-").map(Number);
    return new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  }
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [y, m, d] = dateRaw.split("-").map(Number);
    return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  }
  return new Date();
}

/**
 * Mon-first start-of-week. Returns the Monday on/before `d` (UTC).
 */
function startOfWeek(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow),
  );
}

function rangeForView(
  view: CalendarView,
  anchor: Date,
): { start: string; endExclusive: string } {
  if (view === "day") {
    const start = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth(),
        anchor.getUTCDate(),
      ),
    );
    const end = new Date(start.getTime() + 86400000);
    return { start: ymd(start), endExclusive: ymd(end) };
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start.getTime() + 7 * 86400000);
    return { start: ymd(start), endExclusive: ymd(end) };
  }
  // month
  const start = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1),
  );
  return { start: ymd(start), endExclusive: ymd(end) };
}

async function loadShoots(
  start: string,
  endExclusive: string,
): Promise<CalendarItem[]> {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("bookings")
    .select(
      `id, client_name, client_email, shoot_date, shoot_time, location,
       status, packages(name_en)`,
    )
    .gte("shoot_date", start)
    .lt("shoot_date", endExclusive)
    .order("shoot_date", { ascending: true })
    .order("shoot_time", { ascending: true, nullsFirst: true })
    .limit(500);

  return (data ?? []).map((b) => ({
    id: b.id,
    date: b.shoot_date,
    time: b.shoot_time,
    title: b.client_name ?? b.client_email ?? "(no client)",
    packageName: b.packages?.name_en ?? null,
    location: b.location,
    status: b.status,
  }));
}

function titleFor(view: CalendarView, anchor: Date): string {
  if (view === "day") {
    return anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start.getTime() + 6 * 86400000);
    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
      d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
    return sameMonth
      ? `${fmt(start, { month: "long", day: "numeric" })} – ${fmt(end, { day: "numeric", year: "numeric" })}`
      : `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const anchor = parseAnchor(view, sp.date, sp.month);
  const { start, endExclusive } = rangeForView(view, anchor);
  const items = await loadShoots(start, endExclusive);
  const title = titleFor(view, anchor);

  return (
    <AppShell
      breadcrumb={[{ label: "Calendar" }]}
      chatScope={{ level: "tool", tool: "calendar" }}
      chatScopeLabel="Calendar"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {items.length} shoot{items.length === 1 ? "" : "s"}
            </p>
          </div>
        </header>
        <CalendarGrid view={view} anchor={anchor.toISOString()} items={items} />
      </div>
    </AppShell>
  );
}
