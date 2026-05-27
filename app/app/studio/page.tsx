import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { StudioForm, type StudioRow } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio info" };

export default async function StudioPage() {
  const sb = gogaAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("studio_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle()) as { data: StudioRow | null };

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Studio info" }]}
      chatScope={{ level: "tool", tool: "studio" }}
      chatScopeLabel="Studio info"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Studio info
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Contact details, address & social links
          </p>
        </header>

        <p className="max-w-prose text-[13px] text-[var(--ink-500)]">
          These values feed the public contact page, the menu links, the
          structured data Google + LLMs see, and the &ldquo;Contact&rdquo; block
          in the auto-generated llms.txt. Change them here and they update
          everywhere.
        </p>

        <StudioForm initial={data} />
      </div>
    </AppShell>
  );
}
