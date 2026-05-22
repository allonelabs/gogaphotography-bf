import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { PageForm } from "./_form";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  about: "About",
  services: "Services intro",
  faq: "FAQ",
};

type Props = { params: Promise<{ slug: string }> };

export default async function EditPagePage({ params }: Props) {
  const { slug } = await params;
  if (!["about", "services", "faq"].includes(slug)) notFound();

  const sb = gogaAdmin();
  const { data } = await sb
    .from("pages")
    .select("title_en, title_ka, body_en, body_ka")
    .eq("slug", slug)
    .maybeSingle();

  return (
    <AppShell
      breadcrumb={[
        { label: "Site" },
        { label: "Pages", href: "/app/pages" },
        { label: LABELS[slug] ?? slug },
      ]}
      chatScope={{ level: "tool", tool: "pages" }}
      chatScopeLabel={LABELS[slug] ?? slug}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {LABELS[slug] ?? slug}
          </h1>
          <Link
            href="/app/pages"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>

        <p className="mb-5 max-w-prose text-[13px] text-[var(--ink-500)]">
          Markdown is supported. Leave a translation blank to fall back to the
          English version.
        </p>

        <PageForm
          slug={slug}
          initial={{
            title_en: data?.title_en ?? "",
            title_ka: data?.title_ka ?? "",
            body_en: data?.body_en ?? "",
            body_ka: data?.body_ka ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
