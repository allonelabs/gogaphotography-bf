"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { ChromeBanner } from "@/app/components/app/ChromeBanner";
import { toast } from "@/app/components/app/Toast";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

type Plan = "pilot" | "team" | "custom";

interface Invoice {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
}

interface BillingState {
  plan: Plan;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  invoices: Invoice[];
}

interface PlanDef {
  id: Plan;
  nameKey: TranslationKey;
  priceKey: TranslationKey;
  cadenceKey?: TranslationKey;
  blurbKey: TranslationKey;
  featureKeys: TranslationKey[];
}

const PLAN_DEFS: PlanDef[] = [
  {
    id: "pilot",
    nameKey: "billing.plan.pilot.name",
    priceKey: "billing.plan.pilot.price",
    cadenceKey: "billing.plan.pilot.cadence",
    blurbKey: "billing.plan.pilot.blurb",
    featureKeys: [
      "billing.plan.pilot.f1",
      "billing.plan.pilot.f2",
      "billing.plan.pilot.f3",
      "billing.plan.pilot.f4",
    ],
  },
  {
    id: "team",
    nameKey: "billing.plan.team.name",
    priceKey: "billing.plan.team.price",
    cadenceKey: "billing.plan.team.cadence",
    blurbKey: "billing.plan.team.blurb",
    featureKeys: [
      "billing.plan.team.f1",
      "billing.plan.team.f2",
      "billing.plan.team.f3",
      "billing.plan.team.f4",
      "billing.plan.team.f5",
    ],
  },
  {
    id: "custom",
    nameKey: "billing.plan.custom.name",
    priceKey: "billing.plan.custom.price",
    blurbKey: "billing.plan.custom.blurb",
    featureKeys: [
      "billing.plan.custom.f1",
      "billing.plan.custom.f2",
      "billing.plan.custom.f3",
      "billing.plan.custom.f4",
      "billing.plan.custom.f5",
    ],
  },
];

const INVOICE_STATUS_KEY: Record<Invoice["status"], TranslationKey> = {
  paid: "billing.invoices.status.paid",
  pending: "billing.invoices.status.pending",
  failed: "billing.invoices.status.failed",
  refunded: "billing.invoices.status.refunded",
};

export default function Page() {
  const { t, locale } = useLocale();
  const [state, setState] = useState<BillingState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [switching, setSwitching] = useState<Plan | null>(null);

  const plans = useMemo(
    () =>
      PLAN_DEFS.map((p) => ({
        id: p.id,
        name: t(p.nameKey),
        price: t(p.priceKey),
        cadence: p.cadenceKey ? t(p.cadenceKey) : "",
        blurb: t(p.blurbKey),
        features: p.featureKeys.map((k) => t(k)),
      })),
    [t],
  );

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/account/billing", {
          cache: "no-store",
          credentials: "include",
        });
        if (!r.ok) return;
        const body = (await r.json()) as {
          ok?: boolean;
          billing?: BillingState;
        };
        if (cancelled || !body.ok || !body.billing) return;
        setState(body.billing);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function switchPlan(next: Plan) {
    if (!state || next === state.plan || switching) return;
    setSwitching(next);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: next }),
      });
      const body = (await r.json()) as {
        ok?: boolean;
        mode?: "redirect" | "sales" | "unconfigured";
        url?: string;
        contact?: string;
        detail?: string;
      };
      if (body.mode === "redirect" && body.url) {
        window.location.href = body.url;
        return;
      }
      if (body.mode === "sales" && body.contact) {
        window.location.href = body.contact;
        toast(t("billing.toast.custom_sales"), "info");
        return;
      }
      if (r.status === 503 || body.mode === "unconfigured") {
        toast(t("billing.toast.unconfigured"), "info");
        return;
      }
      toast(t("billing.toast.switch_failed"), "err");
    } catch {
      toast(t("billing.toast.switch_failed"), "err");
    } finally {
      setSwitching(null);
    }
  }

  const current = state
    ? (plans.find((p) => p.id === state.plan) ?? plans[0])
    : null;
  const paymentLabel = state?.paymentMethodLast4
    ? `•••• ${state.paymentMethodLast4}`
    : t("billing.payment.none");
  const paymentSub =
    state?.paymentMethodLast4 && state.paymentMethodBrand
      ? t("billing.payment.saved", { brand: state.paymentMethodBrand })
      : t("billing.payment.add_at_checkout");

  return (
    <AppShell
      breadcrumb={[{ label: t("billing.crumb") }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="billing"
    >
      <div className="px-10 py-12">
        <ChromeBanner />
        <div className="mx-auto max-w-[720px]">
          <h1
            className="text-[var(--ink-900)]"
            style={{
              fontSize: "clamp(22px, 2.4vw, 28px)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {t("billing.title")}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
            {mounted && current
              ? t("billing.subtitle.on_plan", { plan: current.name })
              : " "}
          </p>

          {/* Current summary — three quiet rows */}
          <div className="mt-10">
            <SummaryRow
              label={t("billing.summary.plan")}
              value={mounted && current ? current.name : "—"}
              sub={current?.blurb}
            />
            <SummaryRow
              label={t("billing.summary.price")}
              value={mounted && current ? current.price : "—"}
              sub={
                current && current.cadence
                  ? current.cadence === "/mo" || current.cadence === "/თვე"
                    ? t("billing.summary.billed_monthly")
                    : t("billing.summary.billed_cadence", {
                        cadence: current.cadence,
                      })
                  : t("billing.summary.talk_to_sales")
              }
            />
            <SummaryRow
              label={t("billing.summary.payment_method")}
              value={paymentLabel}
              sub={paymentSub}
              isLast
            />
          </div>

          {/* Usage */}
          <section className="mt-12">
            <h2
              className="text-[12.5px] text-[var(--ink-400)]"
              style={{ fontWeight: 500 }}
            >
              {t("billing.usage.heading")}
            </h2>
            <div className="mt-4 space-y-5">
              <UsageBar
                label={t("billing.usage.spawns")}
                used={0}
                cap={
                  state?.plan === "team"
                    ? 5
                    : state?.plan === "custom"
                      ? Infinity
                      : 1
                }
              />
              <UsageBar
                label={t("billing.usage.tool_calls")}
                used={0}
                cap={state?.plan === "team" ? 100000 : 20000}
                format="num"
                locale={locale}
              />
              <UsageBar
                label={t("billing.usage.bridge_deliveries")}
                used={0}
                cap={state?.plan === "team" ? 50000 : 10000}
                format="num"
                locale={locale}
              />
            </div>
            <p className="mt-4 text-[11.5px] text-[var(--ink-400)]">
              {t("billing.usage.footnote")}
            </p>
          </section>

          {/* Plan switcher */}
          <section className="mt-14">
            <h2
              className="text-[12.5px] text-[var(--ink-400)]"
              style={{ fontWeight: 500 }}
            >
              {t("billing.plans.heading")}
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {plans.map((p) => {
                const active = mounted && state && p.id === state.plan;
                const busy = switching === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-[18px] border bg-white p-5 transition"
                    style={{
                      borderColor: active
                        ? "var(--ink-900)"
                        : "var(--allonce-line)",
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3
                        className="text-[15px] text-[var(--ink-900)]"
                        style={{ fontWeight: 500 }}
                      >
                        {p.name}
                      </h3>
                      {active && (
                        <span className="text-[11px] text-[var(--ink-400)]">
                          {t("billing.plan.current")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span
                        className="text-[28px] text-[var(--ink-900)]"
                        style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
                      >
                        {p.price}
                      </span>
                      {p.cadence && (
                        <span className="text-[12.5px] text-[var(--ink-400)]">
                          {p.cadence}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-500)]">
                      {p.blurb}
                    </p>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="text-[12.5px] text-[var(--ink-500)]"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => switchPlan(p.id)}
                      disabled={!!active || busy || !mounted || !state}
                      className={
                        active
                          ? "mt-5 inline-flex h-9 items-center justify-center rounded-full text-[12.5px] text-[var(--ink-500)]"
                          : p.id === "team"
                            ? "mt-5 inline-flex h-9 items-center justify-center rounded-full bg-[var(--ink-900)] text-[12.5px] text-white transition hover:bg-black disabled:bg-[#d7d7d7]"
                            : "mt-5 inline-flex h-9 items-center justify-center rounded-full bg-[var(--bg-surface-alt)] text-[12.5px] text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)] disabled:opacity-50"
                      }
                      style={{ fontWeight: 500 }}
                    >
                      {busy
                        ? "…"
                        : active
                          ? t("billing.plan.current_button")
                          : p.id === "custom"
                            ? t("billing.plan.contact_sales")
                            : t("billing.plan.switch_to", { plan: p.name })}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Invoices */}
          <section className="mt-14">
            <h2
              className="text-[12.5px] text-[var(--ink-400)]"
              style={{ fontWeight: 500 }}
            >
              {t("billing.invoices.heading")}
            </h2>
            {!state || state.invoices.length === 0 ? (
              <p className="mt-4 text-[13px] text-[var(--ink-500)]">
                {state
                  ? t("billing.invoices.empty")
                  : t("billing.invoices.loading")}
              </p>
            ) : (
              <ul className="mt-4">
                <li
                  className="grid grid-cols-[1.4fr_1fr_auto_auto] gap-4 pb-2 text-[11px] text-[var(--ink-400)]"
                  style={{ fontWeight: 500 }}
                >
                  <span>{t("billing.invoices.col.invoice")}</span>
                  <span>{t("billing.invoices.col.date")}</span>
                  <span className="text-right">
                    {t("billing.invoices.col.amount")}
                  </span>
                  <span className="text-right">
                    {t("billing.invoices.col.status")}
                  </span>
                </li>
                {state.invoices.map((inv, i, arr) => (
                  <li
                    key={inv.id}
                    className={`grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-4 py-3 text-[13px] ${
                      i < arr.length - 1
                        ? "border-b border-[var(--allonce-line-soft)]"
                        : "border-t border-[var(--allonce-line-soft)] border-b border-[var(--allonce-line-soft)]"
                    } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                  >
                    <span className="font-mono text-[12.5px] text-[var(--ink-900)]">
                      {inv.id}
                    </span>
                    <span className="text-[12.5px] text-[var(--ink-500)]">
                      {new Date(inv.date).toLocaleDateString(
                        locale === "ka" ? "ka" : "en",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                    <span className="text-right tabular-nums text-[var(--ink-900)]">
                      {(inv.amountCents / 100).toLocaleString(
                        locale === "ka" ? "ka" : "en",
                        {
                          style: "currency",
                          currency: inv.currency || "USD",
                        },
                      )}
                    </span>
                    <span
                      className="justify-self-end text-[12px]"
                      style={{
                        color:
                          inv.status === "paid"
                            ? "#1e6f3b"
                            : inv.status === "failed"
                              ? "#b91c1c"
                              : "var(--ink-500)",
                      }}
                    >
                      {t(INVOICE_STATUS_KEY[inv.status])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryRow({
  label,
  value,
  sub,
  isLast = false,
}: {
  label: string;
  value: string;
  sub?: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-4 ${
        isLast ? "" : "border-b border-[var(--allonce-line-soft)]"
      }`}
    >
      <div>
        <p
          className="text-[14.5px] text-[var(--ink-900)]"
          style={{ fontWeight: 500 }}
        >
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 text-[12.5px] text-[var(--ink-500)]">{sub}</p>
        )}
      </div>
      <span
        className="text-[13.5px] text-[var(--ink-900)]"
        style={{ fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

function UsageBar({
  label,
  used,
  cap,
  format = "int",
  locale = "en",
}: {
  label: string;
  used: number;
  cap: number;
  format?: "int" | "num";
  locale?: string;
}) {
  const pct = cap === Infinity ? 0 : Math.min(100, (used / cap) * 100);
  const fmt = (n: number) =>
    n === Infinity
      ? "∞"
      : format === "num"
        ? n.toLocaleString(locale === "ka" ? "ka" : "en")
        : String(n);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p
          className="text-[12.5px] text-[var(--ink-900)]"
          style={{ fontWeight: 500 }}
        >
          {label}
        </p>
        <p className="font-mono text-[11.5px] tabular-nums text-[var(--ink-500)]">
          {fmt(used)}{" "}
          <span className="text-[var(--ink-400)]">/ {fmt(cap)}</span>
        </p>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-[var(--ink-900)] transition-all duration-700"
          style={{ width: `${cap === Infinity ? 6 : pct}%` }}
        />
      </div>
    </div>
  );
}
