import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { AddonForm } from "../_form";
import { DeleteButton } from "./_delete";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditAddonPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  const { data } = await sb
    .from("addons")
    .select(
      "id, slug, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price_cents, sort_order, published",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Add-ons", href: "/admin/addons" },
        { label: data.name_en },
      ]}
      chatScope={{ level: "tool", tool: "addons" }}
      chatScopeLabel={data.name_en}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {data.name_en}
          </h1>
          <Link
            href="/admin/addons"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>

        <AddonForm initial={data} />

        <section className="mt-12 border-t border-black/5 pt-6">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-700">
            Danger zone
          </h2>
          <DeleteButton id={data.id} name={data.name_en} />
        </section>
      </div>
    </AppShell>
  );
}
