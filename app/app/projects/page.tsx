import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";

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
              {items.length} total
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No projects yet — your first one will appear on the home grid as
              soon as you publish it.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => {
              const thumb = publicImageUrl(p.hero_image_path);
              return (
                <li
                  key={p.id}
                  className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
                >
                  <Link
                    href={`/app/projects/${p.id}`}
                    className="grid grid-cols-[64px_1fr_90px] items-center gap-4 px-4 py-3"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-14 w-14 rounded-lg bg-slate-100 object-cover"
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        —
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                        {p.title_en}
                      </div>
                      <div className="truncate text-[12px] text-[var(--ink-500)]">
                        {p.location_en ? `${p.location_en} · ` : ""}/{p.slug}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                        p.published
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.published ? "Live" : "Draft"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
