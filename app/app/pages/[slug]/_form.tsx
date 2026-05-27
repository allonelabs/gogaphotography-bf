"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertPage } from "@/app/lib/goga/actions-content";
import { useToast } from "@/app/app/_components/Toaster";

type Initial = {
  title_en: string;
  title_ka: string;
  body_en: string;
  body_ka: string;
};

export function PageForm({
  slug,
  initial,
}: {
  slug: string;
  initial: Initial;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await upsertPage(slug, fd);
        setSaved(true);
        toast.show("Page saved", "success");
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setErr(msg);
        toast.show(msg, "error");
      }
    });
  }

  const inputCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";
  const monoCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] font-mono text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title (EN)">
          <input
            name="title_en"
            defaultValue={initial.title_en}
            className={inputCls}
          />
        </Field>
        <Field label="Title (KA)">
          <input
            name="title_ka"
            defaultValue={initial.title_ka}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Body (EN) · markdown">
          <textarea
            name="body_en"
            defaultValue={initial.body_en}
            rows={14}
            className={monoCls}
            style={{ minHeight: 280 }}
          />
        </Field>
        <Field label="Body (KA) · markdown">
          <textarea
            name="body_ka"
            defaultValue={initial.body_ka}
            rows={14}
            className={monoCls}
            style={{ minHeight: 280 }}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved ? (
          <span className="text-[12px] text-slate-900 font-medium">Saved.</span>
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
