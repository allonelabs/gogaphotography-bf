"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";

interface Entry {
  id: string;
  ts: string;
  actor: string;
  actorEmail: string;
  action: string;
  target: string;
  hash: string;
  prev: string;
  ip: string;
}

// Client-side FNV-1a "hash" previously computed here was decorative —
// labeled "hash" + "prev" to look like cryptographic chain verification,
// but it was just `id+action+target` hashed in the browser, with no
// chained dependency. The footer also claimed "tampering with any line
// breaks the chain" — which was false. Removed; the audit row now shows
// the real DB id directly, and the footer states the honest version.

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [actor, setActor] = useState<string>("all");
  const [action, setAction] = useState<string>("all");

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/organization/audit?limit=200", {
          cache: "no-store",
        });
        const b = await r.json();
        if (!b.ok) throw new Error(b.error ?? "load failed");
        const rows: Entry[] = (b.entries ?? []).map(
          (
            e: {
              id: string;
              created_at: string;
              actor_email: string | null;
              actor_name: string | null;
              action: string;
              target: string | null;
              ip: string | null;
            },
            idx: number,
            all: {
              id: string;
              created_at: string;
              actor_email: string | null;
              actor_name: string | null;
              action: string;
              target: string | null;
              ip: string | null;
            }[],
          ) => ({
            id: e.id,
            ts: new Date(e.created_at)
              .toISOString()
              .replace("T", " ")
              .slice(0, 19),
            actor: e.actor_name ?? e.actor_email ?? "system",
            actorEmail: e.actor_email ?? "",
            action: e.action,
            target: e.target ?? "",
            ip: e.ip ?? "",
            hash: e.id,
            prev: idx + 1 < all.length ? all[idx + 1]!.id : "",
          }),
        );
        setEntries(rows);
      } catch (err) {
        toast(
          `Could not load audit · ${err instanceof Error ? err.message : "unknown"}`,
          "err",
        );
      }
    })();
  }, []);

  const ACTIONS = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );
  const ACTORS = useMemo(
    () => Array.from(new Set(entries.map((e) => e.actor))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (actor !== "all" && e.actor !== actor) return false;
      if (action !== "all" && e.action !== action) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        e.target.toLowerCase().includes(needle) ||
        e.actor.toLowerCase().includes(needle) ||
        e.action.toLowerCase().includes(needle)
      );
    });
  }, [q, actor, action, entries]);

  return (
    <AppShell
      breadcrumb={[
        { label: "Organization", href: "/app/organization" },
        { label: "Audit log" },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization/audit"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[860px]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1
                className="text-[var(--ink-900)]"
                style={{
                  fontSize: "clamp(22px, 2.4vw, 28px)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Audit log
              </h1>
              <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
                Every org-level change, append-only.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-[12px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
              <button
                type="button"
                disabled
                title="Coming soon — signed export ships with hash-chain verification"
                className="text-[12px] text-[var(--ink-400)] cursor-not-allowed"
              >
                Export signed CSV →
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actor, action, target…"
              className="h-9 flex-1 min-w-[240px] rounded-full border border-[var(--allonce-line)] bg-white px-4 text-[13px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] outline-none transition focus:border-[var(--ink-900)]"
            />
            <select
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="h-9 rounded-full border border-[var(--allonce-line)] bg-white px-3 text-[12.5px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
            >
              <option value="all">All actors</option>
              {ACTORS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 rounded-full border border-[var(--allonce-line)] bg-white px-3 font-mono text-[12px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
            >
              <option value="all">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Log */}
          <ul className="mt-8">
            {filtered.length === 0 ? (
              <li className="py-12 text-center text-[13px] text-[var(--ink-500)]">
                No entries match your filter.
              </li>
            ) : (
              filtered.map((e, i, arr) => (
                <li
                  key={e.id}
                  className={`grid gap-2 py-3.5 md:grid-cols-[180px_1fr_auto] md:items-start md:gap-4 ${
                    i < arr.length - 1
                      ? "border-b border-[var(--allonce-line-soft)]"
                      : ""
                  } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                >
                  <p className="font-mono text-[11.5px] text-[var(--ink-500)]">
                    {e.ts}
                  </p>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[13.5px] text-[var(--ink-900)]"
                        style={{ fontWeight: 500 }}
                      >
                        {e.actor}
                      </span>
                      <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--ink-900)]">
                        {e.action}
                      </span>
                      <span className="text-[13px] text-[var(--ink-500)]">
                        {e.target}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-400)]">
                      {e.actorEmail} · {e.ip}
                    </p>
                  </div>
                  <p
                    className="font-mono text-[10px] text-[var(--ink-400)] md:text-right"
                    title={`id ${e.hash}`}
                  >
                    {e.hash.slice(0, 8)}
                  </p>
                </li>
              ))
            )}
          </ul>

          <p className="mt-6 text-[11.5px] text-[var(--ink-400)]">
            Rows shown above are append-only on the server. Cryptographic
            hash-chain verification ships in a later milestone.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
