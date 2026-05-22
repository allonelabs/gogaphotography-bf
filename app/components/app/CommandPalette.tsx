"use client";

// TODO(tourism-clone): stripped to navigation-only for the tourism rewrite.
// Spawn/business/tools/artifacts commands removed alongside mock-businesses /
// mock-artifacts data fixtures. A later task can repopulate this with
// hotel/contract/contact searches once the Supabase data layer is live.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Item {
  id: string;
  label: string;
  hint: string;
  group: string;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the static command set — navigation + sign-out only for now.
  const items: Item[] = useMemo(() => {
    const list: Item[] = [
      {
        id: "go-hub",
        label: "Go to Overview",
        hint: "Main dashboard",
        group: "Navigate",
        href: "/app",
        shortcut: "g o",
      },
      {
        id: "go-account",
        label: "Account",
        hint: "Your personal settings",
        group: "Navigate",
        href: "/app/account",
      },
      {
        id: "go-org",
        label: "Organization",
        hint: "Team-wide settings",
        group: "Navigate",
        href: "/app/organization",
      },
      {
        id: "go-billing",
        label: "Billing",
        hint: "Plan and invoices",
        group: "Navigate",
        href: "/app/billing",
      },
      {
        id: "go-help",
        label: "Help",
        hint: "In-app docs",
        group: "Navigate",
        href: "/app/help",
      },
      {
        id: "action-signout",
        label: "Sign out",
        hint: "End this session",
        group: "Actions",
        action: () => {
          void signOut({ callbackUrl: "/" });
        },
      },
    ];

    return list;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter((it) => (it.label + " " + it.hint).toLowerCase().includes(q))
      .slice(0, 50);
  }, [items, query]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (open) {
        if (e.key === "Escape") {
          setOpen(false);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelected((s) => Math.min(filtered.length - 1, s + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelected((s) => Math.max(0, s - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const it = filtered[selected];
          if (it) execute(it);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selected]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    setSelected(0);
    setQuery("");
  }, [open]);

  function execute(it: Item) {
    setOpen(false);
    if (it.href) router.push(it.href);
    else if (it.action) it.action();
  }

  // Listen for global "open" event (from topbar click)
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("allonce.openPalette", onOpen);
    return () => window.removeEventListener("allonce.openPalette", onOpen);
  }, []);

  if (!open) return null;

  // Group items for display
  const grouped: Record<string, Item[]> = {};
  for (const it of filtered) {
    if (!grouped[it.group]) grouped[it.group] = [];
    grouped[it.group]!.push(it);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/30 px-4 pt-[12vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[640px] overflow-hidden rounded-[var(--radius-xl)] bg-white border border-[var(--allonce-line)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--allonce-line-soft)] px-5 py-4">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="text-[var(--ink-400)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search navigation, actions…"
            className="flex-1 bg-transparent text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] no-ring outline-none"
          />
          <kbd className="rounded border border-[var(--allonce-line)] bg-[var(--bg-surface-alt)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-400)]">
            esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-500)]">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="pb-1">
                <div className="px-5 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-400)]">
                  {group}
                </div>
                {list.map((it) => {
                  const fIdx = filtered.indexOf(it);
                  const active = fIdx === selected;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setSelected(fIdx)}
                      onClick={() => execute(it)}
                      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition ${
                        active ? "bg-[var(--bg-sunken)]" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-[var(--ink-900)]">
                          {it.label}
                        </p>
                        {it.hint && (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--ink-500)]">
                            {it.hint}
                          </p>
                        )}
                      </div>
                      {active && (
                        <kbd className="rounded bg-[var(--ink-900)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--allonce-line-soft)] bg-[var(--bg-surface-alt)] px-5 py-2 text-[11px] text-[var(--ink-500)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              open
            </span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
