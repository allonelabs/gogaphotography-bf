import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { StudioForm, type StudioRow } from "./_form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio info" };

export default async function StudioPage() {
  const tr = await getServerTr();
  const sb = gogaAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("studio_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle()) as { data: StudioRow | null };

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Studio info", "სტუდიის ინფო") },
      ]}
      chatScope={{ level: "tool", tool: "studio" }}
      chatScopeLabel={tr("Studio info", "სტუდიის ინფო")}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Studio info", "სტუდიის ინფო")}
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr(
              "Contact details, address & social links",
              "საკონტაქტო დეტალები, მისამართი და სოც. ბმულები",
            )}
          </p>
        </header>

        <p className="max-w-prose text-[13px] text-[var(--ink-500)]">
          {tr(
            'These values feed the public contact page, the menu links, the structured data Google + LLMs see, and the "Contact" block in the auto-generated llms.txt. Change them here and they update everywhere.',
            'ეს მონაცემები კვებავს საჯარო საკონტაქტო გვერდს, მენიუს ბმულებს, სტრუქტურირებულ მონაცემებს, რომელსაც Google-ი და LLM-ები ხედავენ, და „Contact" ბლოკს ავტომატურად გენერირებულ llms.txt-ში. შეცვალეთ აქ და ყველგან განახლდება.',
          )}
        </p>

        <StudioForm initial={data} />
      </div>
    </AppShell>
  );
}
