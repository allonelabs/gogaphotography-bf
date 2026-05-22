"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { ChromeBanner } from "@/app/components/app/ChromeBanner";
import { toast } from "@/app/components/app/Toast";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface Counts {
  name: string;
  email: string;
  plan: string;
  apiKeys: number;
  passkeys: number;
  twoFA: boolean;
  role: string | null;
  permissions: string[];
}

const DEFAULTS: Counts = {
  name: "",
  email: "",
  plan: "pilot",
  apiKeys: 0,
  passkeys: 0,
  twoFA: false,
  role: null,
  permissions: [],
};

export default function Page() {
  const { t } = useLocale();
  const [c, setC] = useState<Counts>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const security = JSON.parse(
        localStorage.getItem("allonce.security") || "{}",
      );
      const apiKeys = JSON.parse(
        localStorage.getItem("allonce.apiKeys") || "null",
      );
      const plan = localStorage.getItem("allonce.plan") || "pilot";
      setC((prev) => ({
        ...prev,
        plan,
        apiKeys: apiKeys ? apiKeys.length : 0,
        passkeys: security.passkeys ? security.passkeys.length : 0,
        twoFA: !!security.twoFA,
      }));
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "include",
        });
        if (r.ok) {
          const data = (await r.json()) as {
            user?: {
              name?: string | null;
              email?: string | null;
              role?: string | null;
              permissions?: string[];
            };
          };
          if (!cancelled && data?.user) {
            setC((prev) => ({
              ...prev,
              name: data.user?.name || prev.name,
              email: data.user?.email || prev.email,
              role: data.user?.role ?? prev.role,
              permissions: data.user?.permissions ?? prev.permissions,
            }));
          }
        }
      } catch {}
      try {
        const r = await fetch("/api/account/profile");
        if (!r.ok) return;
        const b = (await r.json()) as {
          profile?: { name?: string; email?: string };
        };
        if (cancelled || !b.profile) return;
        setC((prev) => ({
          ...prev,
          name: b.profile?.name || prev.name,
          email: b.profile?.email || prev.email,
        }));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = c.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const planLabel =
    c.plan === "team"
      ? t("account.plan.team")
      : c.plan === "custom"
        ? t("account.plan.custom")
        : t("account.plan.pilot");

  function exportData() {
    toast(t("account.export_preparing"), "info");
    setTimeout(() => toast(t("account.export_ready"), "ok"), 1600);
  }

  return (
    <AppShell
      breadcrumb={[
        { label: t("crumb.orchestrator"), href: "/app" },
        { label: t("nav.account") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel={t("nav.account")}
    >
      <div className="px-10 py-12">
        <ChromeBanner />
        <div className="mx-auto max-w-[720px]">
          {/* Identity */}
          <div className="flex items-center gap-5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[16px] font-medium text-[var(--ink-900)]"
              style={{ backgroundColor: "var(--bg-sunken)" }}
            >
              {mounted && initials ? initials : "·"}
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-[var(--ink-900)]"
                style={{
                  fontSize: "clamp(22px, 2.4vw, 28px)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {mounted && c.name ? c.name : t("account.loading")}
              </h1>
              <p className="mt-0.5 text-[13.5px] text-[var(--ink-500)]">
                {mounted && c.email ? c.email : " "}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-[12px] text-[var(--ink-900)]"
              style={{ fontWeight: 500 }}
            >
              {mounted ? t("account.plan_suffix", { plan: planLabel }) : "—"}
            </span>
          </div>

          {/* Single-column list */}
          <div className="mt-10 border-t border-[var(--allonce-line-soft)]">
            <Row
              href="/app/account/profile"
              title={t("account.row.profile")}
              sub={t("account.row.profile_sub")}
              value={mounted && c.email ? c.email.split("@")[0] : null}
            />
            <Row
              href="/app/account/security"
              title={t("account.row.security")}
              sub={t("account.row.security_sub")}
              value={
                mounted
                  ? c.twoFA
                    ? t("account.row.security_2fa_on")
                    : t("account.row.security_2fa_off")
                  : null
              }
              valueTone={mounted && !c.twoFA ? "warn" : "default"}
            />
            <Row
              href="/app/account/preferences"
              title={t("account.row.preferences")}
              sub={t("account.row.preferences_sub")}
              value={t("account.row.preferences_value")}
            />
            <Row
              href="/app/account/api-keys"
              title={t("account.row.api_keys")}
              sub={t("account.row.api_keys_sub")}
              value={
                mounted
                  ? t("account.row.api_keys_value", {
                      n: c.apiKeys,
                      unit:
                        c.apiKeys === 1
                          ? t("account.row.api_keys_unit_one")
                          : t("account.row.api_keys_unit_many"),
                    })
                  : null
              }
            />
            <Row
              href="/app/billing"
              title={t("account.row.billing")}
              sub={t("account.row.billing_sub")}
              value={mounted ? planLabel : null}
              isLast
            />
          </div>

          {/* Role + permissions — read-only diagnostic of the current user */}
          <div className="mt-10">
            <h2
              className="text-[13px] font-semibold uppercase tracking-wider text-[var(--ink-500)]"
              style={{ fontWeight: 600 }}
            >
              {t("account.role_perm_title")}
            </h2>
            <div className="mt-3 rounded-[14px] border border-[var(--allonce-line-soft)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-[14px] text-[var(--ink-900)]"
                    style={{ fontWeight: 500 }}
                  >
                    {t("account.role")}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">
                    {t("account.role_sub")}
                  </p>
                </div>
                <span
                  className="rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-[12px] text-[var(--ink-900)]"
                  style={{ fontWeight: 500 }}
                >
                  {mounted ? (c.role ?? "—") : "—"}
                </span>
              </div>
              {mounted && c.permissions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.permissions.sort().map((p) => (
                    <span
                      key={p}
                      className="rounded-[6px] bg-[var(--bg-sunken)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-700)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {mounted && c.permissions.length === 0 && (
                <p className="mt-3 text-[12.5px] text-[var(--ink-500)]">
                  {t("account.no_perms")}
                </p>
              )}
            </div>
          </div>

          {/* Quiet actions */}
          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={exportData}
              className="flex w-full items-center justify-between rounded-[14px] px-4 py-3 text-left transition hover:bg-black/[0.03]"
            >
              <div>
                <p
                  className="text-[14px] text-[var(--ink-900)]"
                  style={{ fontWeight: 500 }}
                >
                  {t("account.download")}
                </p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">
                  {t("account.download_sub")}
                </p>
              </div>
              <span className="text-[13px] text-[var(--ink-500)]">
                {t("account.export")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void signOut({ callbackUrl: "/" });
              }}
              className="flex w-full items-center justify-between rounded-[14px] px-4 py-3 text-left transition hover:bg-black/[0.03]"
            >
              <div>
                <p
                  className="text-[14px] text-[var(--ink-900)]"
                  style={{ fontWeight: 500 }}
                >
                  {t("account.signout")}
                </p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">
                  {t("account.signout_sub")}
                </p>
              </div>
              <span className="text-[13px] text-[var(--ink-500)]">
                {t("account.signout_action")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  href,
  title,
  sub,
  value,
  valueTone = "default",
  isLast = false,
}: {
  href: string;
  title: string;
  sub: string;
  value: string | null;
  valueTone?: "default" | "warn";
  isLast?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 py-5 transition ${
        isLast ? "" : "border-b border-[var(--allonce-line-soft)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[14.5px] text-[var(--ink-900)]"
          style={{ fontWeight: 500 }}
        >
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-[var(--ink-500)]">
          {sub}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {value && (
          <span
            className="text-[12.5px]"
            style={{
              color:
                valueTone === "warn"
                  ? "var(--allonce-warn, #b45309)"
                  : "var(--ink-500)",
            }}
          >
            {value}
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="text-[var(--ink-400)] transition group-hover:translate-x-0.5 group-hover:text-[var(--ink-900)]"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
