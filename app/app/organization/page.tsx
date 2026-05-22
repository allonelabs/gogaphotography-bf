"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

interface OrgState {
  domain: string;
  orgName: string;
  members: number;
  invites: number;
  webhooks: number;
  roles: number;
  businesses: number;
  plan: "pilot" | "team" | "custom";
}

const BUILT_IN_ROLE_COUNT = 4;

const INITIAL: OrgState = {
  domain: "",
  orgName: "",
  members: 0,
  invites: 0,
  webhooks: 0,
  roles: BUILT_IN_ROLE_COUNT,
  businesses: 0,
  plan: "pilot",
};

const PLAN_KEY: Record<OrgState["plan"], TranslationKey> = {
  pilot: "organization.plan.pilot",
  team: "organization.plan.team",
  custom: "organization.plan.custom",
};

export default function Page() {
  const { t } = useLocale();
  const [s, setS] = useState<OrgState>(INITIAL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "include",
        });
        if (r.ok) {
          const data = (await r.json()) as { user?: { email?: string | null } };
          const email = data?.user?.email ?? "";
          const domain = email.includes("@") ? email.split("@")[1] : "";
          if (!cancelled && domain) {
            const orgName =
              domain
                .split(".")[0]
                .split(/[-_]/)
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" ") || t("organization.fallback_org_name");
            setS((prev) => ({ ...prev, domain, orgName }));
          }
        }
      } catch {}
      try {
        const r = await fetch("/api/organization/summary", {
          cache: "no-store",
        });
        if (r.ok) {
          const body = (await r.json()) as Partial<OrgState>;
          if (!cancelled) {
            setS((prev) => ({ ...prev, ...body }));
          }
        }
      } catch {}
      try {
        const r = await fetch("/api/billing/summary", { cache: "no-store" });
        if (r.ok) {
          const body = (await r.json()) as {
            billing?: { plan?: "pilot" | "team" | "custom" };
          };
          if (!cancelled && body.billing?.plan) {
            setS((prev) => ({ ...prev, plan: body.billing!.plan! }));
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const planLabel = t(PLAN_KEY[s.plan]);
  const headerName =
    mounted && s.orgName ? s.orgName : t("organization.fallback_name");
  const businessWord =
    s.businesses === 1
      ? t("organization.business_one")
      : t("organization.business_many");
  const headerSub =
    mounted && s.domain ? `${s.domain} · ${s.businesses} ${businessWord}` : " ";

  return (
    <AppShell
      breadcrumb={[{ label: t("organization.crumb") }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[720px]">
          {/* Org identity */}
          <div className="flex items-start justify-between gap-6">
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
                {headerName}
              </h1>
              <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
                {headerSub}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-[12px] text-[var(--ink-900)]"
              style={{ fontWeight: 500 }}
            >
              {mounted
                ? t("organization.plan_label", { plan: planLabel })
                : "—"}
            </span>
          </div>

          {/* Single-column list */}
          <div className="mt-10">
            <Row
              href="/app/organization/members"
              title={t("organization.row.members.title")}
              sub={t("organization.row.members.sub")}
              value={
                mounted
                  ? `${s.members}${
                      s.invites > 0
                        ? ` · ${t("organization.pending_suffix", { n: s.invites })}`
                        : ""
                    }`
                  : null
              }
              valueTone={s.invites > 0 ? "warn" : "default"}
            />
            <Row
              href="/app/organization/roles"
              title={t("organization.row.roles.title")}
              sub={t("organization.row.roles.sub")}
              value={mounted ? String(s.roles) : null}
            />
            <Row
              href="/app/organization/webhooks"
              title={t("organization.row.webhooks.title")}
              sub={t("organization.row.webhooks.sub")}
              value={
                mounted
                  ? `${s.webhooks} ${
                      s.webhooks === 1
                        ? t("organization.endpoint_one")
                        : t("organization.endpoint_many")
                    }`
                  : null
              }
            />
            <Row
              href="/app/organization/audit"
              title={t("organization.row.audit.title")}
              sub={t("organization.row.audit.sub")}
              value={t("organization.row.audit.value")}
            />
            <Row
              href="/app/billing"
              title={t("organization.row.billing.title")}
              sub={t("organization.row.billing.sub")}
              value={mounted ? planLabel : null}
            />
            <Row
              href="/app/organization/billing"
              title={t("organization.row.allocation.title")}
              sub={t("organization.row.allocation.sub")}
              value={
                mounted
                  ? `${s.businesses} ${
                      s.businesses === 1
                        ? t("organization.business_one")
                        : t("organization.business_many")
                    }`
                  : null
              }
              isLast
            />
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
      className={`group flex items-center gap-4 py-4 transition hover:bg-black/[0.025] ${
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
          className="text-[var(--ink-300)] transition group-hover:translate-x-0.5 group-hover:text-[var(--ink-900)]"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
