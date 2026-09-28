"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toaster";
import { useLocale } from "@/app/lib/i18n/useLocale";

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
  const { tr } = useLocale();
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
            toast.show(
              published
                ? tr("Unpublished", "გამოქვეყნება გაუქმდა")
                : tr("Published", "გამოქვეყნებულია"),
              "success",
            );
            router.refresh();
          } catch (e) {
            toast.show(
              e instanceof Error
                ? e.message
                : tr("Toggle failed", "ვერ შეიცვალა"),
              "error",
            );
          }
        })
      }
    >
      {pending
        ? "…"
        : published
          ? tr("Unpublish", "მოხსნა")
          : tr("Publish", "გამოქვეყნება")}
    </button>
  );
}

export function EditLink({ href }: { href: string }) {
  const { tr } = useLocale();
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50"
    >
      {tr("Edit", "რედაქტირება")}
    </Link>
  );
}

export function DeleteButton({
  label,
  confirmText,
  onDelete,
}: {
  label?: string;
  confirmText: string;
  onDelete: ActionFn;
}) {
  const router = useRouter();
  const toast = useToast();
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  const resolvedLabel = label ?? tr("Delete", "წაშლა");
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          try {
            await onDelete();
            toast.show(tr("Deleted", "წაშლილია"), "success");
            router.refresh();
          } catch (e) {
            toast.show(
              `${tr("Delete failed", "წაშლა ვერ მოხერხდა")}: ${e instanceof Error ? e.message : e}`,
              "error",
            );
          }
        });
      }}
    >
      {pending ? tr("Deleting…", "იშლება…") : resolvedLabel}
    </button>
  );
}
