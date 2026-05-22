import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { ServiceForm } from "../_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New service" };

export default function NewServicePage() {
  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Services", href: "/app/services" },
        { label: "New" },
      ]}
      chatScope={{ level: "tool", tool: "services" }}
      chatScopeLabel="New service"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            New service
          </h1>
          <Link
            href="/app/services"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>
        <ServiceForm />
      </div>
    </AppShell>
  );
}
