import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { STAGE_TONE, LEAD_STAGE_LABELS } from "@/app/lib/goga/leads";
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * "Late night, Goga." style greeting + ROLE-AWARE first-name handling.
 * Old fallback chopped emails at `@` and surfaced ugly stubs like "d." or
 * "info" — recognize those as inboxes, not people, and prefer "Goga".
 */
const INBOX_LOCALPARTS = new Set([
  "info",
  "hello",
  "contact",
  "admin",
  "studio",
  "team",
  "support",
  "office",
  "no-reply",
  "noreply",
]);
function operatorFirstName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) {
    const local = email.split("@")[0]!.toLowerCase();
    if (!INBOX_LOCALPARTS.has(local) && local.length > 1) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return "Goga";
}

function greeting(
  tr: (en: string, ka: string) => string,
  now = new Date(),
): string {
  const h = now.getHours();
  if (h < 5) return tr("Late night", "გვიანი ღამეა");
  if (h < 12) return tr("Good morning", "დილა მშვიდობისა");
  if (h < 17) return tr("Good afternoon", "შუადღე მშვიდობისა");
  if (h < 21) return tr("Good evening", "საღამო მშვიდობისა");
  return tr("Late night", "გვიანი ღამეა");
}

function fmtMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

async function loadDashboard() {
  const sb = gogaAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    leadsCount,
    activeBookings,
    upcomingShoots,
    monthRevenue,
    recentLeads,
    nextShoots,
    pendingContracts,
    activeDeliveries,
    stageCounts,
    recentEvents,
  ] = await Promise.all([
    sb
      .from("leads")
      .select("*", { head: true, count: "exact" })
      .eq("archived", false),
    sb
      .from("bookings")
      .select("*", { head: true, count: "exact" })
      .in("status", ["reserved", "confirmed"]),
    sb
      .from("bookings")
      .select("*", { head: true, count: "exact" })
      .gte("shoot_date", today)
      .lte("shoot_date", in30)
      .in("status", ["reserved", "confirmed"]),
    sb
      .from("bookings")
      .select("subtotal_cents, currency")
      .gte(
        "shoot_date",
        new Date(new Date().setDate(1)).toISOString().slice(0, 10),
      )
      .lte("shoot_date", in30)
      .in("status", ["confirmed", "completed"]),
    sb
      .from("leads")
      .select("id, name, email, stage, source, created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(5),
    sb
      .from("bookings")
      .select(
        "id, shoot_date, shoot_time, location, status, client_name, packages(name_en)",
      )
      .gte("shoot_date", today)
      .in("status", ["reserved", "confirmed"])
      .order("shoot_date", { ascending: true })
      .limit(5),
    sb
      .from("contracts")
      .select("id, signer_name, signer_email, status, sent_at, booking_id")
      .in("status", ["draft", "sent"])
      .order("created_at", { ascending: false })
      .limit(5),
    sb
      .from("deliveries")
      .select("id, token, view_count, last_viewed_at, booking_id")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(5),
    sb.from("leads").select("stage").eq("archived", false),
    sb
      .from("lead_events")
      .select("id, kind, created_at, lead_id, payload, leads(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const byStage: Record<string, number> = {};
  for (const row of stageCounts.data ?? []) {
    byStage[row.stage] = (byStage[row.stage] ?? 0) + 1;
  }

  // Sum revenue by currency
  const revenue: Record<string, number> = {};
  for (const row of monthRevenue.data ?? []) {
    revenue[row.currency] = (revenue[row.currency] ?? 0) + row.subtotal_cents;
  }

  return {
    counts: {
      leads: leadsCount.count ?? 0,
      activeBookings: activeBookings.count ?? 0,
      upcomingShoots: upcomingShoots.count ?? 0,
    },
    revenue,
    recentLeads: recentLeads.data ?? [],
    nextShoots: nextShoots.data ?? [],
    pendingContracts: pendingContracts.data ?? [],
    activeDeliveries: activeDeliveries.data ?? [],
    byStage,
    recentEvents: recentEvents.data ?? [],
  };
}

export default async function HomePage() {
  const session = await auth();
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const intlLocale = locale === "ka" ? "ka-GE" : "en-US";
  const firstName = operatorFirstName(
    session?.user?.name,
    session?.user?.email,
  );
  const stats = await loadDashboard();
  const revenueLine =
    Object.entries(stats.revenue)
      .map(([cur, cents]) => fmtMoney(cents, cur, intlLocale))
      .join(" · ") || "—";

  return (
    <AppShell
      breadcrumb={[{ label: tr("Dashboard", "დაფა") }]}
      chatScope={{ level: "org", org: "goga" }}
      chatScopeLabel="GOGA Studio"
      chatStarters={[
        tr(
          "What shoots are coming up this week?",
          "რა გადაღებებია ამ კვირაში?",
        ),
        tr(
          "Any contracts still awaiting signature?",
          "არის ხელმოსაწერად მოლოდინში ხელშეკრულებები?",
        ),
        tr(
          "How are leads split across stages right now?",
          "როგორ ნაწილდება ლიდები სტატუსებზე ამჟამად?",
        ),
        tr("Revenue this month so far", "ამ თვის შემოსავალი დღემდე"),
      ]}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-[var(--ink-900)]"
              style={{
                fontSize: "clamp(28px, 3.4vw, 40px)",
                fontWeight: 500,
                letterSpacing: "-0.022em",
                lineHeight: 1.05,
              }}
            >
              {greeting(tr)}, {firstName}.
            </h1>
            <p className="mt-1.5 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {new Date().toLocaleDateString(intlLocale, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href="/admin/leads"
            className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)]"
          >
            {tr("Open pipeline →", "სამუშაო პროცესის გახსნა →")}
          </Link>
        </header>

        {/* Stat cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={tr("Active leads", "აქტიური კლიენტები")}
            value={stats.counts.leads}
            href="/admin/leads"
            hint={tr("not archived", "დაუარქივებელი")}
          />
          <Stat
            label={tr("Open bookings", "ღია ჯავშნები")}
            value={stats.counts.activeBookings}
            href="/admin/bookings"
            hint={tr("reserved + confirmed", "დაჯავშნილი + დადასტურებული")}
          />
          <Stat
            label={tr("Next 30 days", "მომდევნო 30 დღე")}
            value={stats.counts.upcomingShoots}
            href="/admin/calendar"
            hint={tr("upcoming shoots", "მომავალი გადაღებები")}
          />
          <Stat
            label={tr("Revenue · this period", "შემოსავალი · ამ პერიოდში")}
            valueText={revenueLine}
            href="/admin/bookings"
            hint={tr("confirmed + completed", "დადასტურებული + დასრულებული")}
          />
        </section>

        {/* Funnel — pipeline stages at a glance */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <header className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[14px] font-medium text-[var(--ink-900)]">
              {tr("Pipeline", "სამუშაო პროცესი")}
            </h2>
            <Link
              href="/admin/leads"
              className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)] hover:text-[var(--ink-900)]"
            >
              {tr("Open kanban →", "კანბანის გახსნა →")}
            </Link>
          </header>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {Object.entries(LEAD_STAGE_LABELS).map(([stage, label]) => (
              <li
                key={stage}
                className="rounded-xl bg-slate-50 px-3 py-3 text-center"
              >
                <div
                  className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${STAGE_TONE[stage as keyof typeof STAGE_TONE]}`}
                >
                  {label}
                </div>
                <div className="font-mono text-[20px] tabular-nums text-[var(--ink-900)]">
                  {stats.byStage[stage] ?? 0}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Two-column action lists */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card
            title={tr("Next shoots", "მომავალი გადაღებები")}
            cta={{
              label: tr("All bookings →", "ყველა ჯავშანი →"),
              href: "/admin/bookings",
            }}
          >
            {stats.nextShoots.length === 0 ? (
              <Empty>
                {tr(
                  "No upcoming shoots scheduled.",
                  "დაგეგმილი გადაღებები არ არის.",
                )}
              </Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {stats.nextShoots.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                          {b.client_name ??
                            tr("Unnamed client", "უსახელო კლიენტი")}
                        </div>
                        <div className="truncate text-[12px] text-[var(--ink-500)]">
                          {b.packages?.name_en ??
                            tr("(no package)", "(პაკეტის გარეშე)")}
                          {b.location ? ` · ${b.location}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-[var(--ink-700)]">
                        {new Date(b.shoot_date).toLocaleDateString(intlLocale, {
                          month: "short",
                          day: "numeric",
                        })}
                        {b.shoot_time ? ` · ${b.shoot_time.slice(0, 5)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={tr("Recent leads", "ბოლო კლიენტები")}
            cta={{
              label: tr("All leads →", "ყველა კლიენტი →"),
              href: "/admin/leads",
            }}
          >
            {stats.recentLeads.length === 0 ? (
              <Empty>{tr("No leads yet.", "ჯერ კლიენტები არ არის.")}</Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {stats.recentLeads.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                          {l.name ?? tr("Anonymous", "ანონიმური")}
                        </div>
                        <div className="truncate text-[12px] text-[var(--ink-500)]">
                          {l.email ?? tr("(no email)", "(ელფოსტა არ არის)")} ·{" "}
                          {l.source}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] ${STAGE_TONE[l.stage]}`}
                      >
                        {LEAD_STAGE_LABELS[l.stage]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={tr("Awaiting signature", "ხელმოსაწერად მოლოდინში")}
            cta={{
              label: tr("Contracts →", "ხელშეკრულებები →"),
              href: "/admin/contracts",
            }}
          >
            {stats.pendingContracts.length === 0 ? (
              <Empty>
                {tr(
                  "No contracts awaiting signature.",
                  "ხელმოსაწერად მოლოდინში ხელშეკრულებები არ არის.",
                )}
              </Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {stats.pendingContracts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/contracts/${c.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                          {c.signer_name ??
                            tr("(no signer)", "(ხელმომწერი არ არის)")}
                        </div>
                        <div className="truncate text-[12px] text-[var(--ink-500)]">
                          {c.signer_email ?? ""}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] ${
                          c.status === "sent"
                            ? "bg-white text-slate-900 ring-1 ring-inset ring-black/15"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status === "sent"
                          ? tr("sent", "გაგზავნილი")
                          : c.status === "draft"
                            ? tr("draft", "მონახაზი")
                            : c.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={tr("Activity", "აქტივობა")}
            cta={
              stats.recentEvents.length > 0
                ? {
                    label: tr("All leads →", "ყველა კლიენტი →"),
                    href: "/admin/leads",
                  }
                : undefined
            }
          >
            {stats.recentEvents.length === 0 ? (
              <Empty>
                {tr("Nothing happened yet.", "აქტივობა ჯერ არ არის.")}
              </Empty>
            ) : (
              <ul className="space-y-2">
                {stats.recentEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-baseline justify-between gap-3 text-[13px]"
                  >
                    <span className="min-w-0 truncate text-[var(--ink-700)]">
                      <strong className="text-[var(--ink-900)]">
                        {e.leads?.name ?? tr("Lead", "ლიდი")}
                      </strong>{" "}
                      · {e.kind}
                    </span>
                    <time className="shrink-0 text-[11px] text-[var(--ink-400)]">
                      {e.created_at
                        ? new Date(e.created_at).toLocaleString(intlLocale, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

/* -------------------- Small primitives -------------------- */

function Stat({
  label,
  value,
  valueText,
  hint,
  href,
}: {
  label: string;
  value?: number;
  valueText?: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 transition hover:ring-black/15">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {label}
      </div>
      <div
        className="mt-2 font-mono text-[26px] tabular-nums leading-none text-[var(--ink-900)]"
        style={{ fontVariationSettings: '"wght" 540, "opsz" 36' }}
      >
        {valueText ?? value ?? 0}
      </div>
      {hint ? (
        <div className="mt-1.5 text-[11px] text-[var(--ink-500)]">{hint}</div>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Card({
  title,
  cta,
  children,
}: {
  title: string;
  cta?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <header className="mb-2 flex items-baseline justify-between border-b border-black/5 pb-3">
        <h2 className="text-[14px] font-medium text-[var(--ink-900)]">
          {title}
        </h2>
        {cta ? (
          <Link
            href={cta.href}
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)] hover:text-[var(--ink-900)]"
          >
            {cta.label}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-[13px] text-[var(--ink-400)]">{children}</p>;
}
