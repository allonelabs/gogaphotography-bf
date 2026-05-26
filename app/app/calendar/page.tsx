import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { CalendarGrid, type CalendarItem } from "./_calendar-grid";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function parseMonth(s: string | undefined): { year: number; month: number } {
  if (s && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

async function loadShoots(
  year: number,
  month: number,
): Promise<CalendarItem[]> {
  const sb = gogaAdmin();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const monthEnd = `${next.getUTCFullYear()}-${String(
    next.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  const { data } = await sb
    .from("bookings")
    .select(
      `id, client_name, client_email, shoot_date, shoot_time, location,
       status, packages(name_en)`,
    )
    .gte("shoot_date", monthStart)
    .lt("shoot_date", monthEnd)
    .order("shoot_date", { ascending: true })
    .limit(500);

  return (data ?? []).map((b) => ({
    id: b.id,
    date: b.shoot_date,
    time: b.shoot_time,
    title: b.client_name ?? b.client_email ?? "(no client)",
    packageName: b.packages?.name_en ?? null,
    location: b.location,
    status: b.status,
  }));
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);
  const items = await loadShoots(year, month);

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <AppShell
      breadcrumb={[{ label: "Calendar" }]}
      chatScope={{ level: "tool", tool: "calendar" }}
      chatScopeLabel="Calendar"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {monthName}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-500)]">
            {items.length} shoot{items.length === 1 ? "" : "s"} this month
          </p>
        </header>
        <CalendarGrid year={year} month={month} items={items} />
      </div>
    </AppShell>
  );
}
