import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ServiceActions } from "./_actions";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("services")
    .select("id, title_en, price, published, sort_order")
    .order("sort_order", { ascending: true });
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Catalog" }, { label: "Services" }]}
      chatScope={{ level: "tool", tool: "services" }}
      chatScopeLabel="Services"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Services
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {items.length} total
            </p>
          </div>
          <Link
            href="/app/services/new"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            New service
          </Link>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<Icon name="grid" />}
            title="No services yet"
            description="Services show up on the public /services page once published. Add your first one to publish it."
            primary={{ label: "New service", href: "/app/services/new" }}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <div className="grid grid-cols-[1fr_140px_70px_auto_auto_auto] items-center gap-3 px-5 py-4">
                  <Link
                    href={`/app/services/${s.id}`}
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
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {s.published ? "Live" : "Draft"}
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
