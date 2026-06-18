// app/app/projects/albums/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { listAlbums } from "@/app/lib/goga/portfolio-albums";
import { saveAlbum } from "@/app/lib/goga/actions-portfolio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio albums" };

export default async function AlbumsPage() {
  const albums = await listAlbums();
  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Projects", href: "/app/projects" },
        { label: "Albums" },
      ]}
      chatScope={{ level: "tool", tool: "projects" }}
      chatScopeLabel="Projects"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
          Portfolio albums
        </h1>
        <p className="mb-4 text-[13px] text-[var(--ink-500)]">
          The fixed Prowed album set. Rename (KA/EN) or reorder; assign projects
          to albums from each project&apos;s edit page.
        </p>
        <ul className="space-y-1">
          {albums.map((a) => (
            <li key={a.id}>
              <form
                action={saveAlbum.bind(null, a.id)}
                className="flex flex-wrap items-end gap-2 border-b border-black/5 py-2"
              >
                <span className="w-32 text-xs text-neutral-400">{a.slug}</span>
                <label className="text-xs">
                  EN
                  <input
                    name="name_en"
                    defaultValue={a.name_en}
                    className="ml-1 rounded border border-black/10 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  KA
                  <input
                    name="name_ka"
                    defaultValue={a.name_ka}
                    className="ml-1 rounded border border-black/10 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  #
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={a.sort_order}
                    className="ml-1 w-16 rounded border border-black/10 px-2 py-1 text-sm"
                  />
                </label>
                <button className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
