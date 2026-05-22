"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

export interface CalendarBooking {
  id: number;
  order_id: number;
  order_number: number | null;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  level: number | null; // status code from legacy p_order.level
  semblance: string | null;
  client_name: string | null;
}

export interface CalendarRow {
  hotel_id: number;
  hotel_name: string;
  bookings: CalendarBooking[];
}

interface Props {
  year: number;
  month: number; // 1-12
  rows: CalendarRow[];
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
}

function monthLabel(y: number, m: number, locale: string): string {
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleString(locale === "ka" ? "ka-GE" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function levelTone(level: number | null): {
  bg: string;
  border: string;
  text: string;
  label: string;
} {
  // Legacy p_order.level conventions: 0=draft, 1=confirmed, 2=paid, 3=cancelled
  switch (level) {
    case 0:
      return {
        bg: "bg-amber-100/70",
        border: "border-amber-300/70",
        text: "text-amber-900",
        label: "Draft",
      };
    case 1:
      return {
        bg: "bg-sky-100/70",
        border: "border-sky-300/70",
        text: "text-sky-900",
        label: "Confirmed",
      };
    case 2:
      return {
        bg: "bg-emerald-100/70",
        border: "border-emerald-300/70",
        text: "text-emerald-900",
        label: "Paid",
      };
    case 3:
      return {
        bg: "bg-rose-100/70",
        border: "border-rose-300/70",
        text: "text-rose-900",
        label: "Cancelled",
      };
    default:
      return {
        bg: "bg-slate-100/70",
        border: "border-slate-300/70",
        text: "text-slate-900",
        label: "—",
      };
  }
}

export function CalendarGrid({ year, month, rows }: Props) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState("");

  const days = daysInMonth(year, month);
  const totalCols = days;

  const prevMonth =
    month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth =
    month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const todayMonth = (() => {
    const n = new Date();
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1 };
  })();

  const visibleRows = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => r.hotel_name.toLowerCase().includes(q));
  }, [rows, filter]);

  function bookingPosition(b: CalendarBooking): {
    startCol: number;
    span: number;
  } | null {
    const ci = new Date(b.check_in);
    const co = new Date(b.check_out);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    if (ci > monthEnd || co < monthStart) return null;

    const visibleStart = ci < monthStart ? monthStart : ci;
    const visibleEnd = co > monthEnd ? monthEnd : co;
    const startCol = visibleStart.getUTCDate();
    const endCol = visibleEnd.getUTCDate();
    return { startCol, span: Math.max(1, endCol - startCol + 1) };
  }

  function isWeekend(d: number): boolean {
    const dow = dayOfWeek(year, month, d);
    return dow === 0 || dow === 6;
  }

  const today = new Date();
  const isCurrentMonth =
    today.getUTCFullYear() === year && today.getUTCMonth() + 1 === month;
  const todayDay = today.getUTCDate();

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder={t("calendar.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:flex-1"
        />
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-[11px] tabular-nums text-[var(--ink-400)] sm:flex-none">
            {visibleRows.length} {t("calendar.hotels_with_bookings")}
          </span>
          <Link
            href={`/app/calendar?month=${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}`}
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-3 py-1.5 text-[12px] text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
          >
            ‹
          </Link>
          <Link
            href={`/app/calendar?month=${todayMonth.y}-${String(todayMonth.m).padStart(2, "0")}`}
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
          >
            {t("calendar.today")}
          </Link>
          <span className="min-w-[140px] text-center text-[13px] font-medium text-[var(--ink-900)]">
            {monthLabel(year, month, locale)}
          </span>
          <Link
            href={`/app/calendar?month=${nextMonth.y}-${String(nextMonth.m).padStart(2, "0")}`}
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-3 py-1.5 text-[12px] text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
          >
            ›
          </Link>
        </div>
      </div>

      {/* Grid */}
      {visibleRows.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--allonce-line)] bg-[var(--bg-surface)] p-12 text-center text-[13px] text-[var(--ink-500)]">
          {t("calendar.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
          <table
            className="w-full min-w-[1100px] border-separate text-[12px]"
            style={{ borderSpacing: 0 }}
          >
            <thead>
              <tr className="bg-[var(--bg-sunken)] text-[10px] uppercase tracking-wider text-[var(--ink-500)]">
                <th
                  className="sticky left-0 z-10 border-r border-[var(--allonce-line)] bg-[var(--bg-sunken)] px-3 py-2 text-left"
                  style={{ width: 220, minWidth: 220 }}
                >
                  {t("calendar.hotel")}
                </th>
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                  <th
                    key={d}
                    className={`border-r border-[var(--allonce-line)] px-1 py-1 text-center font-mono ${
                      isWeekend(d) ? "bg-[var(--bg-sunken)]" : ""
                    } ${
                      isCurrentMonth && d === todayDay
                        ? "bg-[var(--ao-accent)] text-white"
                        : ""
                    }`}
                    style={{ width: 32, minWidth: 32 }}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.hotel_id}>
                  <td
                    className="sticky left-0 z-10 border-b border-r border-[var(--allonce-line)] bg-[var(--bg-surface)] px-3 py-2 align-top"
                    style={{ width: 220, minWidth: 220 }}
                  >
                    <Link
                      href={`/app/hotels/${row.hotel_id}`}
                      className="font-medium text-[var(--ink-900)] hover:underline"
                    >
                      {row.hotel_name}
                    </Link>
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--ink-400)]">
                      {row.bookings.length}{" "}
                      {row.bookings.length === 1
                        ? t("calendar.booking")
                        : t("calendar.bookings")}
                    </div>
                  </td>
                  <td
                    colSpan={totalCols}
                    className="border-b border-[var(--allonce-line)] p-0"
                    style={{ position: "relative", height: 44 }}
                  >
                    {/* Day grid background */}
                    <div
                      className="grid h-full w-full"
                      style={{
                        gridTemplateColumns: `repeat(${totalCols}, minmax(32px, 1fr))`,
                      }}
                    >
                      {Array.from({ length: days }, (_, i) => i + 1).map(
                        (d) => (
                          <div
                            key={d}
                            className={`border-r border-[var(--allonce-line)] ${
                              isWeekend(d) ? "bg-[var(--bg-sunken)]/50" : ""
                            } ${
                              isCurrentMonth && d === todayDay
                                ? "bg-[var(--ao-accent)]/5"
                                : ""
                            }`}
                          />
                        ),
                      )}
                    </div>
                    {/* Booking spans overlay */}
                    {row.bookings.map((b) => {
                      const pos = bookingPosition(b);
                      if (!pos) return null;
                      const tone = levelTone(b.level);
                      const left = `${((pos.startCol - 1) / totalCols) * 100}%`;
                      const width = `${(pos.span / totalCols) * 100}%`;
                      return (
                        <Link
                          key={b.id}
                          href={`/app/orders/${b.order_id}`}
                          className={`absolute top-1 inline-flex items-center overflow-hidden truncate rounded-[var(--radius-xs)] border ${tone.bg} ${tone.border} ${tone.text} px-2 text-[11px] shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-sm)]`}
                          style={{
                            left,
                            width,
                            height: 36,
                            paddingTop: 2,
                          }}
                          title={`${tone.label} · ${b.client_name ?? "no client"} · ${b.check_in} → ${b.check_out}`}
                        >
                          <span className="truncate">
                            {b.client_name ??
                              `#${b.order_number ?? b.order_id}`}
                          </span>
                        </Link>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--ink-500)]">
        <span>{t("calendar.legend")}:</span>
        {[0, 1, 2, 3].map((lvl) => {
          const tone = levelTone(lvl);
          return (
            <span key={lvl} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-3 w-3 rounded-sm border ${tone.bg} ${tone.border}`}
              />
              <span>{t(`calendar.level.${lvl}` as never)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
