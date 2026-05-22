"use client";

import { useTransition } from "react";
import { deleteService } from "@/app/lib/goga/actions-content";

export function DeleteServiceButton({
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
        if (confirm(`Delete service "${title}"?`)) {
          start(async () => {
            try {
              await deleteService(id);
            } catch (e) {
              alert(`Delete failed: ${e instanceof Error ? e.message : e}`);
            }
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete service"}
    </button>
  );
}
