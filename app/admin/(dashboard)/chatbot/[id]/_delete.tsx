"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteChatbotSession } from "@/app/lib/goga/actions-chatbot";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50 disabled:opacity-50"
      onClick={() => {
        if (
          confirm(
            tr(
              "Delete this conversation? Every message in it is removed for good.",
              "წავშალოთ ეს საუბარი? მასში ყველა შეტყობინება სამუდამოდ წაიშლება.",
            ),
          )
        ) {
          start(async () => {
            try {
              await deleteChatbotSession(id);
              toast.show(
                tr("Conversation deleted", "საუბარი წაშლილია"),
                "success",
              );
              router.push("/admin/chatbot");
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
      {pending ? tr("Deleting…", "იშლება…") : tr("Delete", "წაშლა")}
    </button>
  );
}
