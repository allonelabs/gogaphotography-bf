import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { HeroForm } from "./_form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage hero" };

export default async function HeroPage() {
  const tr = await getServerTr();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("hero")
    .select(
      "headline_en, headline_ka, headline_ru, subtitle_en, subtitle_ka, subtitle_ru",
    )
    .eq("id", 1)
    .single();

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Homepage hero", "მთავარი გვერდის ჰერო") },
      ]}
      chatScope={{ level: "tool", tool: "hero" }}
      chatScopeLabel={tr("Homepage hero", "მთავარი გვერდის ჰერო")}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <header className="mb-1">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Homepage hero", "მთავარი გვერდის ჰერო")}
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr(
              "Headline + subtitle on the home page",
              "სათაური + ქვესათაური მთავარ გვერდზე",
            )}
          </p>
        </header>

        <p className="max-w-prose text-[13px] text-[var(--ink-500)]">
          {tr(
            "These two lines greet every visitor on the home page. Keep the headline short — it's set in the large display font. The subtitle sits one line below.",
            "ეს ორი ხაზი ესალმება ყოველ სტუმარს მთავარ გვერდზე. სათაური მოკლედ დატოვეთ — ის დიდი დისფლეი ფონტით არის დაყენებული. ქვესათაური ერთი ხაზით ქვემოთაა.",
          )}
        </p>

        <HeroForm initial={data ?? null} />
      </div>
    </AppShell>
  );
}
