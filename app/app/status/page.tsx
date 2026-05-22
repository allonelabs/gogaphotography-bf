import type { Metadata } from "next";
import { AppShell } from "@/app/components/app/AppShell";
import { ChromeBanner } from "@/app/components/app/ChromeBanner";
import { headers } from "next/headers";
import { getServerT } from "@/app/lib/i18n/server";

export const metadata: Metadata = { title: "Status — Travelplace" };
export const dynamic = "force-dynamic";

interface HealthCheck {
  ok: boolean;
  detail?: string;
}
interface HealthResponse {
  ok: boolean;
  status: "healthy" | "degraded" | string;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

async function loadHealth(): Promise<HealthResponse | null> {
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3003";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const res = await fetch(`${proto}://${host}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

function StatusDot({ ok }: { ok: boolean | null }) {
  const color =
    ok === true
      ? "bg-emerald-500"
      : ok === false
        ? "bg-rose-500"
        : "bg-amber-400";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`relative inline-block h-2.5 w-2.5 rounded-full ${color}`}
      >
        {ok === true && (
          <span
            className={`absolute inset-0 animate-ping rounded-full ${color} opacity-60`}
          />
        )}
      </span>
    </span>
  );
}

export default async function Page() {
  const t = await getServerT();
  const health = await loadHealth();

  const SERVICE_LABELS: Record<
    string,
    {
      label:
        | "status.svc.supabase.label"
        | "status.svc.vertex.label"
        | "status.svc.auth.label";
      sub:
        | "status.svc.supabase.sub"
        | "status.svc.vertex.sub"
        | "status.svc.auth.sub";
    }
  > = {
    supabase: {
      label: "status.svc.supabase.label",
      sub: "status.svc.supabase.sub",
    },
    vertex: { label: "status.svc.vertex.label", sub: "status.svc.vertex.sub" },
    auth: { label: "status.svc.auth.label", sub: "status.svc.auth.sub" },
  };

  const overall =
    health?.status === "healthy"
      ? { tone: "good", label: t("status.overall.healthy") }
      : health?.status === "degraded"
        ? { tone: "warn", label: t("status.overall.degraded") }
        : { tone: "bad", label: t("status.overall.unknown") };

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.help"), href: "/app/help" },
        { label: t("status.title") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="status"
    >
      <div className="p-6 sm:p-10">
        <ChromeBanner />
        <div className="max-w-5xl">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {t("status.eyebrow")}
          </p>
          <h1
            className="mt-3 text-[var(--ink-900)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              lineHeight: 1.15,
              letterSpacing: "-0.012em",
              fontWeight: 500,
            }}
          >
            {t("status.title")}
          </h1>

          <div
            className={`mt-6 flex items-center gap-3 rounded-[var(--radius-md)] border p-4 ${
              overall.tone === "good"
                ? "border-emerald-300/50 bg-emerald-50/40"
                : overall.tone === "warn"
                  ? "border-amber-300/50 bg-amber-50/40"
                  : "border-rose-300/50 bg-rose-50/40"
            }`}
          >
            <StatusDot
              ok={
                overall.tone === "good"
                  ? true
                  : overall.tone === "warn"
                    ? false
                    : null
              }
            />
            <div>
              <p
                className="text-[14px] text-[var(--ink-900)]"
                style={{ fontWeight: 500 }}
              >
                {overall.label}
              </p>
              {health && (
                <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-500)]">
                  {t("status.uptime")}: {Math.round(health.uptime)}s ·{" "}
                  {new Date(health.timestamp)
                    .toISOString()
                    .slice(0, 19)
                    .replace("T", " ")}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-6 divide-y divide-[var(--allonce-line)] rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)]">
            {health
              ? Object.entries(health.checks).map(([key, check]) => {
                  const labels = SERVICE_LABELS[key];
                  return (
                    <li key={key} className="flex items-center gap-4 px-4 py-3">
                      <StatusDot ok={check.ok} />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13.5px] text-[var(--ink-900)]"
                          style={{ fontWeight: 500 }}
                        >
                          {labels ? t(labels.label) : key}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                          {labels ? t(labels.sub) : ""}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[11px] ${check.ok ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {check.ok
                          ? t("status.svc.ok")
                          : (check.detail ?? t("status.svc.down"))}
                      </span>
                    </li>
                  );
                })
              : null}
            {!health && (
              <li className="px-4 py-8 text-center text-[13px] text-[var(--ink-500)]">
                {t("status.unreachable")}
              </li>
            )}
          </ul>

          <p className="mt-6 text-[11.5px] text-[var(--ink-500)]">
            {t("status.footer")}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
