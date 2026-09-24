import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { AvailabilityForm } from "./_form";
import { BlackoutList } from "./_blackout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function AvailabilityPage() {
  const sb = gogaAdmin();
  const [{ data: rules }, { data: blackout }] = await Promise.all([
    sb
      .from("availability_rules")
      .select("id, weekday, closed, start_time, end_time"),
    sb
      .from("blackout_dates")
      .select("id, date, reason")
      .order("date", { ascending: true }),
  ]);

  const byWeekday = new Map((rules ?? []).map((r) => [r.weekday, r]));
  const weekRules = WEEKDAY_LABELS.map((label, weekday) => {
    const r = byWeekday.get(weekday);
    return {
      weekday,
      label,
      closed: r?.closed ?? false,
      start_time: r?.start_time?.slice(0, 5) ?? "09:00",
      end_time: r?.end_time?.slice(0, 5) ?? "19:00",
    };
  });

  return (
    <AppShell
      breadcrumb={[{ label: "Pipeline" }, { label: "Availability" }]}
      chatScope={{ level: "tool", tool: "availability" }}
      chatScopeLabel="Availability"
    >
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Availability
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            Weekly hours and one-off closed dates. The public booking date
            picker and <code>/api/availability</code> read these directly.
          </p>
        </header>

        <AvailabilityForm initial={weekRules} />
        <BlackoutList initial={blackout ?? []} />
      </div>
    </AppShell>
  );
}
