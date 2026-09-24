"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addBlackoutDate,
  deleteBlackoutDate,
} from "@/app/lib/goga/actions-availability";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

type Blackout = { id: string; date: string; reason: string | null };

export function BlackoutList({ initial }: { initial: Blackout[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Blackout[]>(initial);
  const [pending, start] = useTransition();

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") ?? "");
    const reason = String(fd.get("reason") ?? "");
    if (!date) return;
    start(async () => {
      try {
        await addBlackoutDate(date, reason);
        toast.show("Blackout date added", "success");
        e.currentTarget.reset();
        router.refresh();
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Save failed", "error");
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      await deleteBlackoutDate(id);
      setItems((cur) => cur.filter((b) => b.id !== id));
      router.refresh();
    });
  }

  const inputCls =
    "rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[13px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Blackout dates
      </h2>
      <form onSubmit={onAdd} className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Date
          </span>
          <input type="date" name="date" required className={inputCls} />
        </label>
        <label className="block flex-1 min-w-[180px]">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Reason (optional)
          </span>
          <input
            type="text"
            name="reason"
            placeholder="Holiday, personal day…"
            className={`${inputCls} w-full`}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-400)]">No blackout dates.</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {items.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="text-[13px] text-[var(--ink-900)]">
                {new Date(b.date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {b.reason ? (
                  <span className="ml-2 text-[12px] text-[var(--ink-500)]">
                    · {b.reason}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDelete(b.id)}
                disabled={pending}
                className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
