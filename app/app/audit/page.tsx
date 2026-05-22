import { AppShell } from "@/app/components/app/AppShell";
import { AuditTable } from "./_table";
import { headers } from "next/headers";
import { requirePermission } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";

export default async function AuditPage() {
  // Gate the route — non-admins get a 404 (route stays invisible).
  await requirePermission("audit.read");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3003";
  const proto = h.get("x-forwarded-proto") ?? "http";
  let initial: { data: unknown[]; total: number } = { data: [], total: 0 };
  try {
    const res = await fetch(`${proto}://${host}/api/audit?pageSize=50`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") ?? "" },
    });
    const j = await res.json();
    if (j?.ok) initial = { data: j.data ?? [], total: j.total ?? 0 };
  } catch {
    /* swallow */
  }
  const t = await getServerT();

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.audit") },
      ]}
      chatScope={{ level: "tool", tool: "audit" }}
      chatScopeLabel={t("nav.audit")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-1 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
          {t("audit.title")}
        </h1>
        <p className="mb-4 text-[13px] text-[var(--ink-500)]">
          {t("audit.intro")}
        </p>
        <AuditTable
          initialData={initial as { data: AuditEntry[]; total: number }}
        />
      </div>
    </AppShell>
  );
}

export interface AuditEntry {
  id: number;
  occurred_at: string;
  actor_email: string | null;
  action: "insert" | "update" | "delete";
  table_name: string;
  row_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
}
