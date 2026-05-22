"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  prefix: string; // first 8 chars, always shown
  suffix: string; // last 4 chars, always shown
  full?: string; // only present right after creation
  created: string;
  lastUsed: string | null;
}

// Real keys come from /api/account/api-keys; the page hits that on mount.
// The old SEED fixture (two fake ao_live_*** keys with synthetic last-used
// timestamps), the allonce.apiKeys localStorage constant, and the
// makeKey() Math.random-based generator were all dead code — secrets never
// originate client-side. Removed so they can't drift back into the UI.

export default function Page() {
  const { t } = useLocale();
  const SCOPES = useMemo(
    () =>
      [
        {
          id: "read",
          labelKey: "apikeys.scope.read",
          hintKey: "apikeys.scope.read.hint",
        },
        {
          id: "write",
          labelKey: "apikeys.scope.write",
          hintKey: "apikeys.scope.write.hint",
        },
        {
          id: "deploy",
          labelKey: "apikeys.scope.deploy",
          hintKey: "apikeys.scope.deploy.hint",
        },
        {
          id: "admin",
          labelKey: "apikeys.scope.admin",
          hintKey: "apikeys.scope.admin.hint",
        },
      ] as const satisfies ReadonlyArray<{
        id: string;
        labelKey: TranslationKey;
        hintKey: TranslationKey;
      }>,
    [],
  );

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: ["read"] as string[] });
  const [fresh, setFresh] = useState<ApiKey | null>(null);

  useEffect(() => {
    setMounted(true);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    try {
      const r = await fetch("/api/account/api-keys", { cache: "no-store" });
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "load failed");
      const rows: ApiKey[] = (b.keys ?? []).map(
        (k: {
          id: string;
          name: string;
          scopes: string[];
          prefix: string;
          suffix: string;
          created_at: string;
          last_used_at: string | null;
        }) => ({
          id: k.id,
          name: k.name,
          scopes: k.scopes ?? [],
          prefix: k.prefix ?? "ao_live_",
          suffix: k.suffix ?? "",
          created: k.created_at?.slice(0, 10) ?? "",
          lastUsed: k.last_used_at,
        }),
      );
      setKeys(rows);
    } catch (err) {
      toast(
        t("apikeys.toast.load_failed", {
          error: err instanceof Error ? err.message : t("common.unknown_error"),
        }),
        "err",
      );
    }
  }

  async function create() {
    if (!form.name.trim())
      return toast(t("apikeys.toast.name_required"), "warn");
    if (form.scopes.length === 0)
      return toast(t("apikeys.toast.scope_required"), "warn");
    try {
      const r = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), scopes: form.scopes }),
      });
      const b = await r.json();
      if (!b.ok || !b.key) throw new Error(b.error ?? "create failed");
      const k: ApiKey = {
        id: b.key.id,
        name: b.key.name,
        scopes: b.key.scopes ?? [],
        prefix: b.key.prefix,
        suffix: b.key.suffix,
        full: b.key.full,
        created:
          b.key.created_at?.slice(0, 10) ??
          new Date().toISOString().slice(0, 10),
        lastUsed: null,
      };
      setKeys((prev) => [k, ...prev]);
      setFresh(k);
      setForm({ name: "", scopes: ["read"] });
      setShowCreate(false);
      toast(t("apikeys.toast.created"), "ok");
    } catch (err) {
      toast(
        t("apikeys.toast.create_failed", {
          error: err instanceof Error ? err.message : t("common.unknown_error"),
        }),
        "err",
      );
    }
  }

  async function revoke(id: string) {
    try {
      const r = await fetch(
        `/api/account/api-keys?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "revoke failed");
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast(t("apikeys.toast.revoked"), "info");
    } catch (err) {
      toast(
        t("apikeys.toast.revoke_failed", {
          error: err instanceof Error ? err.message : t("common.unknown_error"),
        }),
        "err",
      );
    }
  }

  function copyFresh() {
    if (!fresh?.full) return;
    navigator.clipboard?.writeText(fresh.full).then(
      () => toast(t("apikeys.toast.copied"), "ok"),
      () => toast(t("apikeys.toast.copy_failed"), "err"),
    );
  }

  function toggleScope(id: string) {
    setForm((prev) =>
      prev.scopes.includes(id)
        ? { ...prev, scopes: prev.scopes.filter((s) => s !== id) }
        : { ...prev, scopes: [...prev.scopes, id] },
    );
  }

  return (
    <AppShell
      breadcrumb={[
        { label: t("apikeys.crumb.account"), href: "/app/account" },
        { label: t("apikeys.crumb.api_keys") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="account/api-keys"
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
                {t("apikeys.title")}
              </h1>
              <p className="mt-1 max-w-md text-[13.5px] text-[var(--ink-500)]">
                {t("apikeys.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] text-white transition hover:bg-black"
              style={{ fontWeight: 500 }}
            >
              {t("apikeys.new")}
            </button>
          </div>

          {/* Fresh-key reveal */}
          {fresh && (
            <div className="mt-8 border-t border-[var(--allonce-line-soft)] pt-6">
              <p
                className="text-[12.5px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                {t("apikeys.fresh.heading")}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">
                {t("apikeys.fresh.body_prefix")}
                <span style={{ fontWeight: 500, color: "var(--ink-900)" }}>
                  {fresh.name}
                </span>
                {t("apikeys.fresh.body_suffix")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-[10px] bg-[var(--bg-surface-alt)] px-3 py-2.5 font-mono text-[12.5px] text-[var(--ink-900)]">
                  {fresh.full}
                </code>
                <button
                  type="button"
                  onClick={copyFresh}
                  className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[12.5px] text-white transition hover:bg-black"
                  style={{ fontWeight: 500 }}
                >
                  {t("apikeys.fresh.copy")}
                </button>
                <button
                  type="button"
                  onClick={() => setFresh(null)}
                  className="inline-flex h-9 items-center px-2 text-[12.5px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
                  aria-label={t("apikeys.fresh.dismiss")}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Keys list */}
          <div className="mt-10">
            {mounted && keys.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13.5px] text-[var(--ink-500)]">
                  {t("apikeys.empty.title")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[12.5px] text-white transition hover:bg-black"
                  style={{ fontWeight: 500 }}
                >
                  {t("apikeys.empty.cta")}
                </button>
              </div>
            ) : (
              <ul>
                {keys.map((k, i, arr) => (
                  <li
                    key={k.id}
                    className={`flex items-center justify-between gap-4 py-4 ${
                      i < arr.length - 1
                        ? "border-b border-[var(--allonce-line-soft)]"
                        : ""
                    } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p
                          className="text-[14px] text-[var(--ink-900)]"
                          style={{ fontWeight: 500 }}
                        >
                          {k.name}
                        </p>
                        <div className="flex gap-1.5">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[var(--bg-surface-alt)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--ink-900)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[11.5px] text-[var(--ink-500)]">
                        <span>
                          {k.prefix}…{k.suffix}
                        </span>
                        <span className="text-[var(--ink-300)]">·</span>
                        <span>{t("apikeys.created", { date: k.created })}</span>
                        <span className="text-[var(--ink-300)]">·</span>
                        <span>
                          {k.lastUsed
                            ? t("apikeys.used", { date: k.lastUsed })
                            : t("apikeys.never_used")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(k.id)}
                      className="text-[12.5px] text-[var(--ink-500)] transition hover:text-[#b91c1c]"
                    >
                      {t("apikeys.revoke")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]">
            <h2
              className="text-[18px] text-[var(--ink-900)]"
              style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
            >
              {t("apikeys.modal.title")}
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">
              {t("apikeys.modal.intro")}
            </p>

            <label className="mt-5 block">
              <span
                className="mb-1.5 block text-[12px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                {t("apikeys.modal.label")}
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                placeholder={t("apikeys.modal.label_placeholder")}
                className="h-10 w-full rounded-[12px] border border-[var(--allonce-line)] bg-white px-3.5 text-[13.5px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] outline-none transition focus:border-[var(--ink-900)]"
              />
            </label>

            <div className="mt-5">
              <p
                className="text-[12px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                {t("apikeys.modal.scopes")}
              </p>
              <div className="mt-2 space-y-1.5">
                {SCOPES.map((s) => {
                  const on = form.scopes.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScope(s.id)}
                      className="flex w-full items-start justify-between gap-3 rounded-[12px] border border-[var(--allonce-line)] bg-white px-3.5 py-2.5 text-left transition hover:bg-black/[0.025]"
                      style={{ borderColor: on ? "#0d0d0d" : undefined }}
                    >
                      <div>
                        <p
                          className="font-mono text-[12.5px] text-[var(--ink-900)]"
                          style={{ fontWeight: 500 }}
                        >
                          {t(s.labelKey)}
                        </p>
                        <p className="text-[11.5px] text-[var(--ink-500)]">
                          {t(s.hintKey)}
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
                onClick={() => setShowCreate(false)}
                className="inline-flex h-9 items-center px-3 text-[13px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
              >
                {t("apikeys.modal.cancel")}
              </button>
              <button
                type="button"
                onClick={create}
                className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] text-white transition hover:bg-black"
                style={{ fontWeight: 500 }}
              >
                {t("apikeys.modal.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
