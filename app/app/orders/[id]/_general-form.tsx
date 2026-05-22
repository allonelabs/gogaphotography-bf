"use client";

import { useState } from "react";
import type { OrderDetail } from "./_detail-view";
import { useHasPermission } from "@/app/lib/auth/use-permissions";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Editable = Pick<
  OrderDetail,
  | "c_semblance"
  | "client_first_name"
  | "client_last_name"
  | "client_pasport_number"
  | "client_phone"
  | "client_category"
  | "client_address"
  | "client_country"
  | "client_city"
  | "client_birthday"
  | "cm_name"
  | "cm_identification"
  | "cm_director"
  | "cm_bank_name"
  | "cm_bank_code"
  | "cm_bank_number"
  | "cm_currency"
  | "order_date"
  | "level"
  | "c_pay_type"
  | "c_pay_proviso"
  | "all_sell_price"
  | "days"
  | "in_pay"
  | "info"
  | "geter_invoice_number"
  | "self_invoice_number"
  | "avia_invoice_number"
  | "additional_number"
>;

export function GeneralForm({
  order,
  kind,
}: {
  order: OrderDetail;
  kind: "order" | "refund";
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<Editable>({
    c_semblance: order.c_semblance ?? null,
    client_first_name: order.client_first_name ?? null,
    client_last_name: order.client_last_name ?? null,
    client_pasport_number: order.client_pasport_number ?? null,
    client_phone: order.client_phone ?? null,
    client_category: order.client_category ?? null,
    client_address: order.client_address ?? null,
    client_country: order.client_country ?? null,
    client_city: order.client_city ?? null,
    client_birthday: order.client_birthday ?? null,
    cm_name: order.cm_name ?? null,
    cm_identification: order.cm_identification ?? null,
    cm_director: order.cm_director ?? null,
    cm_bank_name: order.cm_bank_name ?? null,
    cm_bank_code: order.cm_bank_code ?? null,
    cm_bank_number: order.cm_bank_number ?? null,
    cm_currency: order.cm_currency ?? null,
    order_date: order.order_date ?? null,
    level: order.level ?? null,
    c_pay_type: order.c_pay_type ?? null,
    c_pay_proviso: order.c_pay_proviso ?? null,
    all_sell_price: order.all_sell_price ?? null,
    days: order.days ?? null,
    in_pay: order.in_pay ?? null,
    info: order.info ?? null,
    geter_invoice_number: order.geter_invoice_number ?? null,
    self_invoice_number: order.self_invoice_number ?? null,
    avia_invoice_number: order.avia_invoice_number ?? null,
    additional_number: order.additional_number ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const canWrite = useHasPermission(
    kind === "order" ? "orders.write" : "refunds.write",
  );

  async function save() {
    setSaving(true);
    setMsg(null);
    const path = kind === "order" ? "orders" : "refunds";
    const res = await fetch(`/api/${path}/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) setMsg(t("common.saved"));
    else setMsg(j.error?.message ?? t("common.failed"));
  }

  const fld = (
    label: string,
    key: keyof Editable,
    type: "text" | "number" | "date" = "text",
  ) => (
    <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
      <span>{label}</span>
      <input
        type={type}
        value={
          (form[key] as string | number | null) == null ? "" : String(form[key])
        }
        onChange={(e) => {
          const v: any =
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value === ""
                ? null
                : e.target.value;
          setForm((s) => ({ ...s, [key]: v }));
        }}
        className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {t("orders.section.client")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fld(t("fields.first_name"), "client_first_name")}
          {fld(t("fields.last_name"), "client_last_name")}
          {fld(t("fields.passport_number"), "client_pasport_number")}
          {fld(t("fields.phone"), "client_phone")}
          {fld(t("fields.category"), "client_category")}
          {fld(t("fields.birthday"), "client_birthday", "date")}
          {fld(t("fields.country"), "client_country")}
          {fld(t("fields.city"), "client_city")}
          {fld(t("fields.address"), "client_address")}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {t("orders.section.order")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fld(t("orders.col.status"), "c_semblance")}
          {fld(t("orders.field.order_date"), "order_date", "date")}
          {fld(t("orders.field.level"), "level", "number")}
          {fld(t("orders.field.pay_type"), "c_pay_type")}
          {fld(t("orders.field.pay_proviso"), "c_pay_proviso")}
          {fld(t("orders.field.days"), "days", "number")}
          {fld(t("orders.field.total_sell_price"), "all_sell_price", "number")}
          {fld(t("orders.field.geter_invoice"), "geter_invoice_number")}
          {fld(t("orders.field.self_invoice"), "self_invoice_number")}
          {fld(t("orders.field.avia_invoice"), "avia_invoice_number")}
          {fld(t("orders.field.additional_number"), "additional_number")}
          <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
            <span>{t("orders.field.in_pay")}</span>
            <select
              value={form.in_pay == null ? "" : form.in_pay ? "1" : "0"}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  in_pay:
                    e.target.value === ""
                      ? null
                      : e.target.value === "1"
                        ? true
                        : false,
                }))
              }
              className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
            >
              <option value="">—</option>
              <option value="1">{t("common.yes")}</option>
              <option value="0">{t("common.no")}</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {t("orders.section.company_parameters")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fld(t("orders.field.company_name"), "cm_name")}
          {fld(t("fields.identification"), "cm_identification")}
          {fld(t("orders.field.director"), "cm_director")}
          {fld(t("fields.bank_name"), "cm_bank_name")}
          {fld(t("fields.bank_code"), "cm_bank_code")}
          {fld(t("orders.field.bank_number"), "cm_bank_number")}
          {fld(t("fields.currency"), "cm_currency")}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {t("orders.section.notes")}
        </h3>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("fields.info")}</span>
          <textarea
            value={form.info ?? ""}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                info: e.target.value === "" ? null : e.target.value,
              }))
            }
            rows={4}
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving || !canWrite}
          onClick={save}
          title={canWrite ? undefined : t("hotels.permission_required")}
          className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {!canWrite && (
          <span className="text-[12px] text-[var(--ink-500)]">
            {t("hotels.permission_required")}
          </span>
        )}
        {msg && (
          <span className="text-[12px] text-[var(--ink-500)]">{msg}</span>
        )}
      </div>
    </div>
  );
}
