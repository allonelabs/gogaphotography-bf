import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  STAGE_TONE,
} from "@/app/lib/goga/leads";
import { LeadDetail } from "./_detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();

  const [{ data: lead }, { data: events }, { data: packages }] =
    await Promise.all([
      sb
        .from("leads")
        .select(
          "id, name, email, phone, message, source, stage, locale, ip, shoot_date, notes, created_at, package_id",
        )
        .eq("id", id)
        .single(),
      sb
        .from("lead_events")
        .select("id, kind, payload, actor, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
      sb
        .from("packages")
        .select("id, name_en, base_price_cents, currency")
        .eq("published", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (!lead) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Pipeline" },
        { label: "Leads", href: "/app/leads" },
        { label: lead.name ?? "Anonymous" },
      ]}
      chatScope={{ level: "tool", tool: "leads" }}
      chatScopeLabel={lead.name ?? "Lead"}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {lead.name ?? "Anonymous"}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">
              {lead.email ?? "(no email)"}
              {lead.phone ? ` · ${lead.phone}` : ""}
              {lead.source ? ` · ${lead.source}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] ${STAGE_TONE[lead.stage]}`}
            >
              {LEAD_STAGE_LABELS[lead.stage]}
            </span>
            <Link
              href="/app/leads"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              ← back
            </Link>
          </div>
        </header>

        <LeadDetail
          lead={{
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            message: lead.message,
            source: lead.source,
            stage: lead.stage,
            shootDate: lead.shoot_date,
            notes: lead.notes,
            createdAt: lead.created_at,
            packageId: lead.package_id,
          }}
          stages={LEAD_STAGES}
          labels={LEAD_STAGE_LABELS}
          events={(events ?? []).map((e) => ({
            id: e.id,
            kind: e.kind,
            createdAt: e.created_at,
          }))}
          packages={(packages ?? []).map((p) => ({
            id: p.id,
            name: p.name_en,
            priceCents: p.base_price_cents,
            currency: p.currency,
          }))}
        />
      </div>
    </AppShell>
  );
}
