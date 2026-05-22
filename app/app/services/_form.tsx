"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createService, updateService } from "@/app/lib/goga/actions-content";

type Initial = {
  id?: string;
  title_en?: string | null;
  title_ka?: string | null;
  description_en?: string | null;
  description_ka?: string | null;
  price?: string | null;
  published?: boolean | null;
};

export function ServiceForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isEdit = !!initial?.id;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateService(initial.id, fd);
          router.refresh();
        } else {
          await createService(fd);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
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
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title (EN)">
          <input
            name="title_en"
            required
            defaultValue={initial?.title_en ?? ""}
            placeholder="Wedding photography"
            className={inputCls}
          />
        </Field>
        <Field label="Title (KA)">
          <input
            name="title_ka"
            defaultValue={initial?.title_ka ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Description (EN)">
          <textarea
            name="description_en"
            defaultValue={initial?.description_en ?? ""}
            rows={5}
            className={inputCls}
          />
        </Field>
        <Field label="Description (KA)">
          <textarea
            name="description_ka"
            defaultValue={initial?.description_ka ?? ""}
            rows={5}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Price">
        <input
          name="price"
          defaultValue={initial?.price ?? ""}
          placeholder="From €2,500"
          className={`${inputCls} max-w-xs`}
        />
      </Field>

      <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? true}
          className="h-4 w-4 rounded border-black/20"
        />
        <span>Published — shown on the public /services page</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create service"}
        </button>
        {err ? <span className="text-[13px] text-rose-700">{err}</span> : null}
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
