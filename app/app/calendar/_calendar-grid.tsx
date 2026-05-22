"use client";

import Link from "next/link";
import { useMemo } from "react";

export type CalendarItem = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
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
function monthParam(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}
function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function CalendarGrid({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: CalendarItem[];
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const list = m.get(it.date) ?? [];
      list.push(it);
      m.set(it.date, list);
    }
    return m;
  }, [items]);

  // 6-row × 7-col Mon-first grid.
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startDow = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: string | null; inMonth: boolean; day: number }> =
    [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: null, inMonth: false, day: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${pad(month)}-${pad(d)}`,
      inMonth: true,
      day: d,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false, day: 0 });
  }

  const today = new Date();
  const todayKey = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:p-5">
      <div className="mb-3 flex items-center justify-end gap-2">
        <Link
          href={`/app/calendar?month=${monthParam(prev.year, prev.month)}`}
          className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
        >
          ← prev
        </Link>
        <Link
          href="/app/calendar"
          className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
        >
          today
        </Link>
        <Link
          href={`/app/calendar?month=${monthParam(next.year, next.month)}`}
          className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
        >
          next →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-black/[0.06] text-[12px]">
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
              <div
                className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] ${
                  isToday
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-[var(--ink-700)]"
                }`}
              >
                {c.day || ""}
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
