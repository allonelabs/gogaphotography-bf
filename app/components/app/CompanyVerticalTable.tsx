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

export interface CompanyVerticalRow {
  id: number;
  name: string;
  full_name?: string | null;
  identification?: string | null;
  code?: string | null;
  group?: { name: string } | null;
  country?: { name: string } | null;
  city?: { name: string } | null;
  // Free-form extension — verticals like transfer carry text_en / text_ge.
  [key: string]: unknown;
}

export interface CompanyVerticalTableConfig {
  /** Slug — used for the link target (`/app/<slug>`) and per-row link. */
  slug: string;
  /** API base — e.g. `/api/avia`. Note: differs from slug for insurance & transfers. */
  apiPath: string;
  /** Plural label for the title row (e.g. `Avia companies`, `Insurance providers`). */
  totalLabel: string;
  /**
   * Default fallback only — prefer passing `columns` for vertical-specific
   * semantics (e.g. avia has an IATA code, transfer has a description).
   */
  showCode?: boolean;
  /**
   * Permission code to gate the "New" button. If omitted, the button is
   * always shown — but the API will still reject the create. Pass this so
   * users without write access don't see a dead-end CTA.
   */
  writePermission?: string;
}

export interface EmptyState {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Permission code gating the CTA. Falls back to writePermission. */
  ctaPermission?: string;
}

export function CompanyVerticalTable({
  config,
  initialData,
  columns: customColumns,
  emptyState,
  hideTopBar,
}: {
  config: CompanyVerticalTableConfig;
  initialData: { data: CompanyVerticalRow[]; total: number };
  /**
   * Vertical-specific column set. When provided, replaces the default
   * (id / name / group / country / city / [code] / identification).
   * Always includes the row link in the first non-id column.
   */
  columns?: ColumnDef<CompanyVerticalRow>[];
  /** Vertical-specific empty state. Replaces the bare "No results." cell. */
  emptyState?: EmptyState;
  /**
   * When the page renders its own VerticalEyebrow (count + CTA), the
   * table doesn't need its own search/count/new top bar — pass `true`
   * to hide it. The search input still appears below the eyebrow as a
   * compact sub-toolbar.
   */
  hideTopBar?: boolean;
}) {
  const { t } = useLocale();
  const [rows, setRows] = useState(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const canWrite = useHasPermission(config.writePermission ?? "");
  const showNew = config.writePermission ? canWrite : true;
  const ctaPerm = emptyState?.ctaPermission ?? config.writePermission ?? "";
  const canEmptyCta = useHasPermission(ctaPerm);
  const showEmptyCta = ctaPerm ? canEmptyCta : true;

  useEffect(() => {
    const url = new URL(config.apiPath, window.location.origin);
    url.searchParams.set("search", search);
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
  }, [search, page, config.apiPath]);

  const defaultColumns: ColumnDef<CompanyVerticalRow>[] = useMemo(
    () => [
      {
        header: () => t("vertical.col.id"),
        accessorKey: "id",
        cell: (info) => (
          <span className="font-mono text-[11px] text-[var(--ink-400)]">
            {String(info.getValue()).padStart(3, "0")}
          </span>
        ),
      },
      {
        header: () => t("vertical.col.name"),
        accessorKey: "name",
        cell: (info) => (
          <Link
            href={`/app/${config.slug}/${info.row.original.id}`}
            className="font-medium text-[var(--ink-900)] hover:underline"
          >
            {info.getValue() as string}
          </Link>
        ),
      },
      {
        id: "group",
        header: () => t("vertical.col.group"),
        cell: (info) => info.row.original.group?.name ?? "—",
      },
      {
        id: "country",
        header: () => t("vertical.col.country"),
        cell: (info) => info.row.original.country?.name ?? "—",
      },
      {
        id: "city",
        header: () => t("vertical.col.city"),
        cell: (info) => info.row.original.city?.name ?? "—",
      },
      ...(config.showCode
        ? [
            {
              id: "code",
              header: () => t("vertical.col.code"),
              cell: (info) => info.row.original.code ?? "—",
            } as ColumnDef<CompanyVerticalRow>,
          ]
        : []),
      {
        id: "identification",
        header: () => t("vertical.col.identification"),
        cell: (info) => info.row.original.identification ?? "—",
      },
    ],
    [t, config.slug, config.showCode],
  );

  const columns = customColumns ?? defaultColumns;

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      {!hideTopBar ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder={t("vertical.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:flex-1"
          />
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-[11px] tabular-nums text-[var(--ink-400)] sm:flex-none">
              {total} {config.totalLabel}
            </span>
            {showNew && (
              <Link
                href={`/app/${config.slug}/new`}
                className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white"
              >
                {t("vertical.new_short")}
              </Link>
            )}
          </div>
        </div>
      ) : (
        // Slim search-only sub-toolbar when the page provides its own
        // eyebrow header (which already shows count + new CTA).
        <div className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2">
          <input
            type="search"
            placeholder={t("vertical.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-[var(--radius-xs)] bg-transparent px-3 py-1 text-[13px] outline-none placeholder:text-[var(--ink-400)]"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[720px] text-[13px]">
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
              <tr
                key={r.id}
                className="border-t border-[var(--allonce-line)] transition hover:bg-[var(--bg-sunken)]/40"
              >
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-14">
                  {emptyState ? (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
                      <div
                        aria-hidden
                        className="mb-1 h-10 w-10 rounded-full border border-dashed border-[var(--allonce-line)] bg-[var(--bg-sunken)]"
                      />
                      <p className="text-[14px] font-medium text-[var(--ink-900)]">
                        {emptyState.title}
                      </p>
                      <p className="text-[12.5px] leading-relaxed text-[var(--ink-500)]">
                        {emptyState.body}
                      </p>
                      {emptyState.ctaHref &&
                        emptyState.ctaLabel &&
                        showEmptyCta && (
                          <Link
                            href={emptyState.ctaHref}
                            className="mt-2 rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white"
                          >
                            {emptyState.ctaLabel}
                          </Link>
                        )}
                    </div>
                  ) : (
                    <div className="text-center text-[var(--ink-500)]">
                      {t("vertical.empty")}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-[12px] text-[var(--ink-500)]">
        <span>
          {t("common.page_of", {
            page,
            total: Math.max(1, Math.ceil(total / pageSize)),
          })}
        </span>
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
      </div>
    </div>
  );
}
