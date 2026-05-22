import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

const PAGES = [
  { slug: "about", label: "About", hint: "Long-form bio shown on /about-me." },
  {
    slug: "services",
    label: "Services intro",
    hint: "Text above the service tiles on /services.",
  },
  { slug: "faq", label: "FAQ", hint: "Frequently asked questions copy." },
] as const;

export default async function PagesIndex() {
  const sb = gogaAdmin();
  const { data } = await sb.from("pages").select("slug, title_en, updated_at");
  const bySlug = new Map((data ?? []).map((p) => [p.slug, p] as const));

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Pages" }]}
      chatScope={{ level: "tool", tool: "pages" }}
      chatScopeLabel="Pages"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Pages
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Long-form copy
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
                <Link href={`/app/pages/${p.slug}`} className="block px-5 py-4">
                  <div className="text-[14px] font-medium text-[var(--ink-900)]">
                    {p.label}
                  </div>
                  <div className="text-[12px] text-[var(--ink-500)]">
                    {p.hint}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--ink-400)]">
                    {row?.updated_at
                      ? `Last edited ${new Date(row.updated_at).toLocaleString()}`
                      : "Not edited yet"}
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
