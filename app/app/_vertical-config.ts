/**
 * Per-vertical UI config — the slugs the routes live under in /app/<slug>,
 * the API base, the catalog endpoint for the vertical group, the form
 * column name for the group FK, and labels.
 */

export interface UiVerticalConfig {
  slug: string; // "/app/<slug>"
  apiPath: string; // "/api/<base>"
  label: string; // singular for breadcrumbs / titles
  pluralLabel: string; // plural for list-header total label
  groupEndpoint: string; // catalog endpoint
  groupLabel: string;
  groupColumn: string;
  hasCode: boolean;
  /** Permission code for write access (matches the seeded codes in migration 0004). */
  writePermission: string;
  /** Permission code for delete access. */
  deletePermission: string;
}

export const COMPANY_VERTICALS: Record<string, UiVerticalConfig> = {
  avia: {
    slug: "avia",
    apiPath: "/api/avia",
    label: "Avia",
    pluralLabel: "avia companies",
    groupEndpoint: "/api/catalogs/avia-groups",
    groupLabel: "Avia group",
    groupColumn: "c_avia_group_id",
    hasCode: true,
    writePermission: "avia.write",
    deletePermission: "avia.delete",
  },
  transfers: {
    slug: "transfers",
    apiPath: "/api/transfer", // URL plural, DB singular
    label: "Transfer",
    pluralLabel: "transfers",
    groupEndpoint: "/api/catalogs/transfer-groups",
    groupLabel: "Transfer group",
    groupColumn: "c_transfer_group_id",
    hasCode: true,
    writePermission: "transfer.write",
    deletePermission: "transfer.delete",
  },
  consul: {
    slug: "consul",
    apiPath: "/api/consul",
    label: "Consul",
    pluralLabel: "consul agencies",
    groupEndpoint: "/api/catalogs/consul-groups",
    groupLabel: "Consul group",
    groupColumn: "c_consul_group_id",
    hasCode: false,
    writePermission: "consul.write",
    deletePermission: "consul.delete",
  },
  insurance: {
    slug: "insurance",
    apiPath: "/api/insurance", // URL "insurance", DB "ensure"
    label: "Insurance",
    pluralLabel: "insurance providers",
    groupEndpoint: "/api/catalogs/ensure-groups",
    groupLabel: "Insurance group",
    groupColumn: "c_ensure_group_id",
    hasCode: true,
    writePermission: "insurance.write",
    deletePermission: "insurance.delete",
  },
  excursions: {
    slug: "excursions",
    apiPath: "/api/excursion",
    label: "Excursion",
    pluralLabel: "excursion providers",
    groupEndpoint: "/api/catalogs/excursion-groups",
    groupLabel: "Excursion group",
    groupColumn: "c_excursion_group_id",
    hasCode: true,
    writePermission: "excursion.write",
    deletePermission: "excursion.delete",
  },
};
