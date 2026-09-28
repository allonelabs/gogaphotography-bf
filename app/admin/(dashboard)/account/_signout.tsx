"use client";

import { signOut } from "next-auth/react";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function SignOutButton() {
  const { tr } = useLocale();
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-full border border-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100"
    >
      {tr("Sign out", "გასვლა")}
    </button>
  );
}
