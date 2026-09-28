import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { AddonActions } from "./_actions";
import { formatMoney } from "@/app/lib/goga/money";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add-ons" };

export default async function AddonsPage() {
  const tr = await getServerTr();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("addons")
    .select("id, slug, name_en, price_cents, published, sort_order")
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Catalog", "კატალოგი") },
        { label: tr("Add-ons", "დამატებები") },
      ]}
      chatScope={{ level: "tool", tool: "addons" }}
      chatScopeLabel={tr("Add-ons", "დამატებები")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {tr("Add-ons", "დამატებები")}
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {tr(`${items.length} total`, `სულ ${items.length}`)}
            </p>
          </div>
          <Link
            href="/admin/addons/new"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            {tr("New add-on", "ახალი დამატება")}
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="mb-3 text-[14px] text-[var(--ink-500)]">
              {tr(
                "No add-ons yet — create one so clients can attach it in the calculator.",
                "დამატებები ჯერ არ არის — შექმენით ერთი, რომ კლიენტებმა შეძლონ მისი დამატება კალკულატორში.",
              )}
            </p>
            <Link
              href="/admin/addons/new"
              className="inline-block rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
            >
              {tr("Create the first add-on", "პირველი დამატების შექმნა")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
              >
                <div className="grid grid-cols-[1fr_auto] items-center gap-y-2 gap-x-3 px-5 py-4 sm:grid-cols-[1fr_120px_70px_auto_auto_auto]">
                  <Link
                    href={`/admin/addons/${a.id}`}
                    className="min-w-0 hover:underline"
                  >
                    <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                      {a.name_en}
                    </div>
                    <div className="truncate text-[12px] text-[var(--ink-500)]">
                      /{a.slug}
                    </div>
                  </Link>
                  <span className="text-[15px] font-medium tabular-nums text-[var(--ink-900)]">
                    {formatMoney(a.price_cents, "GEL")}
                  </span>
                  <span
                    className={`justify-self-center rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                      a.published
                        ? "bg-slate-900 text-slate-900 font-medium"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {a.published
                      ? tr("Live", "აქტიური")
                      : tr("Draft", "მონახაზი")}
                  </span>
                  <AddonActions
                    id={a.id}
                    title={a.name_en}
                    published={a.published}
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
