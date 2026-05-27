"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePackage } from "@/app/lib/goga/actions-packages";
import { useToast } from "@/app/app/_components/Toaster";

export function DeleteButton({ id, name }: { id: string; name: string }) {
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
            `Delete package "${name}"? Existing bookings keep their package reference.`,
          )
        ) {
          start(async () => {
            try {
              await deletePackage(id);
              toast.show("Package deleted", "success");
              router.push("/app/packages");
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
      {pending ? "Deleting…" : "Delete package"}
    </button>
  );
}
