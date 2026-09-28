import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { ServiceForm } from "../_form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "New service" };

export default async function NewServicePage() {
  const tr = await getServerTr();
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Catalog", "კატალოგი") },
        { label: tr("Services", "სერვისები"), href: "/admin/services" },
        { label: tr("New", "ახალი") },
      ]}
      chatScope={{ level: "tool", tool: "services" }}
      chatScopeLabel={tr("New service", "ახალი სერვისი")}
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("New service", "ახალი სერვისი")}
          </h1>
          <Link
            href="/admin/services"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            {tr("← back", "← უკან")}
          </Link>
        </header>
        <ServiceForm />
      </div>
    </AppShell>
  );
}
