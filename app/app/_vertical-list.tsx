"use client";

/**
 * Client wrapper for the booking-vertical list pages. Renders the colored
 * eyebrow header + the CompanyVerticalTable with vertical-specific column
 * definitions, an empty state and an accent color. Keeps the per-route
 * server pages thin — they only fetch initial data and pass the vertical
 * kind down.
 */

import { CompanyVerticalTable } from "@/app/components/app/CompanyVerticalTable";
import {
  VerticalEyebrow,
  type VerticalAccent,
} from "@/app/components/app/VerticalEyebrow";
import {
  aviaColumns,
  consulColumns,
  excursionColumns,
  insuranceColumns,
  transferColumns,
} from "@/app/app/_vertical-columns";
import type { CompanyVerticalRow } from "@/app/components/app/CompanyVerticalTable";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

export type VerticalKind =
  | "avia"
  | "transfers"
  | "consul"
  | "insurance"
  | "excursions";

interface VerticalSpec {
  slug: string;
  apiPath: string;
  /** Permission code for the CTA. */
  writePermission: string;
  /** Accent color used in the eyebrow header. */
  accent: VerticalAccent;
  /** Eyebrow uppercase label, e.g. "AVIA · AIRLINES". */
  eyebrow: string;
  /** Title used in the eyebrow + breadcrumb. */
  title: TranslationKey;
  /** Subtitle one-liner. */
  subtitle: TranslationKey;
  /** Plural label for the count. */
  pluralLabel: TranslationKey;
  /** Empty-state keys. */
  emptyTitle: TranslationKey;
  emptyBody: TranslationKey;
  emptyCta: TranslationKey;
}

const SPECS: Record<VerticalKind, VerticalSpec> = {
  avia: {
    slug: "avia",
    apiPath: "/api/avia",
    writePermission: "avia.write",
    accent: "slate",
    eyebrow: "BOOKINGS · AVIA",
    title: "avia.title",
    subtitle: "vertical.avia.subtitle",
    pluralLabel: "avia.plural",
    emptyTitle: "vertical.avia.empty.title",
    emptyBody: "vertical.avia.empty.body",
    emptyCta: "vertical.avia.add_first",
  },
  transfers: {
    slug: "transfers",
    apiPath: "/api/transfer",
    writePermission: "transfer.write",
    accent: "teal",
    eyebrow: "BOOKINGS · TRANSFER",
    title: "transfer.title",
    subtitle: "vertical.transfer.subtitle",
    pluralLabel: "transfer.plural",
    emptyTitle: "vertical.transfer.empty.title",
    emptyBody: "vertical.transfer.empty.body",
    emptyCta: "vertical.transfer.add_first",
  },
  consul: {
    slug: "consul",
    apiPath: "/api/consul",
    writePermission: "consul.write",
    accent: "amber",
    eyebrow: "BOOKINGS · VISA",
    title: "consul.title",
    subtitle: "vertical.consul.subtitle",
    pluralLabel: "consul.plural",
    emptyTitle: "vertical.consul.empty.title",
    emptyBody: "vertical.consul.empty.body",
    emptyCta: "vertical.consul.add_first",
  },
  insurance: {
    slug: "insurance",
    apiPath: "/api/insurance",
    writePermission: "insurance.write",
    accent: "indigo",
    eyebrow: "BOOKINGS · INSURANCE",
    title: "insurance.title",
    subtitle: "vertical.insurance.subtitle",
    pluralLabel: "insurance.plural",
    emptyTitle: "vertical.insurance.empty.title",
    emptyBody: "vertical.insurance.empty.body",
    emptyCta: "vertical.insurance.add_first",
  },
  excursions: {
    slug: "excursions",
    apiPath: "/api/excursion",
    writePermission: "excursion.write",
    accent: "rose",
    eyebrow: "BOOKINGS · EXCURSION",
    title: "excursion.title",
    subtitle: "vertical.excursion.subtitle",
    pluralLabel: "excursion.plural",
    emptyTitle: "vertical.excursion.empty.title",
    emptyBody: "vertical.excursion.empty.body",
    emptyCta: "vertical.excursion.add_first",
  },
};

export function VerticalList({
  kind,
  initialData,
}: {
  kind: VerticalKind;
  initialData: { data: CompanyVerticalRow[]; total: number };
}) {
  const { t } = useLocale();
  const spec = SPECS[kind];

  const columns =
    kind === "avia"
      ? aviaColumns(spec.slug, t)
      : kind === "transfers"
        ? transferColumns(spec.slug, t)
        : kind === "consul"
          ? consulColumns(spec.slug, t)
          : kind === "insurance"
            ? insuranceColumns(spec.slug, t)
            : excursionColumns(spec.slug, t);

  return (
    <div>
      <VerticalEyebrow
        eyebrow={spec.eyebrow}
        title={t(spec.title)}
        subtitle={t(spec.subtitle)}
        count={initialData.total}
        countLabel={t(spec.pluralLabel)}
        accent={spec.accent}
        ctaHref={`/app/${spec.slug}/new`}
        ctaLabel={t("vertical.new_short")}
        ctaPermission={spec.writePermission}
      />
      <CompanyVerticalTable
        config={{
          slug: spec.slug,
          apiPath: spec.apiPath,
          totalLabel: t(spec.pluralLabel),
          writePermission: spec.writePermission,
        }}
        initialData={initialData}
        columns={columns}
        emptyState={{
          title: t(spec.emptyTitle),
          body: t(spec.emptyBody),
          ctaLabel: t(spec.emptyCta),
          ctaHref: `/app/${spec.slug}/new`,
          ctaPermission: spec.writePermission,
        }}
        hideTopBar
      />
    </div>
  );
}
