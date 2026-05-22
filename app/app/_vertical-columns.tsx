"use client";

/**
 * Vertical-specific column definitions for the booking-vertical list pages.
 *
 * Each company-like vertical (avia, transfer, consul, insurance, excursion)
 * had been rendering the same generic `id / name / group / country / city /
 * code / identification` table — which obscured the vertical's actual
 * semantics. This module returns a tailored ColumnDef[] per vertical, used
 * by `CompanyVerticalTable` via its new `columns` prop.
 */

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { CompanyVerticalRow } from "@/app/components/app/CompanyVerticalTable";
import type { TranslationKey } from "@/app/lib/i18n/dict";

type T = (k: TranslationKey, vars?: Record<string, string | number>) => string;

function idCol(): ColumnDef<CompanyVerticalRow> {
  return {
    header: "ID",
    accessorKey: "id",
    cell: (info) => (
      <span className="font-mono text-[11px] text-[var(--ink-400)]">
        {String(info.getValue()).padStart(3, "0")}
      </span>
    ),
  };
}

function nameLinkCol(slug: string, t: T): ColumnDef<CompanyVerticalRow> {
  return {
    header: () => t("vertical.col.name"),
    accessorKey: "name",
    cell: (info) => (
      <Link
        href={`/app/${slug}/${info.row.original.id}`}
        className="font-medium text-[var(--ink-900)] hover:underline"
      >
        {(info.getValue() as string) || `#${info.row.original.id}`}
      </Link>
    ),
  };
}

function countryCol(t: T): ColumnDef<CompanyVerticalRow> {
  return {
    id: "country",
    header: () => t("vertical.col.country"),
    cell: (info) => info.row.original.country?.name ?? "—",
  };
}

function cityCol(t: T): ColumnDef<CompanyVerticalRow> {
  return {
    id: "city",
    header: () => t("vertical.col.city"),
    cell: (info) => info.row.original.city?.name ?? "—",
  };
}

function mainContactCol(t: T): ColumnDef<CompanyVerticalRow> {
  return {
    id: "main_contact",
    header: () => t("vertical.col.main_contact"),
    cell: (info) => {
      const r = info.row.original as CompanyVerticalRow & {
        main_contact?: { name?: string | null; phone?: string | null } | null;
      };
      const c = r.main_contact;
      if (!c) return <span className="text-[var(--ink-400)]">—</span>;
      const display = c.name || c.phone || "—";
      return <span className="text-[var(--ink-700)]">{display}</span>;
    },
  };
}

export function aviaColumns(
  slug: string,
  t: T,
): ColumnDef<CompanyVerticalRow>[] {
  return [
    idCol(),
    nameLinkCol(slug, t),
    {
      id: "code",
      header: () => t("avia.col.code"),
      cell: (info) => {
        const v = info.row.original.code;
        return v ? (
          <span className="rounded-[var(--radius-xs)] bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {v}
          </span>
        ) : (
          <span className="text-[var(--ink-400)]">—</span>
        );
      },
    },
    countryCol(t),
    cityCol(t),
    mainContactCol(t),
  ];
}

export function transferColumns(
  slug: string,
  t: T,
): ColumnDef<CompanyVerticalRow>[] {
  return [
    idCol(),
    nameLinkCol(slug, t),
    {
      id: "code",
      header: () => t("vertical.col.code"),
      cell: (info) => info.row.original.code ?? "—",
    },
    countryCol(t),
    cityCol(t),
    {
      id: "text_en",
      header: () => t("transfer.col.text_en"),
      cell: (info) => {
        const v = (info.row.original.text_en as string | null) ?? "";
        if (!v) return <span className="text-[var(--ink-400)]">—</span>;
        return (
          <span
            className="line-clamp-1 max-w-[260px] text-[12px] text-[var(--ink-500)]"
            title={v}
          >
            {v}
          </span>
        );
      },
    },
    mainContactCol(t),
  ];
}

export function consulColumns(
  slug: string,
  t: T,
): ColumnDef<CompanyVerticalRow>[] {
  return [
    idCol(),
    nameLinkCol(slug, t),
    {
      id: "group",
      header: () => t("vertical.col.group"),
      cell: (info) => info.row.original.group?.name ?? "—",
    },
    countryCol(t),
    cityCol(t),
    mainContactCol(t),
  ];
}

export function insuranceColumns(
  slug: string,
  t: T,
): ColumnDef<CompanyVerticalRow>[] {
  return [
    idCol(),
    nameLinkCol(slug, t),
    {
      id: "code",
      header: () => t("insurance.col.code"),
      cell: (info) => {
        const v = info.row.original.code;
        return v ? (
          <span className="font-mono text-[12px] text-[var(--ink-700)]">
            {v}
          </span>
        ) : (
          <span className="text-[var(--ink-400)]">—</span>
        );
      },
    },
    countryCol(t),
    cityCol(t),
    mainContactCol(t),
  ];
}

export function excursionColumns(
  slug: string,
  t: T,
): ColumnDef<CompanyVerticalRow>[] {
  return [
    idCol(),
    nameLinkCol(slug, t),
    {
      id: "group",
      header: () => t("vertical.col.group"),
      cell: (info) => info.row.original.group?.name ?? "—",
    },
    countryCol(t),
    cityCol(t),
    mainContactCol(t),
  ];
}
