"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/lib/goga/actions-projects";
import { useToast } from "@/app/app/_components/Toaster";

export function DeleteProjectButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            `Delete "${title}" and all its photos? This cannot be undone.`,
          )
        ) {
          start(async () => {
            try {
              await deleteProject(id);
              toast.show("Project deleted", "success");
              router.push("/app/projects");
            } catch (e) {
              toast.show(
                `Delete failed: ${e instanceof Error ? e.message : e}`,
                "error",
              );
            }
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}
