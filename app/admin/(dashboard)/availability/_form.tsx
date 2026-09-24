"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveAvailabilityRules,
  type WeekdayRule,
} from "@/app/lib/goga/actions-availability";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

type Row = {
  weekday: number;
  label: string;
  closed: boolean;
  start_time: string;
  end_time: string;
};

export function AvailabilityForm({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, start] = useTransition();

  function update(weekday: number, patch: Partial<Row>) {
    setRows((cur) =>
      cur.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    );
  }

  function onSave() {
    const payload: WeekdayRule[] = rows.map((r) => ({
      weekday: r.weekday,
      closed: r.closed,
      start_time: r.closed ? null : `${r.start_time}:00`,
      end_time: r.closed ? null : `${r.end_time}:00`,
    }));
    start(async () => {
      try {
        await saveAvailabilityRules(payload);
        toast.show("Weekly hours saved", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Save failed", "error");
      }
    });
  }

  const inputCls =
    "rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[13px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Weekly hours
      </h2>
      <ul className="divide-y divide-black/5">
        {rows.map((r) => (
          <li
            key={r.weekday}
            className="flex flex-wrap items-center gap-3 py-2.5"
          >
            <span className="w-28 shrink-0 text-[13px] text-[var(--ink-900)]">
              {r.label}
            </span>
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--ink-700)]">
              <input
                type="checkbox"
                checked={r.closed}
                onChange={(e) =>
                  update(r.weekday, { closed: e.target.checked })
                }
                className="h-4 w-4 rounded border-black/20"
              />
              Closed
            </label>
            {!r.closed ? (
              <>
                <input
                  type="time"
                  value={r.start_time}
                  onChange={(e) =>
                    update(r.weekday, { start_time: e.target.value })
                  }
                  className={inputCls}
                />
                <span className="text-[12px] text-[var(--ink-400)]">to</span>
                <input
                  type="time"
                  value={r.end_time}
                  onChange={(e) =>
                    update(r.weekday, { end_time: e.target.value })
                  }
                  className={inputCls}
                />
              </>
            ) : (
              <span className="text-[12px] text-[var(--ink-400)]">
                Not bookable this day
              </span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="mt-4 rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save weekly hours"}
      </button>
    </section>
  );
}
