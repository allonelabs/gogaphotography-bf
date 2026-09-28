import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { isKnownPageSlug } from "@/app/lib/goga/page-slugs";
import { PageForm } from "./_form";
import { ImageUploader } from "@/app/admin/(dashboard)/_components/ImageUploader";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";

function getLabels(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    about: tr("About", "ჩვენ შესახებ"),
    services: tr("Services intro", "სერვისების შესავალი"),
    faq: tr("FAQ", "ხშირი კითხვები"),
    photobook: tr("Photobook", "ფოტოწიგნი"),
    privacy: tr("Privacy policy", "კონფიდენციალურობის პოლიტიკა"),
  };
}

type Props = { params: Promise<{ slug: string }> };

export default async function EditPagePage({ params }: Props) {
  const { slug } = await params;
  if (!isKnownPageSlug(slug)) notFound();
  const tr = await getServerTr();
  const LABELS = getLabels(tr);

  const sb = gogaAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("pages")
    .select(
      "title_en, title_ka, title_ru, body_en, body_ka, body_ru, og_image_path",
    )
    .eq("slug", slug)
    .maybeSingle()) as {
    data: {
      title_en: string | null;
      title_ka: string | null;

      title_ru: string | null;
      body_en: string | null;
      body_ka: string | null;

      body_ru: string | null;
      og_image_path: string | null;
    } | null;
  };

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Pages", "გვერდები"), href: "/admin/pages" },
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
            href="/admin/pages"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            {tr("← back", "← უკან")}
          </Link>
        </header>

        <p className="mb-5 max-w-prose text-[13px] text-[var(--ink-500)]">
          {tr(
            "Markdown is supported. Leave a translation blank to fall back to the English version.",
            "მარკდაუნი მხარდაჭერილია. თარგმანის ველის ცარიელად დატოვება გამოიყენებს ინგლისურ ვერსიას.",
          )}
        </p>

        <section className="mb-5 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <ImageUploader
            surface="page.og_image"
            rowId={slug}
            label={tr(
              "Share image (Open Graph)",
              "გასაზიარებელი სურათი (Open Graph)",
            )}
            hint={tr(
              "Shown when this page is shared on social / chat apps. Landscape 1200×630, JPG/PNG.",
              "გამოჩნდება გვერდის გაზიარებისას სოც./მესენჯერ აპებში. ჰორიზონტალური 1200×630, JPG/PNG.",
            )}
            currentPath={data?.og_image_path ?? null}
            aspect="1200/630"
          />
        </section>

        <PageForm
          slug={slug}
          initial={{
            title_en: data?.title_en ?? "",
            title_ka: data?.title_ka ?? "",

            title_ru: data?.title_ru ?? "",
            body_en: data?.body_en ?? "",
            body_ka: data?.body_ka ?? "",

            body_ru: data?.body_ru ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
