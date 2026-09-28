import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { AvailabilityForm } from "./_form";
import { BlackoutList } from "./_blackout";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

function weekdayLabels(tr: (en: string, ka: string) => string): string[] {
  return [
    tr("Sunday", "კვირა"),
    tr("Monday", "ორშაბათი"),
    tr("Tuesday", "სამშაბათი"),
    tr("Wednesday", "ოთხშაბათი"),
    tr("Thursday", "ხუთშაბათი"),
    tr("Friday", "პარასკევი"),
    tr("Saturday", "შაბათი"),
  ];
}

export default async function AvailabilityPage() {
  const tr = await getServerTr();
  const WEEKDAY_LABELS = weekdayLabels(tr);
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
      breadcrumb={[
        { label: tr("Pipeline", "პროცესი") },
        { label: tr("Availability", "ხელმისაწვდომობა") },
      ]}
      chatScope={{ level: "tool", tool: "availability" }}
      chatScopeLabel={tr("Availability", "ხელმისაწვდომობა")}
    >
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Availability", "ხელმისაწვდომობა")}
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            {tr(
              "Weekly hours and one-off closed dates. The public booking date picker and",
              "კვირის განრიგი და ცალკეული დახურული დღეები. ჯავშნის საჯარო თარიღის კალენდარი და",
            )}{" "}
            <code>/api/availability</code>{" "}
            {tr("read these directly.", "მათ პირდაპირ წაიკითხავენ.")}
          </p>
        </header>

        <AvailabilityForm initial={weekRules} />
        <BlackoutList initial={blackout ?? []} />
      </div>
    </AppShell>
  );
}
