import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ImageUploader } from "@/app/app/_components/ImageUploader";
import { HeroForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage hero" };

export default async function HeroPage() {
  const sb = gogaAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("hero")
    .select(
      "headline_en, headline_ka, subtitle_en, subtitle_ka, hero_image_path, portrait_image_path",
    )
    .eq("id", 1)
    .single()) as {
    data: {
      headline_en: string | null;
      headline_ka: string | null;
      subtitle_en: string | null;
      subtitle_ka: string | null;
      hero_image_path: string | null;
      portrait_image_path: string | null;
    } | null;
  };

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
            First impression on the home page
          </p>
        </header>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-4 text-[14px] font-medium text-[var(--ink-900)]">
            Visuals
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageUploader
              surface="hero.hero_image"
              label="Hero background"
              hint="Full-bleed image behind the headline. Wide aspect — landscape 16:9."
              currentPath={data?.hero_image_path ?? null}
              aspect="16/9"
            />
            <ImageUploader
              surface="hero.portrait_image"
              label="Studio portrait"
              hint="Optional portrait used on About / contact. Tall aspect — 4:5."
              currentPath={data?.portrait_image_path ?? null}
              aspect="4/5"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-2 text-[14px] font-medium text-[var(--ink-900)]">
            Copy
          </h2>
          <p className="mb-4 text-[12px] text-[var(--ink-500)]">
            Keep the headline short — it's set in the large display font.
          </p>
          <HeroForm initial={data ?? null} />
        </section>
      </div>
    </AppShell>
  );
}
