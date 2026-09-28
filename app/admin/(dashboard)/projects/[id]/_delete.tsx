"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/lib/goga/actions-projects";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { rethrowIfRedirect } from "@/app/lib/goga/redirect-error";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function DeleteProjectButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            tr(
              `Delete "${title}" and all its photos? This cannot be undone.`,
              `წაიშალოს „${title}“ და მისი ყველა ფოტო? ეს ქმედება შეუქცევადია.`,
            ),
          )
        ) {
          start(async () => {
            try {
              await deleteProject(id);
              toast.show(tr("Project deleted", "პროექტი წაიშალა"), "success");
              router.push("/admin/projects");
            } catch (e) {
              rethrowIfRedirect(e);
              toast.show(
                tr(
                  `Delete failed: ${e instanceof Error ? e.message : e}`,
                  `წაშლა ვერ მოხერხდა: ${e instanceof Error ? e.message : e}`,
                ),
                "error",
              );
            }
          });
        }
      }}
    >
      {pending
        ? tr("Deleting…", "იშლება…")
        : tr("Delete project", "პროექტის წაშლა")}
    </button>
  );
}
