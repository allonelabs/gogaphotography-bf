"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteService } from "@/app/lib/goga/actions-content";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function DeleteServiceButton({
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
            tr(`Delete service "${title}"?`, `წავშალოთ სერვისი „${title}"?`),
          )
        ) {
          start(async () => {
            try {
              await deleteService(id);
              toast.show(tr("Service deleted", "სერვისი წაშლილია"), "success");
              router.push("/admin/services");
            } catch (e) {
              toast.show(
                `${tr("Delete failed", "წაშლა ვერ მოხერხდა")}: ${e instanceof Error ? e.message : e}`,
                "error",
              );
            }
          });
        }
      }}
    >
      {pending
        ? tr("Deleting…", "იშლება…")
        : tr("Delete service", "სერვისის წაშლა")}
    </button>
  );
}
