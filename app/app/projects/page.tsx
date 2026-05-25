import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ProjectsList } from "./_list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!base) return null;
  return `${base}/storage/v1/object/public/projects/${path.replace(/^\/+/, "")}`;
}

export default async function ProjectsPage() {
  const sb = gogaAdmin();
  const { data } = await sb
    .from("projects")
    .select(
      "id, slug, title_en, location_en, hero_image_path, published, sort_order",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <AppShell
      breadcrumb={[{ label: "Catalog" }, { label: "Projects" }]}
      chatScope={{ level: "tool", tool: "projects" }}
      chatScopeLabel="Projects"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Projects
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {items.length} total · drag to reorder
            </p>
          </div>
          <Link
            href="/app/projects/new"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            New project
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="mb-3 text-[14px] text-[var(--ink-500)]">
              No projects yet — your first one will appear on the home grid as
              soon as you publish it.
            </p>
            <Link
              href="/app/projects/new"
              className="inline-block rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
            >
              Create the first project
            </Link>
          </div>
        ) : (
          <ProjectsList
            initial={items.map((p) => ({
              id: p.id,
              slug: p.slug,
              title_en: p.title_en,
              location_en: p.location_en,
              thumbUrl: publicImageUrl(p.hero_image_path),
              published: p.published,
            }))}
          />
        )}
      </div>
    </AppShell>
  );
}
