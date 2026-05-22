"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function GalleryLogin({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/gallery/${token}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setErr(
          data.error === "invalid_password"
            ? "Wrong password."
            : data.error === "rate_limited"
              ? "Too many attempts. Wait a minute."
              : "Could not unlock the gallery.",
        );
        setBusy(false);
      }
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="block w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-center text-[15px] tracking-[0.04em] text-white placeholder-white/40 outline-none transition focus:border-white/45"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-white px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a] transition hover:bg-white/90 disabled:opacity-50"
      >
        {busy ? "Unlocking…" : "View photos"}
      </button>
      {err ? (
        <p className="mt-2 text-center text-[13px] text-rose-400">{err}</p>
      ) : null}
    </form>
  );
}
