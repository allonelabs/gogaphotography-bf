/**
 * WhatsApp Business integration settings.
 *
 * Server component for the breadcrumb/AppShell wrapper + role gate.
 * The actual form is a client component (`_form.tsx`) — it owns its own
 * state and talks to `/api/integrations/whatsapp` for read/write.
 *
 * Role gate: only admin or manager. Lower roles get notFound() (same
 * UX as the per-route permission gate elsewhere — don't leak existence).
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { getSessionAuthz } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { WhatsAppIntegrationForm } from "./_form";

export const dynamic = "force-dynamic";

async function resolveWebhookUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3003";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/webhooks/whatsapp`;
}

export default async function WhatsAppIntegrationPage() {
  const { role } = await getSessionAuthz();
  if (role !== "admin" && role !== "manager") notFound();

  const t = await getServerT();
  const webhookUrl = await resolveWebhookUrl();

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.integrations"), href: "/app/integrations" },
        { label: t("whatsapp.integrations.title") },
      ]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel="WhatsApp Setup"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {t("whatsapp.integrations.title")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-500)]">
            {t("whatsapp.integrations.intro")}
          </p>
        </div>

        <WhatsAppIntegrationForm webhookUrl={webhookUrl} />
      </div>
    </AppShell>
  );
}
