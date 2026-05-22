import { AppShell } from "@/app/components/app/AppShell";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { getServerT } from "@/app/lib/i18n/server";
import { CalendarGrid, type CalendarRow } from "./_calendar-grid";

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

async function loadBookings(
  year: number,
  month: number,
): Promise<CalendarRow[]> {
  const { client, orgId } = await createOrgScopedSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  // Visible window: 1st of month → 1st of next month
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const monthEnd = `${next.getUTCFullYear()}-${String(
    next.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  // p_order_hotel has check_in / check_out per booking. Overlap test:
  // booking.check_in < monthEnd AND booking.check_out >= monthStart
  const { data } = await sb
    .from("p_order_hotel")
    .select(
      `id, hotel_id, hotel_name, check_in, check_out,
       p_order_id,
       p_order:p_order(id, order_number, level, client_first_name, client_last_name, c_semblance)`,
    )
    .eq("organization_id", orgId)
    .lt("check_in", monthEnd)
    .gte("check_out", monthStart)
    .order("check_in", { ascending: true })
    .limit(2000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (data ?? []) as any[];

  // Group by hotel_id, fetch hotel names for any missing
  const hotelIds = Array.from(
    new Set(
      bookings
        .map((b) => b.hotel_id as number | null)
        .filter((id): id is number => typeof id === "number"),
    ),
  );
  let hotelMap = new Map<number, string>();
  if (hotelIds.length > 0) {
    const { data: hotels } = await sb
      .from("hotel")
      .select("id, name")
      .in("id", hotelIds);
    hotelMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (hotels ?? []).map((h: any) => [h.id, h.name as string]),
    );
  }

  const byHotel = new Map<number, CalendarRow>();
  for (const b of bookings) {
    const hotelId = b.hotel_id as number | null;
    if (hotelId == null) continue;
    if (!byHotel.has(hotelId)) {
      byHotel.set(hotelId, {
        hotel_id: hotelId,
        hotel_name:
          hotelMap.get(hotelId) ??
          (b.hotel_name as string) ??
          `Hotel #${hotelId}`,
        bookings: [],
      });
    }
    byHotel.get(hotelId)!.bookings.push({
      id: b.id,
      order_id: b.p_order_id,
      order_number: b.p_order?.order_number ?? null,
      check_in: b.check_in,
      check_out: b.check_out,
      level: b.p_order?.level ?? null,
      semblance: b.p_order?.c_semblance ?? null,
      client_name:
        [b.p_order?.client_first_name, b.p_order?.client_last_name]
          .filter(Boolean)
          .join(" ") || null,
    });
  }

  return Array.from(byHotel.values()).sort((a, b) =>
    a.hotel_name.localeCompare(b.hotel_name),
  );
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);
  const t = await getServerT();
  const rows = await loadBookings(year, month);

  return (
    <AppShell
      breadcrumb={[{ label: t("nav.calendar") }]}
      chatScope={{ level: "org", org: "travelplace" }}
      chatScopeLabel="Calendar"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {t("calendar.title")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-500)]">
            {t("calendar.subtitle")}
          </p>
        </div>
        <CalendarGrid year={year} month={month} rows={rows} />
      </div>
    </AppShell>
  );
}
