"use client";

import { useState } from "react";
import { CascadingCombobox } from "@/app/components/app/CascadingCombobox";
import { FormSection, FormField } from "@/app/components/app/FormSection";
import { useLocale } from "@/app/lib/i18n/useLocale";

export interface CompanyVerticalFormConfig {
  /** API base path — e.g. `/api/avia` or `/api/insurance`. */
  apiPath: string;
  /** Group catalog endpoint — e.g. `/api/catalogs/avia-groups`. */
  groupEndpoint: string;
  /** Group label — e.g. `Avia group`. */
  groupLabel: string;
  /** FK column name on the row — e.g. `c_avia_group_id`. */
  groupColumn: string;
  /** Whether this vertical has a `code` text column (consul doesn't). */
  hasCode?: boolean;
  /**
   * Override the code field label per-vertical. e.g. avia uses "IATA",
   * insurance uses "Policy code".
   */
  codeLabel?: string;
  /**
   * Whether this vertical also carries text_en / text_ge long descriptions
   * (transfer does). When true, an extra "Descriptions" section renders.
   */
  hasDescriptions?: boolean;
}

type Row = {
  id: number;
  type: number | null;
  name: string;
  full_name: string | null;
  identification: string | null;
  comment: string | null;
  code?: string | null;
  text_en?: string | null;
  text_ge?: string | null;
  c_juridical_form_id: number | null;
  cc1_country_id: number | null;
  cc1_region_id: number | null;
  cc1_city_id: number | null;
  // Group FK dynamic — keyed by config.groupColumn
  [key: string]: unknown;
};

const inputClass =
  "w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-3 py-1.5 text-[13px] focus:border-[var(--ao-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ao-accent)]/30 transition";

export function CompanyVerticalForm({
  config,
  row,
}: {
  config: CompanyVerticalFormConfig;
  row: Row;
}) {
  const { t } = useLocale();
  const groupCol = config.groupColumn;
  const [form, setForm] = useState<Row>(row);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"ok" | "err" | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type ?? 1,
      full_name: form.full_name,
      identification: form.identification,
      comment: form.comment,
      c_juridical_form_id: form.c_juridical_form_id,
      [groupCol]: form[groupCol],
      cc1_country_id: form.cc1_country_id,
      cc1_region_id: form.cc1_region_id,
      cc1_city_id: form.cc1_city_id,
    };
    if (config.hasCode) payload.code = form.code ?? null;
    if (config.hasDescriptions) {
      payload.text_en = form.text_en ?? null;
      payload.text_ge = form.text_ge ?? null;
    }

    const res = await fetch(`${config.apiPath}/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) {
      setMsgType("ok");
      setMsg(t("common.saved"));
    } else {
      setMsgType("err");
      setMsg(
        t("errors.error_prefix", {
          message: j.error?.message ?? t("errors.unknown"),
        }),
      );
    }
  }

  return (
    <div className="mt-5 grid max-w-5xl gap-4">
      <FormSection title={t("vertical.section.identity")}>
        <FormField label={t("fields.name")} full>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </FormField>
        {config.hasCode && (
          <FormField label={config.codeLabel ?? t("fields.code")}>
            <input
              value={(form.code as string) ?? ""}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={`${inputClass} font-mono uppercase tracking-wider`}
            />
          </FormField>
        )}
        <FormField label={t("fields.full_name")} full={!config.hasCode}>
          <input
            value={form.full_name ?? ""}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={inputClass}
          />
        </FormField>
        <CascadingCombobox
          label={t("fields.juridical_form")}
          value={form.c_juridical_form_id}
          onChange={(v) => setForm({ ...form, c_juridical_form_id: v })}
          endpoint="/api/catalogs/juridical-form"
        />
        <CascadingCombobox
          label={config.groupLabel}
          value={form[groupCol] as number | null}
          onChange={(v) => setForm({ ...form, [groupCol]: v })}
          endpoint={config.groupEndpoint}
        />
        <FormField label={t("fields.type")} full>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
            <input
              type="checkbox"
              checked={(form.type ?? 1) === 1}
              onChange={(e) =>
                setForm({ ...form, type: e.target.checked ? 1 : 0 })
              }
              className="h-4 w-4 rounded border-[var(--allonce-line)] accent-[var(--ao-accent)]"
            />
            {t("fields.juridical_person")}
          </label>
        </FormField>
      </FormSection>

      <FormSection title={t("vertical.section.location")}>
        <CascadingCombobox
          label={t("fields.country")}
          value={form.cc1_country_id}
          onChange={(v) => setForm({ ...form, cc1_country_id: v })}
          endpoint="/api/catalogs/countries"
        />
        <CascadingCombobox
          label={t("fields.region")}
          value={form.cc1_region_id}
          onChange={(v) => setForm({ ...form, cc1_region_id: v })}
          endpoint="/api/catalogs/regions"
          filterParam="country_id"
          filterValue={form.cc1_country_id}
          placeholder={t("fields.pick_country_first")}
        />
        <CascadingCombobox
          label={t("fields.city")}
          value={form.cc1_city_id}
          onChange={(v) => setForm({ ...form, cc1_city_id: v })}
          endpoint="/api/catalogs/cities"
          filterParam="region_id"
          filterValue={form.cc1_region_id}
          placeholder={t("fields.pick_region_first")}
        />
      </FormSection>

      {config.hasDescriptions && (
        <FormSection title={t("vertical.section.descriptions")} cols={1}>
          <FormField label={t("transfer.fields.text_en")} full>
            <textarea
              value={form.text_en ?? ""}
              onChange={(e) => setForm({ ...form, text_en: e.target.value })}
              className={`${inputClass} min-h-[100px] leading-relaxed`}
              placeholder={t("transfer.fields.text_en_hint")}
            />
          </FormField>
          <FormField label={t("transfer.fields.text_ge")} full>
            <textarea
              value={form.text_ge ?? ""}
              onChange={(e) => setForm({ ...form, text_ge: e.target.value })}
              className={`${inputClass} min-h-[100px] leading-relaxed`}
              placeholder={t("transfer.fields.text_ge_hint")}
            />
          </FormField>
        </FormSection>
      )}

      <FormSection title={t("vertical.section.notes")} cols={1}>
        <FormField label={t("fields.identification")} full>
          <input
            value={form.identification ?? ""}
            onChange={(e) =>
              setForm({ ...form, identification: e.target.value })
            }
            className={`${inputClass} font-mono`}
          />
        </FormField>
        <FormField label={t("fields.comment")} full>
          <textarea
            value={form.comment ?? ""}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            className={`${inputClass} min-h-[80px] leading-relaxed`}
          />
        </FormField>
      </FormSection>

      <div className="sticky bottom-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-sm)] backdrop-blur">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-4 py-1.5 text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {msg && (
          <span
            className={`text-[12px] ${msgType === "err" ? "text-[var(--allonce-err)]" : "text-[var(--ink-500)]"}`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
