"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "./Toast";

// Two-letter avatar initials. "Luka Adamia" -> "LA", "luka" -> "LU",
// "luka@allonelabs.com" -> "LU". Trimmed/uppercased; falls back to "·"
// while the session is still loading so the badge isn't blank.
function deriveInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "").trim();
  if (!source) return "·";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  const head = parts[0] ?? "";
  return head.slice(0, 2).toUpperCase() || "·";
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function AccountMenu() {
  // Fetch the session directly instead of going through <SessionProvider>
  // — keeps the menu self-contained and avoids wrapping the whole tree
  // just to read three fields. The AuthGuard already gates render anyway.
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j: { user?: SessionUser } | null) => {
        if (!cancelled && j?.user) setUser(j.user);
      })
      .catch(() => {
        /* keep null → falls back to safe placeholders */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Account";
  const displayEmail = user?.email ?? "";
  const initials = deriveInitials(user?.name, user?.email);

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-sunken)] text-[11px] font-semibold text-[var(--ink-900)] shadow-[var(--shadow-sm)] transition hover:scale-105"
      >
        {user?.image ? (
          <img src={user.image} alt="" className="h-full w-full object-cover" />
        ) : (
          // While the session loads (user === null), show a neutral disc — no
          // pattern flash that then swaps to the Google pic. Initials land
          // once the session resolves and user.image is still absent.
          // `leading-none` so the two-letter monogram sits at the visual
          // center of the disc — the default flex centering puts the
          // baseline a hair below middle for tight glyphs.
          <span
            className="leading-none"
            style={{ transform: "translateY(0.5px)" }}
          >
            {user ? initials : ""}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(260px,calc(100vw-24px))] overflow-hidden rounded-[var(--radius-lg)] border border-black/8 bg-[var(--bg-surface)] shadow-[0_24px_56px_-12px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 animate-fade-in"
        >
          <div className="border-b border-[var(--allonce-line-soft)] px-4 py-3">
            <p className="text-[13.5px] font-semibold text-[var(--ink-900)]">
              {displayName}
            </p>
            {displayEmail && (
              <p className="mt-0.5 truncate text-[12px] text-[var(--ink-500)]">
                {displayEmail}
              </p>
            )}
          </div>

          <div className="py-1.5">
            <MenuItem
              href="/app/account"
              onClick={() => setOpen(false)}
              label="Account settings"
            />
            <MenuItem
              href="/app/organization"
              onClick={() => setOpen(false)}
              label="Organization settings"
            />
            <MenuItem
              href="/app/billing"
              onClick={() => setOpen(false)}
              label="Billing"
            />
            <MenuItem
              href="/app/account/api-keys"
              onClick={() => setOpen(false)}
              label="API keys"
            />
          </div>

          <div className="border-t border-[var(--allonce-line-soft)] py-1.5">
            <MenuItem
              href="/app/help"
              onClick={() => setOpen(false)}
              label="Help & docs"
            />
            <MenuItem
              href="/app/status"
              onClick={() => setOpen(false)}
              label="System status"
            />
          </div>

          <div className="border-t border-[var(--allonce-line-soft)] py-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                try {
                  // Clear any legacy client-side flags. Real auth lives in
                  // the next-auth session cookie cleared by signOut() below.
                  localStorage.removeItem("allonce.authenticated");
                  localStorage.removeItem("allonce.auth.provider");
                  localStorage.removeItem("allonce.auth.email");
                } catch {}
                toast("Signed out", "ok");
                // Land on the marketing page after sign-out, not the signin
                // form. Users who want to come back can click "Sign in" from
                // the landing nav. next-auth clears the JWT cookie before
                // following callbackUrl, so the AuthGuard on /app will then
                // bounce any back-button attempt to /signin.
                void signOut({ callbackUrl: "/" });
              }}
              className="block w-full px-4 py-2 text-left text-[13px] text-[var(--ink-500)] transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--allonce-err)]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onClick,
  label,
}: {
  href: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-[13px] text-[var(--ink-900)] transition hover:bg-[var(--bg-surface-alt)]"
    >
      {label}
    </Link>
  );
}
