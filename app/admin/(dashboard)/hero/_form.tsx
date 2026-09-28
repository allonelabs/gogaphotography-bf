"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateHero } from "@/app/lib/goga/actions-content";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Initial = {
  headline_en: string | null;
  headline_ka: string | null;

  headline_ru?: string | null;
  subtitle_en: string | null;
  subtitle_ka: string | null;

  subtitle_ru?: string | null;
};

export function HeroForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSavedAt(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await updateHero(fd);
        setSavedAt(Date.now());
        router.refresh();
      } catch (e) {
        setErr(
          e instanceof Error
            ? e.message
            : tr("save_failed", "შენახვა ვერ მოხერხდა"),
        );
      }
    });
  }

  const inputCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={`${tr("Headline", "სათაური")} (EN)`}>
          <input
            name="headline_en"
            defaultValue={initial?.headline_en ?? ""}
            placeholder="GOGA Photography"
            className={inputCls}
          />
        </Field>
        <Field label={`${tr("Headline", "სათაური")} (KA)`}>
          <input
            name="headline_ka"
            defaultValue={initial?.headline_ka ?? ""}
            placeholder="GOGA Photography"
            className={inputCls}
          />
        </Field>
        <Field label={`${tr("Headline", "სათაური")} (RU)`}>
          <input
            name="headline_ru"
            defaultValue={initial?.headline_ka ?? ""}
            placeholder="GOGA Photography"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={`${tr("Subtitle", "ქვესათაური")} (EN)`}>
          <textarea
            name="subtitle_en"
            defaultValue={initial?.subtitle_en ?? ""}
            rows={3}
            className={inputCls}
            placeholder="Wedding · Editorial · Events — Tbilisi, Georgia & worldwide"
          />
        </Field>
        <Field label={`${tr("Subtitle", "ქვესათაური")} (KA)`}>
          <textarea
            name="subtitle_ka"
            defaultValue={initial?.subtitle_ka ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label={`${tr("Subtitle", "ქვესათაური")} (RU)`}>
          <textarea
            name="subtitle_ru"
            defaultValue={initial?.subtitle_ka ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending ? tr("Saving…", "ინახება…") : tr("Save", "შენახვა")}
        </button>
        {savedAt ? (
          <span className="text-[12px] text-slate-900 font-medium">
            {tr("Saved.", "შენახულია.")}
          </span>
        ) : null}
        {err ? <span className="text-[12px] text-slate-700">{err}</span> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}
