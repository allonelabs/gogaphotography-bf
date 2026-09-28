"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProject, updateProject } from "@/app/lib/goga/actions-projects";
import { rethrowIfRedirect } from "@/app/lib/goga/redirect-error";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Initial = {
  id?: string;
  slug?: string | null;
  title_en?: string | null;
  title_ka?: string | null;

  title_ru?: string | null;
  location_en?: string | null;
  location_ka?: string | null;

  location_ru?: string | null;
  description_en?: string | null;
  description_ka?: string | null;

  description_ru?: string | null;
  published?: boolean | null;
};

type AlbumOption = {
  id: string;
  slug: string;
  name_en: string;
  name_ka: string;

  name_ru?: string | null;
};

export function ProjectForm({
  initial,
  albums = [],
  selectedAlbumIds = [],
}: {
  initial?: Initial;
  albums?: AlbumOption[];
  selectedAlbumIds?: string[];
}) {
  const router = useRouter();
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
          await updateProject(initial.id, fd);
          router.refresh();
        } else {
          await createProject(fd);
        }
      } catch (e) {
        rethrowIfRedirect(e);
        setErr(
          e instanceof Error
            ? e.message
            : tr("Save failed", "შენახვა ვერ მოხერხდა"),
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
        <Field label={tr("Title (EN)", "სათაური (ინგლ.)")}>
          <input
            name="title_en"
            required
            defaultValue={initial?.title_en ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Title (KA)", "სათაური (ქართ.)")}>
          <input
            name="title_ka"
            defaultValue={initial?.title_ka ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Title (RU)", "სათაური (რუს.)")}>
          <input
            name="title_ru"
            defaultValue={initial?.title_ka ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={tr("Location (EN)", "მდებარეობა (ინგლ.)")}>
          <input
            name="location_en"
            defaultValue={initial?.location_en ?? ""}
            placeholder="Amalfi Coast"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Location (KA)", "მდებარეობა (ქართ.)")}>
          <input
            name="location_ka"
            defaultValue={initial?.location_ka ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Location (RU)", "მდებარეობა (რუს.)")}>
          <input
            name="location_ru"
            defaultValue={initial?.location_ka ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label={tr(
          "Slug — leave blank to auto-generate",
          "სლაგი — ცარიელი დატოვეთ ავტომატური გენერაციისთვის",
        )}
      >
        <input
          name="slug"
          defaultValue={initial?.slug ?? ""}
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={tr("Description (EN)", "აღწერა (ინგლ.)")}>
          <textarea
            name="description_en"
            defaultValue={initial?.description_en ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Description (KA)", "აღწერა (ქართ.)")}>
          <textarea
            name="description_ka"
            defaultValue={initial?.description_ka ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Description (RU)", "აღწერა (რუს.)")}>
          <textarea
            name="description_ru"
            defaultValue={initial?.description_ka ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>
      </div>

      {albums.length > 0 ? (
        <fieldset className="rounded-lg border border-black/10 p-3">
          <legend className="text-[13px] text-[var(--ink-700)]">
            {tr("Albums", "ალბომები")}
          </legend>
          <div className="flex flex-wrap gap-3">
            {albums.map((a) => (
              <label key={a.id} className="flex items-center gap-1 text-[13px]">
                <input
                  type="checkbox"
                  name="album_ids"
                  value={a.id}
                  defaultChecked={selectedAlbumIds.includes(a.id)}
                  className="h-4 w-4 rounded border-black/20"
                />
                {a.name_en || a.name_ka || a.slug}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? false}
          className="h-4 w-4 rounded border-black/20"
        />
        <span>
          {tr(
            "Published — visible on the public site",
            "გამოქვეყნებული — ჩანს საჯარო საიტზე",
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
              : tr("Create project", "პროექტის შექმნა")}
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
