import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { PackageForm } from "../_form";
import { DeleteButton } from "./_delete";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditPackagePage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  const { data } = await sb
    .from("packages")
    .select(
      "id, slug, name_en, name_ka, short_desc_en, short_desc_ka, deliverables_en, deliverables_ka, base_price_cents, currency, duration_hours, deposit_pct, published",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Packages", href: "/app/packages" },
        { label: data.name_en },
      ]}
      chatScope={{ level: "tool", tool: "packages" }}
      chatScopeLabel={data.name_en}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {data.name_en}
          </h1>
          <Link
            href="/app/packages"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>

        <PackageForm initial={data} />

        <section className="mt-12 border-t border-black/5 pt-6">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-rose-700">
            Danger zone
          </h2>
          <DeleteButton id={data.id} name={data.name_en} />
        </section>
      </div>
    </AppShell>
  );
}
