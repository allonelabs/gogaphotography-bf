// app/app/store/product-form.tsx
"use client";
import type { StoreProductRow } from "@/app/lib/db/store-types";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function ProductForm({
  action,
  product,
}: {
  action: (fd: FormData) => void;
  product?: StoreProductRow;
}) {
  const { tr } = useLocale();
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]";
  const label = "block text-[13px] text-[var(--ink-700)]";
  return (
    <form action={action} className="max-w-xl space-y-4">
      <label className={label}>
        {tr("Type", "ტიპი")}
        <select
          name="type"
          defaultValue={product?.type ?? "preset"}
          className={field}
        >
          <option value="preset">{tr("Preset", "პრესეტი")}</option>
          <option value="album">{tr("Album", "ალბომი")}</option>
        </select>
      </label>
      <label className={label}>
        {tr("Title", "სათაური")}
        <input
          name="title"
          defaultValue={product?.title ?? ""}
          required
          className={field}
        />
      </label>
      {!product && (
        <label className={label}>
          {tr("Slug (optional)", "სლაგი (არასავალდებულო)")}
          <input name="slug" className={field} />
        </label>
      )}
      <label className={label}>
        {tr("Description", "აღწერა")}
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={4}
          className={field}
        />
      </label>
      <label className={label}>
        {tr("Price (GEL)", "ფასი (GEL)")}
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
          required
          className={field}
        />
      </label>
      <label className={label}>
        {tr("License terms", "ლიცენზიის პირობები")}
        <textarea
          name="license_terms"
          defaultValue={product?.license_terms ?? ""}
          rows={2}
          className={field}
        />
      </label>
      <label className={label}>
        {tr("Cover image", "ყდის სურათი")}{" "}
        {product?.cover_image_path && (
          <span className="text-xs text-neutral-400">
            {tr("(current kept if empty)", "(თუ ცარიელია, ძველი შენარჩუნდება)")}
          </span>
        )}
        <input
          name="cover"
          type="file"
          accept="image/*"
          className="mt-1 block"
        />
      </label>
      <label className={label}>
        {tr("Deliverable file", "მისაწოდებელი ფაილი")}{" "}
        {product?.file_path && (
          <span className="text-xs text-neutral-400">
            {tr("(current kept if empty)", "(თუ ცარიელია, ძველი შენარჩუნდება)")}
          </span>
        )}
        <input name="file" type="file" className="mt-1 block" />
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input
          name="published"
          type="checkbox"
          defaultChecked={product?.published ?? false}
        />{" "}
        {tr("Published", "გამოქვეყნებული")}
      </label>
      <button className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]">
        {product ? tr("Save", "შენახვა") : tr("Create", "შექმნა")}
      </button>
    </form>
  );
}
