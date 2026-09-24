import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ContractTemplateForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contract template" };

const PLACEHOLDERS = [
  "client_name",
  "client_email",
  "client_phone",
  "shoot_date",
  "shoot_time",
  "location",
  "package",
  "duration_hours",
  "addons",
  "extra_hours",
  "total",
  "deposit",
  "balance",
  "currency",
  "today",
];

export default async function ContractTemplatePage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("contract_templates")
    .select("body_en, body_ka, body_ru")
    .eq("id", 1)
    .maybeSingle();

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Contract template" }]}
      chatScope={{ level: "tool", tool: "contract-template" }}
      chatScopeLabel="Contract template"
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Contract template
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            The default body used every time a new contract is generated from a
            booking (EN/KA/RU). Existing contracts aren&apos;t retroactively
            changed.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Placeholders
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <code
                key={p}
                className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-[var(--ink-700)]"
              >
                {"{{" + p + "}}"}
              </code>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[var(--ink-500)]">
            Unknown placeholders render as an empty string.
          </p>
        </section>

        <ContractTemplateForm
          initial={{
            body_en: data?.body_en ?? "",
            body_ka: data?.body_ka ?? "",
            body_ru: data?.body_ru ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
