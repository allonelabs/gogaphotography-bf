import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { HeroForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage hero" };

export default async function HeroPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("hero")
    .select("headline_en, headline_ka, subtitle_en, subtitle_ka")
    .eq("id", 1)
    .single();

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Homepage hero" }]}
      chatScope={{ level: "tool", tool: "hero" }}
      chatScopeLabel="Homepage hero"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <header className="mb-1">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Homepage hero
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Headline + subtitle on the home page
          </p>
        </header>

        <p className="max-w-prose text-[13px] text-[var(--ink-500)]">
          These two lines greet every visitor on the home page. Keep the
          headline short — it&rsquo;s set in the large display font. The
          subtitle sits one line below.
        </p>

        <HeroForm initial={data ?? null} />
      </div>
    </AppShell>
  );
}
