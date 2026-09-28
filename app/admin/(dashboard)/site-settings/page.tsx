import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { SiteSettingsForm } from "./_form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site settings" };

export default async function SiteSettingsPage() {
  const tr = await getServerTr();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("site_settings")
    .select(
      "page_transitions, reveal_animations, caption_mode, lightbox_captions, calculator_enabled, faq_photos",
    )
    .eq("id", 1)
    .maybeSingle();

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Site settings", "საიტის პარამეტრები") },
      ]}
      chatScope={{ level: "tool", tool: "site-settings" }}
      chatScopeLabel={tr("Site settings", "საიტის პარამეტრები")}
    >
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Site settings", "საიტის პარამეტრები")}
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            {tr(
              "Global switches for the public site's motion and captions.",
              "საჯარო საიტის ანიმაციისა და წარწერების გლობალური გადამრთველები.",
            )}{" "}
            <code>GET /api/studio</code>{" "}
            {tr("exposes these under", "აჩვენებს ამათ ველში")}{" "}
            <code>settings</code>.
          </p>
        </header>

        <SiteSettingsForm
          initial={{
            page_transitions: data?.page_transitions ?? true,
            reveal_animations: data?.reveal_animations ?? true,
            caption_mode:
              (data?.caption_mode as "cursor" | "bottom" | "off") ?? "cursor",
            lightbox_captions: data?.lightbox_captions ?? true,
            calculator_enabled: data?.calculator_enabled ?? true,
            faq_photos: data?.faq_photos ?? true,
          }}
        />
      </div>
    </AppShell>
  );
}
