"use client";

import Link from "next/link";
import { useMemo } from "react";

export type CalendarView = "month" | "week" | "day";

export type CalendarItem = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM[:SS] or null (all-day)
  title: string;
  packageName: string | null;
  location: string | null;
  status: string;
};

const STATUS_TONE: Record<string, string> = {
  inquiry: "bg-slate-100 text-slate-700",
  reserved: "bg-sky-100 text-sky-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-stone-100 text-stone-700",
  cancelled: "bg-rose-100 text-rose-700",
  no_show: "bg-amber-100 text-amber-800",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}
function startOfWeekUTC(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow),
  );
}

export function CalendarGrid({
  view,
  anchor,
  items,
}: {
  view: CalendarView;
  /** Anchor date as ISO string — Date isn't serializable across the boundary. */
  anchor: string;
  items: CalendarItem[];
}) {
  const anchorDate = useMemo(() => new Date(anchor), [anchor]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const list = m.get(it.date) ?? [];
      list.push(it);
      m.set(it.date, list);
    }
    return m;
  }, [items]);

  const todayKey = ymd(new Date());

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:p-5">
      <Toolbar view={view} anchor={anchorDate} />
      {view === "month" ? (
        <MonthGrid anchor={anchorDate} byDate={byDate} todayKey={todayKey} />
      ) : view === "week" ? (
        <WeekGrid anchor={anchorDate} byDate={byDate} todayKey={todayKey} />
      ) : (
        <DayGrid anchor={anchorDate} items={items} todayKey={todayKey} />
      )}
    </div>
  );
}

function Toolbar({ view, anchor }: { view: CalendarView; anchor: Date }) {
  const prev = shift(view, anchor, -1);
  const next = shift(view, anchor, 1);
  const linkCls =
    "rounded-full border border-black/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50";
  const todayLink =
    view === "month"
      ? "/app/calendar"
      : `/app/calendar?view=${view}&date=${ymd(new Date())}`;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <ViewToggle view={view} anchor={anchor} />
      <div className="flex items-center gap-2">
        <Link href={hrefFor(view, prev)} className={linkCls}>
          ← Prev
        </Link>
        <Link href={todayLink} className={linkCls}>
          Today
        </Link>
        <Link href={hrefFor(view, next)} className={linkCls}>
          Next →
        </Link>
      </div>
    </div>
  );
}

function ViewToggle({ view, anchor }: { view: CalendarView; anchor: Date }) {
  const opts: CalendarView[] = ["month", "week", "day"];
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5">
      {opts.map((v) => {
        const active = v === view;
        return (
          <Link
            key={v}
            href={hrefFor(v, anchor)}
            className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
              active
                ? "bg-[var(--ink-900)] text-white"
                : "text-[var(--ink-700)] hover:text-[var(--ink-900)]"
            }`}
          >
            {v[0]!.toUpperCase() + v.slice(1)}
          </Link>
        );
      })}
    </div>
  );
}

function hrefFor(view: CalendarView, d: Date): string {
  if (view === "month") {
    // Keep legacy ?month= shape for compat
    return `/app/calendar?month=${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  }
  return `/app/calendar?view=${view}&date=${ymd(d)}`;
}

function shift(view: CalendarView, anchor: Date, delta: number): Date {
  if (view === "day") {
    return new Date(anchor.getTime() + delta * 86400000);
  }
  if (view === "week") {
    return new Date(anchor.getTime() + delta * 7 * 86400000);
  }
  return new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta, 1),
  );
}

// ── Month ──────────────────────────────────────────────────────────────

function MonthGrid({
  anchor,
  byDate,
  todayKey,
}: {
  anchor: Date;
  byDate: Map<string, CalendarItem[]>;
  todayKey: string;
}) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth(); // 0-based
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startDow = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Array<{ date: string | null; inMonth: boolean; day: number }> =
    [];
  for (let i = 0; i < startDow; i++)
    cells.push({ date: null, inMonth: false, day: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${pad(month + 1)}-${pad(d)}`,
      inMonth: true,
      day: d,
    });
  }
  while (cells.length % 7 !== 0)
    cells.push({ date: null, inMonth: false, day: 0 });

  return (
    <div className="-mx-1 overflow-x-auto sm:mx-0">
      <div className="grid min-w-[600px] grid-cols-7 gap-px overflow-hidden rounded-xl bg-black/[0.06] text-[12px] sm:min-w-0">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="bg-slate-50 px-2 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]"
          >
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const dayItems = c.date ? (byDate.get(c.date) ?? []) : [];
          const isToday = c.date === todayKey;
          return (
            <div
              key={i}
              className={`min-h-[112px] bg-white p-1.5 ${c.inMonth ? "" : "opacity-40"}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <div
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] ${
                    isToday
                      ? "bg-[var(--ink-900)] text-white"
                      : "text-[var(--ink-700)]"
                  }`}
                >
                  {c.day || ""}
                </div>
                {c.date && dayItems.length > 0 ? (
                  <Link
                    href={`/app/calendar?view=day&date=${c.date}`}
                    className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-400)] hover:text-[var(--ink-900)]"
                  >
                    day →
                  </Link>
                ) : null}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 4).map((it) => (
                  <Link
                    key={it.id}
                    href={`/app/bookings/${it.id}`}
                    className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${
                      STATUS_TONE[it.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                    title={`${it.title}${it.time ? ` · ${it.time}` : ""}${it.location ? ` · ${it.location}` : ""}`}
                  >
                    {it.time ? <span className="mr-1">{it.time}</span> : null}
                    {it.title}
                  </Link>
                ))}
                {dayItems.length > 4 ? (
                  <span className="block px-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-500)]">
                    +{dayItems.length - 4} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week ───────────────────────────────────────────────────────────────

function WeekGrid({
  anchor,
  byDate,
  todayKey,
}: {
  anchor: Date;
  byDate: Map<string, CalendarItem[]>;
  todayKey: string;
}) {
  const weekStart = startOfWeekUTC(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000);
    return { date: ymd(d), label: d, dow: d.getUTCDay() };
  });
  return (
    <div className="-mx-1 overflow-x-auto sm:mx-0">
      <div className="grid min-w-[840px] grid-cols-7 gap-px overflow-hidden rounded-xl bg-black/[0.06] sm:min-w-0">
        {days.map((d) => {
          const items = byDate.get(d.date) ?? [];
          const isToday = d.date === todayKey;
          const dayNum = d.label.getUTCDate();
          const dowLabel = d.label.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "UTC",
          });
          return (
            <div key={d.date} className="min-h-[360px] bg-white">
              <Link
                href={`/app/calendar?view=day&date=${d.date}`}
                className="block border-b border-black/5 bg-slate-50 px-2 py-2 text-center transition hover:bg-slate-100"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                  {dowLabel}
                </div>
                <div
                  className={`mx-auto mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] tabular-nums ${
                    isToday
                      ? "bg-[var(--ink-900)] text-white"
                      : "text-[var(--ink-900)]"
                  }`}
                >
                  {dayNum}
                </div>
              </Link>
              <div className="space-y-1 p-1.5">
                {items.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-[var(--ink-300)]">
                    —
                  </p>
                ) : (
                  items.map((it) => (
                    <Link
                      key={it.id}
                      href={`/app/bookings/${it.id}`}
                      className={`block rounded-md px-2 py-1.5 text-[11px] leading-tight ${
                        STATUS_TONE[it.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {it.time ? (
                        <div className="font-mono text-[10px] tabular-nums opacity-80">
                          {it.time}
                        </div>
                      ) : null}
                      <div className="truncate font-medium">{it.title}</div>
                      {it.location ? (
                        <div className="truncate text-[10px] opacity-75">
                          {it.location}
                        </div>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day ────────────────────────────────────────────────────────────────

function DayGrid({
  anchor,
  items,
  todayKey,
}: {
  anchor: Date;
  items: CalendarItem[];
  todayKey: string;
}) {
  const key = ymd(anchor);
  const isToday = key === todayKey;
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aT = a.time ?? "";
        const bT = b.time ?? "";
        return aT.localeCompare(bT);
      }),
    [items],
  );

  // Hour slots 8:00 → 22:00 (typical shoot day)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  function bucketFor(time: string | null): number {
    if (!time) return -1;
    const m = /^(\d{1,2}):(\d{2})/.exec(time);
    if (!m) return -1;
    const h = Number(m[1]);
    return h;
  }

  const allDay = sorted.filter((it) => bucketFor(it.time) === -1);
  const byHour = new Map<number, CalendarItem[]>();
  for (const h of hours) byHour.set(h, []);
  let early: CalendarItem[] = [];
  let late: CalendarItem[] = [];
  for (const it of sorted) {
    const b = bucketFor(it.time);
    if (b === -1) continue;
    if (b < 8) early.push(it);
    else if (b > 22) late.push(it);
    else byHour.get(b)!.push(it);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
      <div
        className={`flex items-center gap-3 border-b border-black/5 px-4 py-3 ${
          isToday ? "bg-slate-50" : ""
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
          {isToday
            ? "Today"
            : anchor.toLocaleDateString("en-US", {
                weekday: "long",
                timeZone: "UTC",
              })}
        </div>
        <div className="text-[12px] text-[var(--ink-500)] tabular-nums">
          {items.length} shoot{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {allDay.length > 0 || early.length > 0 ? (
        <div className="border-b border-black/5 px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
            All day / before 08:00
          </div>
          <ItemRow items={[...allDay, ...early]} />
        </div>
      ) : null}

      <ol className="divide-y divide-black/5">
        {hours.map((h) => (
          <li
            key={h}
            className="grid grid-cols-[64px_1fr] items-start gap-3 px-3 py-2"
          >
            <span className="pt-1 font-mono text-[11px] tabular-nums text-[var(--ink-400)]">
              {pad(h)}:00
            </span>
            <ItemRow items={byHour.get(h) ?? []} />
          </li>
        ))}
      </ol>

      {late.length > 0 ? (
        <div className="border-t border-black/5 px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
            After 22:00
          </div>
          <ItemRow items={late} />
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-[var(--ink-400)]">
          No shoots scheduled.
        </p>
      ) : null}
    </div>
  );
}

function ItemRow({ items }: { items: CalendarItem[] }) {
  if (items.length === 0) {
    return <span className="text-[12px] text-[var(--ink-300)]">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Link
          key={it.id}
          href={`/app/bookings/${it.id}`}
          className={`inline-flex max-w-full items-center gap-2 truncate rounded-lg px-2.5 py-1 text-[12px] leading-tight ${
            STATUS_TONE[it.status] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {it.time ? (
            <span className="font-mono text-[10px] tabular-nums opacity-80">
              {it.time}
            </span>
          ) : null}
          <span className="truncate font-medium">{it.title}</span>
          {it.location ? (
            <span className="truncate text-[10px] opacity-75">
              · {it.location}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
