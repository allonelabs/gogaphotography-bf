"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPackage, updatePackage } from "@/app/lib/goga/actions-packages";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { rethrowIfRedirect } from "@/app/lib/goga/redirect-error";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Initial = {
  id?: string;
  slug?: string | null;
  name_en?: string | null;
  name_ka?: string | null;

  name_ru?: string | null;
  short_desc_en?: string | null;
  short_desc_ka?: string | null;

  short_desc_ru?: string | null;
  deliverables_en?: string | null;
  deliverables_ka?: string | null;

  deliverables_ru?: string | null;
  base_price_cents?: number | null;
  currency?: string | null;
  duration_hours?: number | null;
  deposit_pct?: number | null;
  extra_hour_cents?: number | null;
  max_extra_hours?: number | null;
  published?: boolean | null;
};

const fromCents = (c: number | null | undefined) =>
  c == null ? "" : (c / 100).toFixed(2);

export function PackageForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const { tr } = useLocale();
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
          await updatePackage(initial.id, fd);
          toast.show(tr("Package saved", "პაკეტი შენახულია"), "success");
          router.refresh();
        } else {
          await createPackage(fd);
          toast.show(tr("Package created", "პაკეტი შექმნილია"), "success");
        }
      } catch (e) {
        rethrowIfRedirect(e);
        const msg =
          e instanceof Error
            ? e.message
            : tr("Save failed", "შენახვა ვერ მოხერხდა");
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
        <Field label={tr("Name (EN)", "სახელი (EN)")}>
          <input
            name="name_en"
            required
            defaultValue={initial?.name_en ?? ""}
            placeholder="Full-day wedding"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Name (KA)", "სახელი (KA)")}>
          <input
            name="name_ka"
            defaultValue={initial?.name_ka ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Name (RU)", "სახელი (RU)")}>
          <input
            name="name_ru"
            defaultValue={initial?.name_ru ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label={tr(
          "Slug (URL — leave blank to auto-generate)",
          "სლაგი (URL — ცარიელი დატოვეთ ავტომატური გენერაციისთვის)",
        )}
      >
        <input
          name="slug"
          defaultValue={initial?.slug ?? ""}
          placeholder="full-day-wedding"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={tr("Short description (EN)", "მოკლე აღწერა (EN)")}>
          <textarea
            name="short_desc_en"
            defaultValue={initial?.short_desc_en ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Short description (KA)", "მოკლე აღწერა (KA)")}>
          <textarea
            name="short_desc_ka"
            defaultValue={initial?.short_desc_ka ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Short description (RU)", "მოკლე აღწერა (RU)")}>
          <textarea
            name="short_desc_ru"
            defaultValue={initial?.short_desc_ru ?? ""}
            rows={3}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label={tr(
            "Deliverables (EN) — one per line",
            "მიწოდებული მასალა (EN) — თითო სტრიქონზე ერთი",
          )}
        >
          <textarea
            name="deliverables_en"
            defaultValue={initial?.deliverables_en ?? ""}
            rows={4}
            placeholder={
              "All edited RAW files\n2 photographers\nOnline gallery"
            }
            className={inputCls}
          />
        </Field>
        <Field label={tr("Deliverables (KA)", "მიწოდებული მასალა (KA)")}>
          <textarea
            name="deliverables_ka"
            defaultValue={initial?.deliverables_ka ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Deliverables (RU)", "მიწოდებული მასალა (RU)")}>
          <textarea
            name="deliverables_ru"
            defaultValue={initial?.deliverables_ru ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label={tr("Base price", "საბაზისო ფასი")}>
          <input
            name="base_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fromCents(initial?.base_price_cents)}
            placeholder="2500.00"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Currency", "ვალუტა")}>
          <input
            name="currency"
            type="text"
            maxLength={3}
            defaultValue={initial?.currency ?? "EUR"}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Duration (hours)", "ხანგრძლივობა (საათი)")}>
          <input
            name="duration_hours"
            type="number"
            step="0.5"
            min="0"
            defaultValue={initial?.duration_hours ?? ""}
            placeholder="10"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Deposit %", "ავანსი %")}>
          <input
            name="deposit_pct"
            type="number"
            min="0"
            max="100"
            defaultValue={initial?.deposit_pct ?? 30}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={tr(
            "Extra hour price — 0 = extra hours not offered",
            "დამატებითი საათის ფასი — 0 = დამატებითი საათი არ არის შემოთავაზებული",
          )}
        >
          <input
            name="extra_hour_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fromCents(initial?.extra_hour_cents)}
            placeholder="150.00"
            className={inputCls}
          />
        </Field>
        <Field
          label={tr(
            "Max extra hours the calculator allows",
            "მაქსიმალური დამატებითი საათები კალკულატორში",
          )}
        >
          <input
            name="max_extra_hours"
            type="number"
            step="1"
            min="0"
            defaultValue={initial?.max_extra_hours ?? 0}
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
        <span>
          {tr(
            "Published — selectable in /book and shown on /services",
            "გამოქვეყნებული — ხელმისაწვდომია /book-ზე და ჩანს /services-ზე",
          )}
        </span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending
            ? tr("Saving…", "ინახება…")
            : isEdit
              ? tr("Save changes", "ცვლილებების შენახვა")
              : tr("Create package", "პაკეტის შექმნა")}
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
