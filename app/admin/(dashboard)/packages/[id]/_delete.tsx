"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePackage } from "@/app/lib/goga/actions-packages";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function DeleteButton({ id, name }: { id: string; name: string }) {
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
              `Delete package "${name}"? Existing bookings keep their package reference.`,
              `წაშალოთ პაკეტი „${name}“? არსებული ჯავშნები შეინარჩუნებენ პაკეტის მითითებას.`,
            ),
          )
        ) {
          start(async () => {
            try {
              await deletePackage(id);
              toast.show(tr("Package deleted", "პაკეტი წაშლილია"), "success");
              router.push("/admin/packages");
            } catch (e) {
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
        : tr("Delete package", "პაკეტის წაშლა")}
    </button>
  );
}
