import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/app/lib/goga/leads";
import { Kanban, type CardData } from "./_kanban";
import { LeadsSearch } from "./_search";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function LeadsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const sb = gogaAdmin();
  let select = sb
    .from("leads")
    .select("id, name, email, message, source, stage, created_at, shoot_date")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (query) {
    const like = `%${query.replace(/[%_]/g, " ")}%`;
    select = select.or(
      `name.ilike.${like},email.ilike.${like},phone.ilike.${like},message.ilike.${like}`,
    );
  }

  const { data } = await select;

  const cards: CardData[] = (data ?? []).map((l) => ({
    id: l.id,
    name: l.name || "Anonymous",
    email: l.email || "",
    snippet: (l.message ?? "").slice(0, 140),
    source: l.source,
    stage: l.stage,
    createdAt: l.created_at,
    shootDate: l.shoot_date,
  }));

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Leads" }]}
      chatScope={{ level: "tool", tool: "leads" }}
      chatScopeLabel="Leads"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Leads
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              Pipeline · {cards.length} {query ? "matching" : "active"}
            </p>
          </div>
          <p className="text-[12px] text-[var(--ink-500)]">
            Drag a card between columns to advance the lead.
          </p>
        </header>

        <LeadsSearch initial={query} />

        <Kanban
          stages={LEAD_STAGES}
          labels={LEAD_STAGE_LABELS}
          initial={cards}
        />
      </div>
    </AppShell>
  );
}
