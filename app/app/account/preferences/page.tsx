"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

interface Prefs {
  theme: "light" | "dark" | "auto";
  density: "comfortable" | "compact" | "dense";
  chatSide: "right" | "left";
  accent: string;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyDesktop: boolean;
  defaultBusiness: string;
}

// 2026-05-14 — accent defaults to near-black per operator preference.
// The accent picker row was removed; this value still applies via
// --ao-accent for any component that reads it.
const DEFAULT: Prefs = {
  theme: "light",
  density: "comfortable",
  chatSide: "right",
  accent: "#0A0A0A",
  notifyEmail: true,
  notifySlack: false,
  notifyDesktop: true,
  // Empty = no default selected. The select fetches the operator's real
  // businesses from /api/spawns; the old hardcoded 'acme-co' default and
  // the {acme-co,northbeam,linepost} mock options pretended every operator
  // had three businesses they'd never spawned.
  defaultBusiness: "",
};

interface BusinessOption {
  id: string;
  name: string;
}

// Accent picker removed 2026-05-14 — operator preferred a fixed near-black
// accent throughout, no per-user accent picker on the prefs page.
const KEY = "allonce.prefs";

// Apply the preference values to the live UI so the operator sees the change
// immediately. Persisted via :root CSS vars + body data-attributes that the
// rest of the dashboard reads.
function applyPreferences(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--ao-accent", p.accent);
  root.dataset.density = p.density;
  root.dataset.theme = p.theme;
  root.dataset.chatSide = p.chatSide;
}

export default function Page() {
  const { t } = useLocale();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [mounted, setMounted] = useState(false);
  const [, setBusinesses] = useState<BusinessOption[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const loaded = { ...DEFAULT, ...JSON.parse(raw) };
        setPrefs(loaded);
        applyPreferences(loaded);
      }
    } catch {}

    // Fetch the operator's real businesses for the default-business select.
    // Empty list → the select renders an honest "No businesses yet" option.
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/spawns", {
          cache: "no-store",
          credentials: "include",
        });
        if (!r.ok) return;
        const body = (await r.json()) as unknown;
        const rows: unknown[] = Array.isArray(body)
          ? body
          : Array.isArray((body as { spawns?: unknown[] }).spawns)
            ? (body as { spawns: unknown[] }).spawns
            : [];
        const opts = rows
          .map((row): BusinessOption | null => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const id =
              typeof r.id === "string"
                ? r.id
                : typeof r.slug === "string"
                  ? r.slug
                  : null;
            const name = typeof r.name === "string" ? r.name : id;
            return id && name ? { id, name } : null;
          })
          .filter((x): x is BusinessOption => x !== null);
        if (!cancelled) setBusinesses(opts);
      } catch {
        // Empty list is the honest fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    applyPreferences(next);
    toast(t("preferences.toast.saved"), "ok");
  }

  const SHORTCUTS: ReadonlyArray<[string, TranslationKey]> = [
    ["⌘ K", "preferences.shortcut.palette"],
    ["⌘ /", "preferences.shortcut.chat"],
    ["⌘ B", "preferences.shortcut.sidebar"],
    ["⌘ ⏎", "preferences.shortcut.run"],
    ["G then B", "preferences.shortcut.jump_business"],
    ["G then O", "preferences.shortcut.jump_orchestrator"],
  ];

  return (
    <AppShell
      breadcrumb={[
        { label: t("preferences.crumb.account"), href: "/app/account" },
        { label: t("preferences.crumb.preferences") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="account/preferences"
    >
      <div className="p-10">
        <div className="max-w-3xl">
          <p className="eyebrow">{t("preferences.eyebrow")}</p>
          <h1
            className="display-h2 mt-3"
            style={{ fontSize: "clamp(30px, 3.8vw, 44px)" }}
          >
            {t("preferences.title")}
          </h1>

          <Section label={t("preferences.section.appearance")}>
            <Row
              label={t("preferences.theme")}
              help={t("preferences.theme.help")}
            >
              <Segmented
                options={[
                  { value: "light", label: t("preferences.theme.light") },
                  { value: "dark", label: t("preferences.theme.dark") },
                  { value: "auto", label: t("preferences.theme.system") },
                ]}
                value={mounted ? prefs.theme : "light"}
                onChange={(v) => update("theme", v as Prefs["theme"])}
              />
            </Row>
          </Section>

          <Section label={t("preferences.section.notifications")}>
            <Row
              label={t("preferences.notify.email")}
              help={t("preferences.notify.email.help")}
            >
              <Toggle
                on={mounted && prefs.notifyEmail}
                onClick={() => update("notifyEmail", !prefs.notifyEmail)}
              />
            </Row>
            <Row
              label={t("preferences.notify.slack")}
              help={t("preferences.notify.slack.help")}
            >
              <Toggle
                on={mounted && prefs.notifySlack}
                onClick={() => update("notifySlack", !prefs.notifySlack)}
              />
            </Row>
            <Row
              label={t("preferences.notify.desktop")}
              help={t("preferences.notify.desktop.help")}
            >
              <Toggle
                on={mounted && prefs.notifyDesktop}
                onClick={() => update("notifyDesktop", !prefs.notifyDesktop)}
              />
            </Row>
          </Section>

          <Section label={t("preferences.section.keyboard")}>
            <div className="grid gap-2 font-mono text-[12.5px]">
              {SHORTCUTS.map(([k, descKey]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b border-[var(--allonce-line-soft)] py-2 last:border-b-0"
                >
                  <span className="text-[var(--ink-500)]">{t(descKey)}</span>
                  <kbd className="rounded-md bg-[var(--bg-surface-alt)] px-2 py-1 text-[11px] text-[var(--ink-900)]">
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {label}
      </p>
      <div className="mt-4 divide-y divide-[var(--allonce-line-soft)]">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-[13.5px] font-medium text-[var(--ink-900)]">
          {label}
        </p>
        {help && (
          <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">{help}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-full bg-[var(--bg-surface-alt)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="h-7 rounded-full px-3 text-[12px] font-medium transition"
          style={{
            backgroundColor:
              value === o.value ? "var(--bg-surface)" : "transparent",
            color: value === o.value ? "var(--ink-900)" : "var(--ink-500)",
            boxShadow: value === o.value ? "var(--shadow-xs)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative h-6 w-11 rounded-full transition"
      style={{ backgroundColor: on ? "var(--ao-accent)" : "var(--bg-sunken)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}
