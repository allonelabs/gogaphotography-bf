import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { ProjectForm } from "../[id]/_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Projects", href: "/app/projects" },
        { label: "New" },
      ]}
      chatScope={{ level: "tool", tool: "projects" }}
      chatScopeLabel="New project"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              New project
            </h1>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">
              Create the project first, then add photos on the next screen.
            </p>
          </div>
          <Link
            href="/app/projects"
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← back
          </Link>
        </header>

        <ProjectForm />
      </div>
    </AppShell>
  );
}
