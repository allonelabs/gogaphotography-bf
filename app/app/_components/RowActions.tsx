"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toaster";

type ActionFn<T extends unknown[] = []> = (...args: T) => Promise<void>;

export function PublishToggle({
  published,
  onToggle,
}: {
  published: boolean;
  onToggle: ActionFn;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50 disabled:opacity-50"
      onClick={() =>
        start(async () => {
          try {
            await onToggle();
            toast.show(published ? "Unpublished" : "Published", "success");
            router.refresh();
          } catch (e) {
            toast.show(
              e instanceof Error ? e.message : "Toggle failed",
              "error",
            );
          }
        })
      }
    >
      {pending ? "…" : published ? "Unpublish" : "Publish"}
    </button>
  );
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50"
    >
      Edit
    </Link>
  );
}

export function DeleteButton({
  label = "Delete",
  confirmText,
  onDelete,
}: {
  label?: string;
  confirmText: string;
  onDelete: ActionFn;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-rose-300 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          try {
            await onDelete();
            toast.show("Deleted", "success");
            router.refresh();
          } catch (e) {
            toast.show(
              `Delete failed: ${e instanceof Error ? e.message : e}`,
              "error",
            );
          }
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
