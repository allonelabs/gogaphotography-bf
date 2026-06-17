// app/app/blog/taxonomy/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { listCategories, listTags } from "@/app/lib/goga/blog";
import {
  createCategory,
  deleteCategory,
  createTag,
  deleteTag,
} from "@/app/lib/goga/actions-blog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog taxonomy" };

export default async function TaxonomyPage() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  const field = "rounded border border-black/10 px-2 py-1 text-sm";
  return (
    <AppShell
      breadcrumb={[
        { label: "Content" },
        { label: "Blog", href: "/app/blog" },
        { label: "Taxonomy" },
      ]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel="Blog"
    >
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-6 sm:px-6 sm:py-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Categories</h2>
          <ul className="mb-4 space-y-1">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {c.name_ka || "—"} / {c.name_en || "—"}{" "}
                  <span className="text-neutral-400">({c.slug})</span>
                </span>
                <form action={deleteCategory.bind(null, c.id)}>
                  <button className="text-xs text-red-600 underline">
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form
            action={createCategory}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="text-xs">
              KA
              <input name="name_ka" className={field} />
            </label>
            <label className="text-xs">
              EN
              <input name="name_en" className={field} />
            </label>
            <button className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
              Add
            </button>
          </form>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Tags</h2>
          <ul className="mb-4 space-y-1">
            {tags.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {t.name_ka || "—"} / {t.name_en || "—"}{" "}
                  <span className="text-neutral-400">({t.slug})</span>
                </span>
                <form action={deleteTag.bind(null, t.id)}>
                  <button className="text-xs text-red-600 underline">
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={createTag} className="flex flex-wrap items-end gap-2">
            <label className="text-xs">
              KA
              <input name="name_ka" className={field} />
            </label>
            <label className="text-xs">
              EN
              <input name="name_en" className={field} />
            </label>
            <button className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
              Add
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
