import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { SiteSettingsForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site settings" };

export default async function SiteSettingsPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("site_settings")
    .select(
      "page_transitions, reveal_animations, caption_mode, lightbox_captions, calculator_enabled",
    )
    .eq("id", 1)
    .maybeSingle();

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Site settings" }]}
      chatScope={{ level: "tool", tool: "site-settings" }}
      chatScopeLabel="Site settings"
    >
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Site settings
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            Global switches for the public site&apos;s motion and captions.
            <code>GET /api/studio</code> exposes these under{" "}
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
          }}
        />
      </div>
    </AppShell>
  );
}
