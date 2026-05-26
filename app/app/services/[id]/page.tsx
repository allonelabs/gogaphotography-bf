import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ServiceForm } from "../_form";
import { DeleteServiceButton } from "./_delete";
import { ImageUploader } from "@/app/app/_components/ImageUploader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

interface ServiceRow {
  id: string;
  title_en: string;
  title_ka: string | null;
  description_en: string | null;
  description_ka: string | null;
  price: string | null;
  published: boolean;
  hero_image_path: string | null;
}

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("services")
    .select(
      "id, title_en, title_ka, description_en, description_ka, price, published, hero_image_path",
    )
    .eq("id", id)
    .single()) as { data: ServiceRow | null };

  if (!data) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Services", href: "/app/services" },
        { label: data.title_en },
      ]}
      chatScope={{ level: "tool", tool: "services" }}
      chatScopeLabel={data.title_en}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {data.title_en}
          </h1>
          <Link
            href="/app/services"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>

        <section className="mb-5 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <ImageUploader
            surface="service.hero_image"
            rowId={data.id}
            label="Service hero image"
            hint="Used on the public /services page. Landscape 16:9."
            currentPath={data.hero_image_path}
            aspect="16/9"
          />
        </section>

        <ServiceForm initial={data} />

        <section className="mt-12 border-t border-black/5 pt-6">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-rose-700">
            Danger zone
          </h2>
          <DeleteServiceButton id={data.id} title={data.title_en} />
        </section>
      </div>
    </AppShell>
  );
}
