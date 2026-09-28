import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ServiceActions } from "./_actions";
import {
  EmptyState,
  Icon,
} from "@/app/admin/(dashboard)/_components/EmptyState";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const tr = await getServerTr();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("services")
    .select("id, title_en, price, published, sort_order")
    .order("sort_order", { ascending: true });
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Catalog", "კატალოგი") },
        { label: tr("Services", "სერვისები") },
      ]}
      chatScope={{ level: "tool", tool: "services" }}
      chatScopeLabel={tr("Services", "სერვისები")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {tr("Services", "სერვისები")}
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {tr(`${items.length} total`, `სულ ${items.length}`)}
            </p>
          </div>
          <Link
            href="/admin/services/new"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            {tr("New service", "ახალი სერვისი")}
          </Link>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<Icon name="grid" />}
            title={tr("No services yet", "სერვისები ჯერ არ არის")}
            description={tr(
              "Services show up on the public /services page once published. Add your first one to publish it.",
              "სერვისები საჯარო /services გვერდზე გამოჩნდება გამოქვეყნების შემდეგ. დაამატეთ პირველი მისი გამოსაქვეყნებლად.",
            )}
            primary={{
              label: tr("New service", "ახალი სერვისი"),
              href: "/admin/services/new",
            }}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <div className="grid grid-cols-[1fr_auto] items-center gap-y-2 gap-x-3 px-5 py-4 sm:grid-cols-[1fr_140px_70px_auto_auto_auto]">
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="text-[14px] font-medium text-[var(--ink-900)] hover:underline"
                  >
                    {s.title_en}
                  </Link>
                  <span className="text-[13px] text-[var(--ink-500)]">
                    {s.price ?? ""}
                  </span>
                  <span
                    className={`justify-self-center rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      s.published
                        ? "bg-slate-900 text-slate-900 font-medium"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {s.published
                      ? tr("Live", "აქტიური")
                      : tr("Draft", "მონახაზი")}
                  </span>
                  <ServiceActions
                    id={s.id}
                    title={s.title_en}
                    published={s.published}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
