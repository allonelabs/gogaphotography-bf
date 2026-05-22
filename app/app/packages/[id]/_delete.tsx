"use client";

import { useTransition } from "react";
import { deletePackage } from "@/app/lib/goga/actions-packages";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            `Delete package "${name}"? Existing bookings keep their package reference.`,
          )
        ) {
          start(async () => {
            try {
              await deletePackage(id);
            } catch (e) {
              alert(`Delete failed: ${e instanceof Error ? e.message : e}`);
            }
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete package"}
    </button>
  );
}
