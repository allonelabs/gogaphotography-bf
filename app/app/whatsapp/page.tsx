/**
 * WhatsApp threads list.
 *
 * Server component. Lists all `whatsapp_thread` rows for the current org
 * sorted by `last_message_at desc`. Each row links to the per-thread
 * conversation. Unread badges are derived from `unread_count`.
 *
 * Permission gate: `whatsapp.read` (notFound() on miss — hide the route's
 * existence from unauthorized users, same pattern as the rest of the app).
 */
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requirePermission } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface ThreadRow {
  id: number;
  contact_phone: string;
  contact_name: string | null;
  matched_entity: string | null;
  matched_entity_id: number | null;
  unread_count: number | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

interface IntegStatus {
  enabled: boolean;
  hasConfig: boolean;
}

async function loadThreadsAndStatus(): Promise<{
  threads: ThreadRow[];
  integ: IntegStatus;
}> {
  const { client, orgId } = await createOrgScopedSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  const [threadsResp, integResp] = await Promise.all([
    sb
      .from("whatsapp_thread")
      .select(
        "id, contact_phone, contact_name, matched_entity, matched_entity_id, unread_count, last_message_at, last_message_preview",
      )
      .eq("organization_id", orgId)
      .order("last_message_at", { ascending: false })
      .limit(200),
    sb
      .from("org_integration")
      .select("enabled, config")
      .eq("organization_id", orgId)
      .eq("kind", "whatsapp")
      .maybeSingle(),
  ]);

  const integ: IntegStatus = {
    enabled: !!integResp.data?.enabled,
    hasConfig: !!integResp.data?.config?.phone_number_id,
  };

  return {
    threads: (threadsResp.data ?? []) as ThreadRow[],
    integ,
  };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${Math.max(diff, 0)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initialsOf(name: string | null, phone: string): string {
  const src = (name ?? "").trim();
  if (src) {
    return src
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  // last 2 digits of phone as fallback
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2) || "··";
}

export default async function WhatsAppThreadsPage() {
  await requirePermission("whatsapp.read");
  const t = await getServerT();
  const { threads, integ } = await loadThreadsAndStatus();

  const isConnected = integ.enabled && integ.hasConfig;

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.whatsapp") },
      ]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel="WhatsApp"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {t("whatsapp.title")}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--ink-500)]">
              {t("whatsapp.subtitle")}
            </p>
          </div>
          <Link
            href="/app/integrations/whatsapp"
            className="text-[12px] text-[var(--ink-500)] hover:text-[var(--ink-900)]"
          >
            {isConnected
              ? `· ${t("integrations.status.connected")}`
              : t("whatsapp.empty.cta")}{" "}
            →
          </Link>
        </div>

        {threads.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--allonce-line)] bg-[var(--bg-surface)] px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-[var(--ink-500)]">
              <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-[15px] font-medium text-[var(--ink-900)]">
              {t("whatsapp.empty.title")}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--ink-500)]">
              {t("whatsapp.empty.body")}
            </p>
            {!isConnected && (
              <p className="mx-auto mt-3 max-w-md text-[12px] text-[var(--ink-400)]">
                {t("whatsapp.empty.cta_hint")}
              </p>
            )}
            <div className="mt-5">
              <Link
                href="/app/integrations/whatsapp"
                className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-5 text-[12.5px] font-medium text-white transition hover:bg-black"
              >
                {t("whatsapp.empty.cta")}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-xs)]">
            {threads.map((th) => (
              <li
                key={th.id}
                className="border-b border-[var(--allonce-line)] last:border-b-0"
              >
                <Link
                  href={`/app/whatsapp/${th.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[var(--bg-sunken)]"
                >
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
                    style={{ backgroundColor: "var(--ao-accent)" }}
                  >
                    {initialsOf(th.contact_name, th.contact_phone)}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                        {th.contact_name?.trim() || th.contact_phone}
                      </span>
                      {th.matched_entity === "hotel_contact" &&
                        th.matched_entity_id != null && (
                          <span
                            className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--bg-sunken)] px-2 text-[10px] font-medium tracking-wider text-[var(--ink-700)]"
                            title={`hotel #${th.matched_entity_id}`}
                          >
                            {t("whatsapp.matched.hotel")}
                          </span>
                        )}
                      {th.matched_entity === "order_client" &&
                        th.matched_entity_id != null && (
                          <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--bg-sunken)] px-2 text-[10px] font-medium tracking-wider text-[var(--ink-700)]">
                            {t("whatsapp.matched.order")} #
                            {th.matched_entity_id}
                          </span>
                        )}
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[var(--ink-400)]">
                        {relativeTime(th.last_message_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="truncate text-[13px] text-[var(--ink-500)]">
                        {th.last_message_preview ?? ""}
                      </p>
                      {(th.unread_count ?? 0) > 0 && (
                        <span
                          className="ml-auto inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold text-white"
                          style={{ backgroundColor: "var(--ao-accent)" }}
                          aria-label={t("whatsapp.unread")}
                        >
                          {th.unread_count}
                        </span>
                      )}
                    </div>
                    {th.contact_name && (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink-400)]">
                        {th.contact_phone}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
