"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHasPermission } from "@/app/lib/auth/use-permissions";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Order = {
  id: number;
  order_number: number | null;
  c_semblance: string | null;
  client_id: number | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_phone: string | null;
  order_date: string | null;
  level: number | null;
  c_pay_type: string | null;
  all_sell_price: number | null;
  days: number | null;
  in_pay: boolean | null;
  hotels: { id: number }[];
  avias: { id: number }[];
  transfers: { id: number }[];
  excursions: { id: number }[];
  ensures: { id: number }[];
  visas: { id: number }[];
  services: { id: number }[];
  tourists: { id: number }[];
};

function lineItemCount(o: Order): number {
  return (
    o.hotels.length +
    o.avias.length +
    o.transfers.length +
    o.excursions.length +
    o.ensures.length +
    o.visas.length +
    o.services.length
  );
}

function lineItemSummary(o: Order): string {
  const parts: string[] = [];
  if (o.hotels.length) parts.push(`${o.hotels.length}H`);
  if (o.avias.length) parts.push(`${o.avias.length}A`);
  if (o.transfers.length) parts.push(`${o.transfers.length}T`);
  if (o.excursions.length) parts.push(`${o.excursions.length}E`);
  if (o.ensures.length) parts.push(`${o.ensures.length}I`);
  if (o.visas.length) parts.push(`${o.visas.length}V`);
  if (o.services.length) parts.push(`${o.services.length}S`);
  return parts.join(" · ") || "—";
}

export function OrdersTable({
  initialData,
  basePath = "/app/orders",
  apiPath = "/api/orders",
  entityLabel = "orders",
  newHref = "/app/orders/new",
  writePermission = "orders.write",
}: {
  initialData: { data: Order[]; total: number };
  basePath?: string;
  apiPath?: string;
  /** "orders" or "refunds" — used to pick translation keys. */
  entityLabel?: "orders" | "refunds" | string;
  newHref?: string;
  /** Permission code that gates the "New" button — default `orders.write`. */
  writePermission?: string;
}) {
  const { t } = useLocale();
  const canWrite = useHasPermission(writePermission);
  const [rows, setRows] = useState(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Translation helpers — accept either "orders" or "refunds".
  const isRefunds = entityLabel === "refunds";
  const entityT = isRefunds
    ? t("orders.entity.refunds")
    : t("orders.entity.orders");
  const entitySingularT = isRefunds
    ? t("orders.entity.refund_singular")
    : t("orders.entity.order_singular");
  const newCtaT = isRefunds ? t("refunds.new_title") : t("orders.new_title");

  useEffect(() => {
    const url = new URL(apiPath, window.location.origin);
    if (search) url.searchParams.set("search", search);
    if (status) url.searchParams.set("status", status);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    fetch(url.toString())
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setRows(j.data);
          setTotal(j.total);
        }
      });
  }, [search, status, page, apiPath]);

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      {
        id: "number",
        header: () => t("orders.col.number"),
        accessorKey: "order_number",
        cell: (info) => (
          <Link
            href={`${basePath}/${info.row.original.id}`}
            className="font-mono text-[12px] text-[var(--ink-900)] hover:underline"
          >
            {info.row.original.order_number != null
              ? String(info.row.original.order_number)
              : t("items.id_label", { id: info.row.original.id })}
          </Link>
        ),
      },
      {
        id: "client",
        header: () => t("orders.col.client"),
        cell: (info) => {
          const o = info.row.original;
          const first = (o.client_first_name ?? "").trim();
          const last = (o.client_last_name ?? "").trim();
          const name = [first, last].filter(Boolean).join(" ") || "—";
          return <span className="text-[var(--ink-900)]">{name}</span>;
        },
      },
      {
        header: () => t("orders.col.date"),
        accessorKey: "order_date",
        cell: (info) =>
          info.getValue() ? (
            <span className="font-mono text-[12px] text-[var(--ink-700)]">
              {String(info.getValue()).slice(0, 10)}
            </span>
          ) : (
            <span className="text-[var(--ink-400)]">—</span>
          ),
      },
      {
        header: () => t("orders.col.status"),
        accessorKey: "c_semblance",
        cell: (info) => {
          const v = (info.getValue() as string) ?? "";
          return v ? (
            <span className="rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[11px] text-[var(--ink-700)]">
              {v}
            </span>
          ) : (
            <span className="text-[var(--ink-400)]">—</span>
          );
        },
      },
      {
        id: "items",
        header: () => t("orders.col.items"),
        cell: (info) => {
          const o = info.row.original;
          const n = lineItemCount(o);
          return (
            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-700)]">
              {n}{" "}
              <span className="text-[var(--ink-400)]">
                ({lineItemSummary(o)})
              </span>
            </span>
          );
        },
      },
      {
        id: "tourists",
        header: () => t("orders.col.tourists"),
        cell: (info) => (
          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-700)]">
            {info.row.original.tourists.length}
          </span>
        ),
      },
      {
        header: () => t("orders.col.total"),
        accessorKey: "all_sell_price",
        cell: (info) => {
          const v = info.getValue() as number | null;
          return v == null ? (
            <span className="text-[var(--ink-400)]">—</span>
          ) : (
            <span className="font-mono text-[12px] tabular-nums text-[var(--ink-900)]">
              {v.toLocaleString()}
            </span>
          );
        },
      },
    ],
    [t, basePath],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const pageTotal = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder={t("orders.search_placeholder", { entity: entityT })}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:flex-1"
        />
        <input
          type="text"
          placeholder={t("orders.filter_status")}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:w-44"
        />
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-[11px] tabular-nums text-[var(--ink-400)] sm:flex-none">
            {t("orders.count", { n: total, entity: entityT })}
          </span>
          {newHref && canWrite && (
            <Link
              href={newHref}
              className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white"
            >
              {newCtaT}
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-[var(--bg-sunken)] text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--allonce-line)]">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-[var(--ink-500)]"
                >
                  {t("orders.empty", { entity: entityT })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-[12px] text-[var(--ink-500)]">
        <span>{t("common.page_of", { page, total: pageTotal })}</span>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-2 py-0.5 disabled:opacity-40"
          aria-label={t("common.previous")}
        >
          ‹
        </button>
        <button
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-2 py-0.5 disabled:opacity-40"
          aria-label={t("common.next")}
        >
          ›
        </button>
        {/* entitySingularT kept for future use when a single-noun chip is needed */}
        <span className="hidden">{entitySingularT}</span>
      </div>
    </div>
  );
}
