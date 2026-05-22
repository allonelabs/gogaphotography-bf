"use client";

import { useTransition } from "react";
import { deleteProject } from "@/app/lib/goga/actions-projects";

export function DeleteProjectButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            `Delete "${title}" and all its photos? This cannot be undone.`,
          )
        ) {
          start(async () => {
            try {
              await deleteProject(id);
            } catch (e) {
              alert(`Delete failed: ${e instanceof Error ? e.message : e}`);
            }
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}
