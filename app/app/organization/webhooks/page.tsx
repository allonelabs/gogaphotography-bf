"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  created: string;
  lastDelivery: { at: string; status: "ok" | "err"; code: number } | null;
  active: boolean;
}

const EVENTS = [
  {
    id: "business.spawned",
    label: "business.spawned",
    hint: "New business created",
  },
  {
    id: "business.deployed",
    label: "business.deployed",
    hint: "Artifact published to live",
  },
  {
    id: "proposal.new",
    label: "proposal.new",
    hint: "Chat emitted a new proposal",
  },
  {
    id: "proposal.applied",
    label: "proposal.applied",
    hint: "Proposal auto-applied (tune-mode)",
  },
  {
    id: "proposal.pr",
    label: "proposal.pr",
    hint: "Proposal opened as PR (mechanism-mode)",
  },
  { id: "member.invited", label: "member.invited", hint: "Org invite sent" },
  { id: "billing.invoice", label: "billing.invoice", hint: "Invoice issued" },
  {
    id: "integration.connected",
    label: "integration.connected",
    hint: "New bridge wired up",
  },
];

// Real webhooks come from /api/organization/webhooks — secrets are minted
// server-side and only returned in the create response, never re-displayed.
// The old SEED fixture (single ops.acme-co.com endpoint) + allonce.webhooks
// localStorage key + client-side mkSecret() were all dead code; secrets
// never originate in the browser. Removed.

export default function Page() {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [mounted, setMounted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ url: "", events: [] as string[] });

  useEffect(() => {
    setMounted(true);
    void reload();
  }, []);

  async function reload() {
    try {
      const r = await fetch("/api/organization/webhooks", {
        cache: "no-store",
      });
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "load failed");
      setHooks(
        (b.webhooks ?? []).map(
          (h: {
            id: string;
            url: string;
            events: string[];
            is_active: boolean;
            created_at: string;
            last_fired: string | null;
          }) => ({
            id: h.id,
            url: h.url,
            events: h.events ?? [],
            secret: "••••••••", // server holds the real value; revealed on create only
            created: h.created_at?.slice(0, 10) ?? "",
            lastDelivery: h.last_fired
              ? {
                  at: new Date(h.last_fired).toLocaleString(),
                  status: "ok" as const,
                  code: 200,
                }
              : null,
            active: h.is_active,
          }),
        ),
      );
    } catch (err) {
      toast(
        `Could not load webhooks · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function create() {
    const url = form.url.trim();
    if (!url) return toast("URL required", "warn");
    try {
      new URL(url);
    } catch {
      return toast("Invalid URL", "err");
    }
    if (form.events.length === 0)
      return toast("Subscribe to at least one event", "warn");
    try {
      const r = await fetch("/api/organization/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, events: form.events }),
      });
      const b = await r.json();
      if (!b.ok || !b.webhook) throw new Error(b.error ?? "create failed");
      const wh: Webhook = {
        id: b.webhook.id,
        url: b.webhook.url,
        events: b.webhook.events ?? [],
        secret: b.webhook.secret, // shown ONCE
        created:
          b.webhook.created_at?.slice(0, 10) ??
          new Date().toISOString().slice(0, 10),
        lastDelivery: null,
        active: b.webhook.is_active,
      };
      setHooks((prev) => [wh, ...prev]);
      setForm({ url: "", events: [] });
      setCreating(false);
      toast("Webhook created · copy the secret now — it won’t reappear", "ok");
    } catch (err) {
      toast(
        `Create failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function toggleActive(id: string) {
    const h = hooks.find((x) => x.id === id);
    if (!h) return;
    const next = !h.active;
    try {
      const r = await fetch("/api/organization/webhooks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, is_active: next }),
      });
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "toggle failed");
      setHooks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, active: next } : x)),
      );
    } catch (err) {
      toast(
        `Toggle failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  function rotate(_id: string) {
    // Rotation regenerates the signing secret server-side. Out of scope for
    // this minimal wiring — would need a dedicated /rotate endpoint.
    toast("Secret rotation: contact support for now", "info");
  }

  async function remove(id: string) {
    try {
      const r = await fetch(
        `/api/organization/webhooks?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "delete failed");
      setHooks((prev) => prev.filter((h) => h.id !== id));
      toast("Webhook deleted", "info");
    } catch (err) {
      toast(
        `Delete failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  function testDelivery(_id: string) {
    // Server-side delivery test would POST to the URL with a signed empty body
    // and update last_fired. Stub for now.
    toast("Test deliveries: ship from your code against the URL", "info");
  }

  function toggleEvent(id: string) {
    setForm((prev) =>
      prev.events.includes(id)
        ? { ...prev, events: prev.events.filter((e) => e !== id) }
        : { ...prev, events: [...prev.events, id] },
    );
  }

  function copySecret(s: string) {
    navigator.clipboard?.writeText(s).then(
      () => toast("Secret copied", "ok"),
      () => toast("Copy failed", "err"),
    );
  }

  return (
    <AppShell
      breadcrumb={[
        { label: "Organization", href: "/app/organization" },
        { label: "Webhooks" },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization/webhooks"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-start justify-between gap-4">
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
                Webhooks
              </h1>
              <p className="mt-1 max-w-md text-[13.5px] text-[var(--ink-500)]">
                Every delivery is signed with HMAC-SHA256 using the signing
                secret.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] text-white transition hover:bg-black"
              style={{ fontWeight: 500 }}
            >
              + New webhook
            </button>
          </div>

          <div className="mt-10">
            {mounted && hooks.length === 0 ? (
              <p className="py-12 text-center text-[13.5px] text-[var(--ink-500)]">
                No webhooks yet.
              </p>
            ) : (
              <ul>
                {hooks.map((h, i, arr) => (
                  <li
                    key={h.id}
                    className={`py-5 ${
                      i < arr.length - 1
                        ? "border-b border-[var(--allonce-line-soft)]"
                        : ""
                    } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate font-mono text-[13px]"
                            style={{
                              color: h.active ? "#0d0d0d" : "#9b9b9b",
                              fontWeight: 500,
                            }}
                          >
                            {h.url}
                          </p>
                          {!h.active && (
                            <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10.5px] text-[var(--ink-500)]">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {h.events.map((e) => (
                            <span
                              key={e}
                              className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--ink-900)]"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        {h.lastDelivery && (
                          <p className="mt-2.5 font-mono text-[11.5px] text-[var(--ink-500)]">
                            <span
                              style={{
                                color:
                                  h.lastDelivery.status === "ok"
                                    ? "#1e6f3b"
                                    : "#b91c1c",
                              }}
                            >
                              ●
                            </span>{" "}
                            last delivery {h.lastDelivery.at} ·{" "}
                            {h.lastDelivery.code}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[12.5px]">
                        <button
                          type="button"
                          onClick={() => testDelivery(h.id)}
                          className="text-[var(--ink-900)] transition hover:underline"
                          style={{ fontWeight: 500 }}
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(h.id)}
                          className="text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
                        >
                          {h.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(h.id)}
                          className="text-[#b91c1c] transition hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Secret row */}
                    <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[var(--allonce-line-soft)] bg-white px-3 py-2">
                      <span
                        className="text-[11px] text-[var(--ink-400)]"
                        style={{ fontWeight: 500 }}
                      >
                        Secret
                      </span>
                      <code className="flex-1 truncate font-mono text-[11.5px] text-[var(--ink-500)]">
                        {h.secret.slice(0, 12)}…{h.secret.slice(-6)}
                      </code>
                      <button
                        type="button"
                        onClick={() => copySecret(h.secret)}
                        className="text-[11.5px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => rotate(h.id)}
                        className="text-[11.5px] text-[var(--ink-900)] transition hover:underline"
                        style={{ fontWeight: 500 }}
                      >
                        Rotate
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-[500px] rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]">
            <h2
              className="text-[18px] text-[var(--ink-900)]"
              style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
            >
              New webhook
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">
              Endpoint + events.
            </p>

            <label className="mt-5 block">
              <span
                className="mb-1.5 block text-[12px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                URL
              </span>
              <input
                autoFocus
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://your-service.com/hooks/allonce"
                className="h-10 w-full rounded-[12px] border border-[var(--allonce-line)] bg-white px-3.5 font-mono text-[13px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] outline-none transition focus:border-[var(--ink-900)]"
              />
            </label>

            <div className="mt-5">
              <p
                className="text-[12px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                Subscribe to events
              </p>
              <div className="mt-2 grid max-h-[320px] gap-1.5 overflow-y-auto pr-1">
                {EVENTS.map((e) => {
                  const on = form.events.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleEvent(e.id)}
                      className="flex items-start justify-between gap-3 rounded-[12px] border bg-white px-3.5 py-2.5 text-left transition hover:bg-black/[0.025]"
                      style={{
                        borderColor: on ? "#0d0d0d" : "rgba(0,0,0,0.08)",
                      }}
                    >
                      <div>
                        <p
                          className="font-mono text-[12px] text-[var(--ink-900)]"
                          style={{ fontWeight: 500 }}
                        >
                          {e.label}
                        </p>
                        <p className="text-[11.5px] text-[var(--ink-500)]">
                          {e.hint}
                        </p>
                      </div>
                      <span
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border transition"
                        style={{
                          backgroundColor: on ? "#0d0d0d" : "transparent",
                          borderColor: on ? "#0d0d0d" : "rgba(0,0,0,0.18)",
                        }}
                      >
                        {on && (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-full w-full text-white"
                          >
                            <path
                              d="M3.5 8.5l3 3 6-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="inline-flex h-9 items-center px-3 text-[13px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] text-white transition hover:bg-black"
                style={{ fontWeight: 500 }}
              >
                Create webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
