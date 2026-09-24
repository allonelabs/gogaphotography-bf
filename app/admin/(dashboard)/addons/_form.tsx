"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAddon, updateAddon } from "@/app/lib/goga/actions-addons";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { rethrowIfRedirect } from "@/app/lib/goga/redirect-error";

type Initial = {
  id?: string;
  slug?: string | null;
  name_en?: string | null;
  name_ka?: string | null;
  name_ru?: string | null;
  description_en?: string | null;
  description_ka?: string | null;
  description_ru?: string | null;
  price_cents?: number | null;
  sort_order?: number | null;
  published?: boolean | null;
};

const fromCents = (c: number | null | undefined) =>
  c == null ? "" : (c / 100).toFixed(2);

export function AddonForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const toast = useToast();
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
          await updateAddon(initial.id, fd);
          toast.show("Add-on saved", "success");
          router.refresh();
        } else {
          await createAddon(fd);
          toast.show("Add-on created", "success");
        }
      } catch (e) {
        rethrowIfRedirect(e);
        const msg = e instanceof Error ? e.message : "Save failed";
        setErr(msg);
        toast.show(msg, "error");
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
        <Field label="Name (EN)">
          <input
            name="name_en"
            required
            defaultValue={initial?.name_en ?? ""}
            placeholder="Second photographer"
            className={inputCls}
          />
        </Field>
        <Field label="Name (KA)">
          <input
            name="name_ka"
            defaultValue={initial?.name_ka ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Name (RU)">
          <input
            name="name_ru"
            defaultValue={initial?.name_ru ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Slug (URL — leave blank to auto-generate)">
        <input
          name="slug"
          defaultValue={initial?.slug ?? ""}
          placeholder="second-photographer"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Description (EN)">
          <textarea
            name="description_en"
            defaultValue={initial?.description_en ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label="Description (KA)">
          <textarea
            name="description_ka"
            defaultValue={initial?.description_ka ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label="Description (RU)">
          <textarea
            name="description_ru"
            defaultValue={initial?.description_ru ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Price">
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fromCents(initial?.price_cents)}
            placeholder="150.00"
            className={inputCls}
          />
        </Field>
        <Field label="Sort order">
          <input
            name="sort_order"
            type="number"
            step="1"
            defaultValue={initial?.sort_order ?? 0}
            className={inputCls}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? true}
          className="h-4 w-4 rounded border-black/20"
        />
        <span>Published — selectable in the /book calculator</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create add-on"}
        </button>
        {err ? <span className="text-[13px] text-slate-700">{err}</span> : null}
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
