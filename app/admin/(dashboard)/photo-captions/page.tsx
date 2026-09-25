import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { safeLike } from "@/app/lib/goga/safe-like";
import { ListSearch } from "@/app/admin/(dashboard)/_components/ListSearch";
import {
  Pagination,
  parsePage,
} from "@/app/admin/(dashboard)/_components/Pagination";
import { ProjectFilter } from "./_project-filter";
import { CaptionsTable } from "./_table";

const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";
export const metadata = { title: "Photo captions" };

function publicImageUrl(path: string): string {
  const base = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  return `${base}/storage/v1/object/public/projects/${path.replace(/^\/+/, "")}`;
}

type Props = {
  searchParams: Promise<{ project?: string; q?: string; page?: string }>;
};

export default async function PhotoCaptionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sb = gogaAdmin();
  const { page, from, to } = parsePage(sp.page, PAGE_SIZE);

  const { data: projects } = await sb
    .from("projects")
    .select("id, title_en, slug")
    .order("title_en", { ascending: true });

  let q = sb
    .from("project_images")
    .select(
      "id, project_id, image_path, caption, caption_ka, caption_ru, alt_text, sort_order",
      { count: "exact" },
    )
    .order("project_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (sp.project) q = q.eq("project_id", sp.project);
  if (sp.q?.trim()) {
    const term = safeLike(sp.q.trim());
    q = q.or(
      `caption.ilike.${term},caption_ka.ilike.${term},caption_ru.ilike.${term},alt_text.ilike.${term},image_path.ilike.${term}`,
    );
  }
  const { data, count } = await q.range(from, to);

  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));
  const items = (data ?? []).map((img) => ({
    id: img.id,
    projectId: img.project_id,
    projectTitle:
      projectById.get(img.project_id)?.title_en ?? "(deleted project)",
    thumbUrl: publicImageUrl(img.image_path),
    caption: img.caption ?? "",
    captionKa: img.caption_ka ?? "",
    captionRu: img.caption_ru ?? "",
    altText: img.alt_text ?? "",
  }));

  return (
    <AppShell
      breadcrumb={[{ label: "Site" }, { label: "Photo captions" }]}
      chatScope={{ level: "tool", tool: "photo-captions" }}
      chatScopeLabel="Photo captions"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Photo captions
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {count ?? items.length} photos across all projects
          </p>
        </header>

        <ListSearch placeholder="Search captions, alt text, file name…" />
        <ProjectFilter
          projects={(projects ?? []).map((p) => ({
            id: p.id,
            title: p.title_en,
          }))}
          active={sp.project ?? null}
        />

        <CaptionsTable items={items} />

        <Pagination
          basePath="/admin/photo-captions"
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count ?? items.length}
          searchParams={{ project: sp.project, q: sp.q }}
        />
      </div>
    </AppShell>
  );
}
