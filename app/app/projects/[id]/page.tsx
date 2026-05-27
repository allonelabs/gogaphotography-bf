import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ProjectForm } from "./_form";
import { Gallery } from "./_gallery";
import { DeleteProjectButton } from "./_delete";

export const dynamic = "force-dynamic";

function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!base) return null;
  return `${base}/storage/v1/object/public/projects/${path.replace(/^\/+/, "")}`;
}

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();

  const [{ data: project }, { data: images }] = await Promise.all([
    sb
      .from("projects")
      .select(
        "id, slug, title_en, title_ka, location_en, location_ka, description_en, description_ka, hero_image_path, published",
      )
      .eq("id", id)
      .single(),
    sb
      .from("project_images")
      .select("id, image_path, caption, alt_text, sort_order")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!project) notFound();

  const items = (images ?? []).map((i) => ({
    id: i.id,
    imagePath: i.image_path,
    url: publicImageUrl(i.image_path) ?? "",
    caption: i.caption ?? "",
    altText: i.alt_text ?? "",
    sortOrder: i.sort_order,
  }));

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Projects", href: "/app/projects" },
        { label: project.title_en },
      ]}
      chatScope={{ level: "tool", tool: "projects" }}
      chatScopeLabel={project.title_en}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {project.title_en}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/project/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              View ↗
            </Link>
            <Link
              href="/app/projects"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              ← back
            </Link>
          </div>
        </header>

        <ProjectForm initial={project} />

        <section className="mt-8">
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[14px] font-medium text-[var(--ink-900)]">
              Gallery
            </h2>
            <p className="text-[11px] text-[var(--ink-500)]">
              Drop images to upload. Drag rows to reorder. ⭐ = hero.
            </p>
          </header>
          <Gallery
            projectId={project.id}
            heroImagePath={project.hero_image_path}
            initial={items}
          />
        </section>

        <section className="mt-12 border-t border-black/5 pt-6">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-700">
            Danger zone
          </h2>
          <DeleteProjectButton id={project.id} title={project.title_en} />
        </section>
      </div>
    </AppShell>
  );
}
