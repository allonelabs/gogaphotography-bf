"use client";

import { useState } from "react";
import type { OrderDetail, LineItem } from "./_detail-view";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

type FieldDef = { name: string; labelKey: TranslationKey; type: string };

const FIELDS: FieldDef[] = [
  { name: "first_name", labelKey: "fields.first_name", type: "text" },
  { name: "last_name", labelKey: "fields.last_name", type: "text" },
  {
    name: "first_name_en",
    labelKey: "tourists.field.first_name_en",
    type: "text",
  },
  {
    name: "last_name_en",
    labelKey: "tourists.field.last_name_en",
    type: "text",
  },
  { name: "pasport_number", labelKey: "fields.passport_number", type: "text" },
  { name: "self_number", labelKey: "fields.personal_short", type: "text" },
  { name: "birthday", labelKey: "fields.birthday", type: "date" },
  { name: "mobile", labelKey: "fields.mobile", type: "text" },
  { name: "mail", labelKey: "fields.email", type: "text" },
  { name: "cc1_country", labelKey: "fields.country", type: "text" },
  { name: "cc1_city", labelKey: "fields.city", type: "text" },
];

export function TouristsPanel({
  order,
  kind,
}: {
  order: OrderDetail;
  kind: "order" | "refund";
}) {
  const { t } = useLocale();
  const [rows, setRows] = useState<LineItem[]>(order.tourists);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setSaving(true);
    setError(null);
    const path = kind === "order" ? "orders" : "refunds";
    const res = await fetch(`/api/${path}/${order.id}/tourists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) {
      setRows((r) => [...r, j.data]);
      setForm({});
      setOpen(false);
    } else {
      setError(j.error?.message ?? t("common.failed"));
    }
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between border-b border-[var(--allonce-line)] px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--ink-900)]">
            {t("tourists.title")}
          </h3>
          <span className="font-mono text-[11px] text-[var(--ink-400)]">
            {rows.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-2 py-0.5 text-[11px] text-[var(--ink-700)]"
        >
          {open ? t("common.cancel") : t("tourists.add")}
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead className="bg-[var(--bg-sunken)] text-[10px] uppercase tracking-wider text-[var(--ink-500)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("tourists.col.name")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("tourists.col.passport")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("tourists.col.birthday")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("tourists.col.mobile")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("tourists.col.mail")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !open && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-[var(--ink-400)]"
                >
                  {t("tourists.empty")}
                </td>
              </tr>
            )}
            {rows.map((tr) => (
              <tr
                key={tr.id}
                className="border-t border-[var(--allonce-line)] text-[var(--ink-700)]"
              >
                <td className="px-3 py-2">
                  {[tr.first_name, tr.last_name].filter(Boolean).join(" ") ||
                    "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {tr.pasport_number ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {tr.birthday ?? "—"}
                </td>
                <td className="px-3 py-2">{tr.mobile ?? "—"}</td>
                <td className="px-3 py-2">{tr.mail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="border-t border-[var(--allonce-line)] bg-[var(--bg-sunken)] px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <label
                key={f.name}
                className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]"
              >
                <span>{t(f.labelKey)}</span>
                <input
                  type={f.type}
                  value={form[f.name] == null ? "" : String(form[f.name])}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      [f.name]: e.target.value === "" ? null : e.target.value,
                    }))
                  }
                  className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={add}
              className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
            >
              {saving ? t("common.adding") : t("tourists.add")}
            </button>
            {error && (
              <span className="text-[12px] text-[var(--error,#dc2626)]">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
