"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await signIn("password", {
      password,
      redirect: false,
    });
    if (res?.ok) {
      router.replace(next);
      router.refresh();
    } else {
      setErr("Wrong password.");
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="w-full rounded-[10px] border border-white/10 bg-[#1d1d1d] px-4 py-3 text-center text-[15px] tracking-[0.06em] text-white placeholder-white/40 outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-white px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a] transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-progress"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {err ? <div className="mt-3 text-[13px] text-red-400">{err}</div> : null}
    </>
  );
}
