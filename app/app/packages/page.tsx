import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { PackageActions } from "./_actions";
import { EmptyState, Icon } from "@/app/app/_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packages" };

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

export default async function PackagesPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("packages")
    .select(
      "id, slug, name_en, base_price_cents, currency, duration_hours, published, sort_order",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Catalog" }, { label: "Packages" }]}
      chatScope={{ level: "tool", tool: "packages" }}
      chatScopeLabel="Packages"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Packages
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {items.length} total
            </p>
          </div>
          <Link
            href="/app/packages/new"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            New package
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="mb-3 text-[14px] text-[var(--ink-500)]">
              No packages yet — add your first one to start taking bookings.
            </p>
            <Link
              href="/app/packages/new"
              className="inline-block rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
            >
              Create the first package
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <div className="grid grid-cols-[1fr_120px_70px_auto_auto_auto] items-center gap-3 px-5 py-4">
                  <Link
                    href={`/app/packages/${p.id}`}
                    className="min-w-0 hover:underline"
                  >
                    <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                      {p.name_en}
                    </div>
                    <div className="truncate text-[12px] text-[var(--ink-500)]">
                      /{p.slug}
                      {p.duration_hours ? ` · ${p.duration_hours}h` : ""}
                    </div>
                  </Link>
                  <span className="text-[15px] font-medium tabular-nums text-[var(--ink-900)]">
                    {fmtMoney(p.base_price_cents, p.currency)}
                  </span>
                  <span
                    className={`justify-self-center rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      p.published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p.published ? "Live" : "Draft"}
                  </span>
                  <PackageActions
                    id={p.id}
                    title={p.name_en}
                    published={p.published}
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
