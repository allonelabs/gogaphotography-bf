import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

function getPages(tr: (en: string, ka: string) => string) {
  return [
    {
      slug: "about",
      label: tr("About", "ჩვენ შესახებ"),
      hint: tr(
        "Long-form bio shown on /about-me.",
        "დეტალური ბიოგრაფია გვერდზე /about-me.",
      ),
    },
    {
      slug: "services",
      label: tr("Services intro", "სერვისების შესავალი"),
      hint: tr(
        "Text above the service tiles on /services.",
        "ტექსტი სერვისების ბლოკების ზემოთ გვერდზე /services.",
      ),
    },
    {
      slug: "faq",
      label: tr("FAQ", "ხშირი კითხვები"),
      hint: tr(
        "Frequently asked questions copy.",
        "ხშირად დასმული კითხვების ტექსტი.",
      ),
    },
    {
      slug: "photobook",
      label: tr("Photobook / Magazine", "ფოტოწიგნი / ჟურნალი"),
      hint: tr(
        "Content for /photobook-and-magazine — replaces the coming-soon teaser once filled. Add photos via an album named photobook.",
        "შინაარსი გვერდისთვის /photobook-and-magazine — ცვლის „მალე“ წარწერას შევსების შემდეგ. ფოტოების დამატება ხდება ალბომით photobook.",
      ),
    },
    {
      slug: "privacy",
      label: tr("Privacy policy", "კონფიდენციალურობის პოლიტიკა"),
      hint: tr(
        "Shown on /privacy. Start a section with \"## \" and a list item with \"- \".",
        "ჩანს გვერდზე /privacy. სექცია იწყება „## “-ით, სიის პუნქტი — „- “-ით.",
      ),
    },
  ] as const;
}

export default async function PagesIndex() {
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
  const PAGES = getPages(tr);
  const sb = gogaAdmin();
  const { data } = await sb.from("pages").select("slug, title_en, updated_at");
  const bySlug = new Map((data ?? []).map((p) => [p.slug, p] as const));

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Pages", "გვერდები") },
      ]}
      chatScope={{ level: "tool", tool: "pages" }}
      chatScopeLabel={tr("Pages", "გვერდები")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Pages", "გვერდები")}
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr("Long-form copy", "დეტალური ტექსტები")}
          </p>
        </header>

        <ul className="space-y-2">
          {PAGES.map((p) => {
            const row = bySlug.get(p.slug);
            return (
              <li
                key={p.slug}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <Link
                  href={`/admin/pages/${p.slug}`}
                  className="block px-5 py-4"
                >
                  <div className="text-[14px] font-medium text-[var(--ink-900)]">
                    {p.label}
                  </div>
                  <div className="text-[12px] text-[var(--ink-500)]">
                    {p.hint}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--ink-400)]">
                    {row?.updated_at
                      ? `${tr("Last edited", "ბოლოს ჩასწორდა")} ${new Date(row.updated_at).toLocaleString(dateLocale)}`
                      : tr("Not edited yet", "ჯერ არ ჩასწორებულა")}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
