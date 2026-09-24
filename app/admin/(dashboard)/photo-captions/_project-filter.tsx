"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ProjectFilter({
  projects,
  active,
}: {
  projects: { id: string; title: string }[];
  active: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    if (e.target.value) next.set("project", e.target.value);
    else next.delete("project");
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-4">
      <select
        value={active ?? ""}
        onChange={onChange}
        className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
      >
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}
