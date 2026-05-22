/**
 * Integrations index — lists configured + available third-party services
 * (WhatsApp Business + Stripe for now). Per-row status lights up when the
 * corresponding `org_integration` row exists and is enabled (WhatsApp) or
 * the Stripe envs are present (placeholder — Stripe per-org settings live
 * elsewhere today).
 *
 * Role gate: admin or manager only.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { getSessionAuthz } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { CreditCard, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadStatus(): Promise<{ whatsapp: boolean }> {
  const { client, orgId } = await createOrgScopedSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;
  const { data } = await sb
    .from("org_integration")
    .select("enabled, config")
    .eq("organization_id", orgId)
    .eq("kind", "whatsapp")
    .maybeSingle();
  return {
    whatsapp: !!data?.enabled && !!data?.config?.phone_number_id,
  };
}

export default async function IntegrationsIndexPage() {
  const { role } = await getSessionAuthz();
  if (role !== "admin" && role !== "manager") notFound();

  const t = await getServerT();
  const status = await loadStatus();

  const rows = [
    {
      key: "whatsapp",
      label: t("integrations.whatsapp.label"),
      desc: t("integrations.whatsapp.desc"),
      href: "/app/integrations/whatsapp",
      icon: <MessageCircle className="h-4 w-4" strokeWidth={1.75} />,
      connected: status.whatsapp,
    },
    {
      key: "stripe",
      label: t("integrations.stripe.label"),
      desc: t("integrations.stripe.desc"),
      href: "/app/billing",
      icon: <CreditCard className="h-4 w-4" strokeWidth={1.75} />,
      // No per-org row for Stripe yet — keep neutral so we don't lie.
      connected: false,
    },
  ];

  return (
    <AppShell
      breadcrumb={[{ label: t("nav.integrations") }]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel="Integrations"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {t("integrations.title")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-500)]">
            {t("integrations.subtitle")}
          </p>
        </div>

        <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-xs)]">
          {rows.map((row) => (
            <li
              key={row.key}
              className="border-b border-[var(--allonce-line)] last:border-b-0"
            >
              <Link
                href={row.href}
                className="flex items-center gap-4 px-4 py-4 transition hover:bg-[var(--bg-sunken)] sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-surface-alt)] text-[var(--ink-700)]">
                  {row.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium text-[var(--ink-900)]">
                      {row.label}
                    </span>
                    <span
                      className={`inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-medium tracking-wider ${
                        row.connected
                          ? "bg-emerald-100/70 text-emerald-900"
                          : "bg-[var(--bg-sunken)] text-[var(--ink-500)]"
                      }`}
                    >
                      {row.connected
                        ? t("integrations.status.connected")
                        : t("integrations.status.not_connected")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">
                    {row.desc}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] text-[var(--ink-400)]">
                  {t("integrations.configure")} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
