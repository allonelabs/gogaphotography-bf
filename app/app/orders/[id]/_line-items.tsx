"use client";

import { useState } from "react";
import type { OrderDetail, LineItem } from "./_detail-view";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

type FieldDef = { name: string; labelKey: TranslationKey; type: string };

interface VerticalDef {
  key: keyof OrderDetail | string;
  vertical: string;
  labelKey: TranslationKey;
  fields: FieldDef[];
  summary: (it: LineItem) => string;
}

const VERTICALS: VerticalDef[] = [
  {
    key: "hotels",
    vertical: "hotel",
    labelKey: "items.hotels",
    fields: [
      { name: "hotel_name", labelKey: "items.hotel.name", type: "text" },
      {
        name: "hotel_full_name",
        labelKey: "items.hotel.full_name",
        type: "text",
      },
      { name: "check_in", labelKey: "items.hotel.check_in", type: "date" },
      { name: "check_out", labelKey: "items.hotel.check_out", type: "date" },
      {
        name: "c_number_category",
        labelKey: "items.hotel.room_category",
        type: "text",
      },
      { name: "cc_room_type", labelKey: "items.hotel.room_type", type: "text" },
      { name: "c_board_type", labelKey: "items.hotel.board", type: "text" },
      { name: "days", labelKey: "items.hotel.days", type: "number" },
      {
        name: "room_price",
        labelKey: "items.hotel.room_price",
        type: "number",
      },
      {
        name: "sell_price",
        labelKey: "items.hotel.sell_price",
        type: "number",
      },
    ],
    summary: (it) =>
      `${it.hotel_name ?? "—"} · ${it.check_in ?? ""}→${it.check_out ?? ""} · ${
        it.cc_room_type ?? ""
      } · ${it.sell_price ?? "—"}`,
  },
  {
    key: "avias",
    vertical: "avia",
    labelKey: "items.avia",
    fields: [
      { name: "avia_name", labelKey: "items.avia.airline", type: "text" },
      {
        name: "ticket_number",
        labelKey: "items.avia.ticket_number",
        type: "text",
      },
      {
        name: "c_avia_ticket_type",
        labelKey: "items.avia.ticket_type",
        type: "text",
      },
      {
        name: "c_avia_direction",
        labelKey: "items.avia.direction",
        type: "text",
      },
      { name: "fly_date", labelKey: "items.avia.fly_date", type: "date" },
      { name: "tarif", labelKey: "items.avia.tariff", type: "number" },
      {
        name: "service_fee",
        labelKey: "items.avia.service_fee",
        type: "number",
      },
      {
        name: "ticket_price",
        labelKey: "items.avia.ticket_price",
        type: "number",
      },
    ],
    summary: (it) =>
      `${it.avia_name ?? "—"} · ${it.ticket_number ?? ""} · ${
        it.fly_date ?? ""
      } · ${it.ticket_price ?? "—"}`,
  },
  {
    key: "transfers",
    vertical: "transfer",
    labelKey: "items.transfers",
    fields: [
      {
        name: "transfer_name",
        labelKey: "items.transfer.company",
        type: "text",
      },
      {
        name: "c_transfer_type",
        labelKey: "items.transfer.type",
        type: "text",
      },
      {
        name: "c_transfer_direction",
        labelKey: "items.transfer.direction",
        type: "text",
      },
      {
        name: "issue_date",
        labelKey: "items.transfer.issue_date",
        type: "date",
      },
      { name: "human_count", labelKey: "items.transfer.pax", type: "number" },
      { name: "price", labelKey: "items.transfer.price", type: "number" },
      {
        name: "sell_price",
        labelKey: "items.transfer.sell_price",
        type: "number",
      },
    ],
    summary: (it) =>
      `${it.transfer_name ?? "—"} · ${it.c_transfer_direction ?? ""} · ${
        it.sell_price ?? "—"
      }`,
  },
  {
    key: "excursions",
    vertical: "excursion",
    labelKey: "items.excursions",
    fields: [
      { name: "pay_name", labelKey: "items.excursion.name", type: "text" },
      {
        name: "c_excursion_type",
        labelKey: "items.excursion.type",
        type: "text",
      },
      { name: "start_date", labelKey: "items.excursion.start", type: "date" },
      { name: "end_date", labelKey: "items.excursion.end", type: "date" },
      { name: "count", labelKey: "items.excursion.count", type: "number" },
      { name: "price", labelKey: "items.excursion.cost_price", type: "number" },
      {
        name: "sell_price",
        labelKey: "items.excursion.sell_price",
        type: "number",
      },
    ],
    summary: (it) =>
      `${it.pay_name ?? "—"} · ${it.start_date ?? ""}→${it.end_date ?? ""} · ${
        it.sell_price ?? "—"
      }`,
  },
  {
    key: "ensures",
    vertical: "ensure",
    labelKey: "items.insurance",
    fields: [
      {
        name: "ensure_name",
        labelKey: "items.insurance.insurer",
        type: "text",
      },
      { name: "c_ensure_type", labelKey: "items.insurance.type", type: "text" },
      {
        name: "polise_number",
        labelKey: "items.insurance.policy",
        type: "text",
      },
      { name: "from_date", labelKey: "items.insurance.from", type: "date" },
      { name: "to_date", labelKey: "items.insurance.to", type: "date" },
      {
        name: "ensure_limit",
        labelKey: "items.insurance.limit",
        type: "number",
      },
      { name: "bonus", labelKey: "items.insurance.bonus", type: "number" },
    ],
    summary: (it) =>
      `${it.ensure_name ?? "—"} · ${it.polise_number ?? ""} · ${
        it.from_date ?? ""
      }→${it.to_date ?? ""}`,
  },
  {
    key: "visas",
    vertical: "visa",
    labelKey: "items.visa",
    fields: [
      { name: "pay_name", labelKey: "items.visa.label", type: "text" },
      { name: "consul_name", labelKey: "items.visa.consul", type: "text" },
      { name: "invoice_number", labelKey: "items.visa.invoice", type: "text" },
      { name: "start_date", labelKey: "items.visa.start", type: "date" },
      { name: "end_date", labelKey: "items.visa.end", type: "date" },
      { name: "price", labelKey: "items.visa.price", type: "number" },
      { name: "sell_price", labelKey: "items.visa.sell_price", type: "number" },
    ],
    summary: (it) =>
      `${it.pay_name ?? "—"} · ${it.consul_name ?? ""} · ${
        it.sell_price ?? "—"
      }`,
  },
  {
    key: "services",
    vertical: "service",
    labelKey: "items.other_services",
    fields: [
      { name: "pay_name", labelKey: "items.service.name", type: "text" },
      { name: "c_service_type", labelKey: "items.service.type", type: "text" },
      { name: "company_name", labelKey: "items.service.vendor", type: "text" },
      { name: "start_date", labelKey: "items.service.start", type: "date" },
      { name: "end_date", labelKey: "items.service.end", type: "date" },
      { name: "count", labelKey: "items.service.count", type: "number" },
      { name: "price", labelKey: "items.service.price", type: "number" },
      {
        name: "sell_price",
        labelKey: "items.service.sell_price",
        type: "number",
      },
    ],
    summary: (it) =>
      `${it.pay_name ?? "—"} · ${it.company_name ?? ""} · ${
        it.sell_price ?? "—"
      }`,
  },
];

export function LineItemsPanel({
  order,
  kind,
}: {
  order: OrderDetail;
  kind: "order" | "refund";
}) {
  return (
    <div className="flex flex-col gap-6">
      {VERTICALS.map((v) => (
        <VerticalSection
          key={v.key as string}
          order={order}
          v={v}
          items={(order as any)[v.key] as LineItem[]}
          kind={kind}
        />
      ))}
    </div>
  );
}

function VerticalSection({
  order,
  v,
  items,
  kind,
}: {
  order: OrderDetail;
  v: VerticalDef;
  items: LineItem[];
  kind: "order" | "refund";
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LineItem[]>(items);

  async function add() {
    setSaving(true);
    setError(null);
    const path = kind === "order" ? "orders" : "refunds";
    const res = await fetch(`/api/${path}/${order.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical: v.vertical, ...form }),
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

  const label = t(v.labelKey);

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between border-b border-[var(--allonce-line)] px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--ink-900)]">
            {label}
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
          {open ? t("common.cancel") : t("items.add_one", { label })}
        </button>
      </header>

      <div className="divide-y divide-[var(--allonce-line)]">
        {rows.length === 0 && !open && (
          <div className="px-4 py-3 text-[12px] text-[var(--ink-400)]">
            {t("items.none")}
          </div>
        )}
        {rows.map((it) => (
          <div
            key={it.id}
            className="flex items-center justify-between px-4 py-2 text-[12px] text-[var(--ink-700)]"
          >
            <span className="truncate">{v.summary(it)}</span>
            <span className="font-mono text-[10px] text-[var(--ink-400)]">
              {t("items.id_label", { id: it.id })}
            </span>
          </div>
        ))}
      </div>

      {open && (
        <div className="border-t border-[var(--allonce-line)] bg-[var(--bg-sunken)] px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {v.fields.map((f) => (
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
                      [f.name]:
                        f.type === "number"
                          ? e.target.value === ""
                            ? null
                            : Number(e.target.value)
                          : e.target.value === ""
                            ? null
                            : e.target.value,
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
              {saving ? t("common.adding") : t("common.add")}
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
