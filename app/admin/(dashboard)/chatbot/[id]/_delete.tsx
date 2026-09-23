"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteChatbotSession } from "@/app/lib/goga/actions-chatbot";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            "Delete this conversation? Every message in it is removed for good.",
          )
        ) {
          start(async () => {
            try {
              await deleteChatbotSession(id);
              toast.show("Conversation deleted", "success");
              router.push("/admin/chatbot");
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
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
