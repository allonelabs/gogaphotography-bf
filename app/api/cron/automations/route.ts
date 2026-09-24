// app/api/cron/automations/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { runRule } from "@/app/lib/goga/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tbilisiDateString(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function originForEmail(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ??
    (process.env["VERCEL_URL"]
      ? `https://${process.env["VERCEL_URL"]}`
      : "http://localhost:3030")
  ).replace(/\/$/, "");
}

async function runShootReminders(sb: ReturnType<typeof gogaAdmin>) {
  const { data: rule } = await sb
    .from("automation_rules")
    .select("enabled, delay_days")
    .eq("key", "shoot_reminder")
    .maybeSingle();
  if (!rule?.enabled) return { skipped: "disabled", sent: 0 };

  const targetDate = tbilisiDateString(rule.delay_days);
  const { data: bookings } = await sb
    .from("bookings")
    .select(
      `id, shoot_date, shoot_time, location, client_name, client_email, lead_id,
       leads(locale)`,
    )
    .eq("shoot_date", targetDate)
    .in("status", ["reserved", "confirmed"]);

  let sent = 0;
  for (const b of bookings ?? []) {
    if (!b.client_email) continue;
    const result = await runRule(
      "shoot_reminder",
      b.id,
      {
        client_name: b.client_name ?? "",
        shoot_date: b.shoot_date,
        shoot_time: b.shoot_time ?? "",
        location: b.location ?? "",
      },
      { to: b.client_email, locale: b.leads?.locale ?? "en" },
    );
    if (result.ok && !result.skipped) sent += 1;
  }
  return { targetDate, sent };
}

async function runUpsells(sb: ReturnType<typeof gogaAdmin>) {
  const { data: rule } = await sb
    .from("automation_rules")
    .select("enabled, delay_days")
    .eq("key", "upsell")
    .maybeSingle();
  if (!rule?.enabled) return { skipped: "disabled", sent: 0 };

  const cutoff = new Date(
    Date.now() - rule.delay_days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: deliveries } = await sb
    .from("deliveries")
    .select(
      `id, notified_at, booking_id,
       bookings(client_name, client_email, lead_id, leads(locale, stage))`,
    )
    .eq("archived", false)
    .not("notified_at", "is", null)
    .lte("notified_at", cutoff);

  const storeUrl = `${originForEmail()}/store`;
  let sent = 0;
  for (const d of deliveries ?? []) {
    const clientEmail = d.bookings?.client_email;
    if (!clientEmail) continue;
    const result = await runRule(
      "upsell",
      d.id,
      {
        client_name: d.bookings?.client_name ?? "",
        store_url: storeUrl,
        site_url: originForEmail(),
      },
      { to: clientEmail, locale: d.bookings?.leads?.locale ?? "en" },
    );
    if (result.ok && !result.skipped) {
      sent += 1;
      const leadId = d.bookings?.lead_id;
      if (leadId) {
        await sb.from("leads").update({ stage: "upsell" }).eq("id", leadId);
        await sb.from("lead_events").insert({
          lead_id: leadId,
          kind: "delivery.upsell_sent",
          payload: { deliveryId: d.id },
        });
      }
    }
  }
  return { cutoff, sent };
}

export async function GET(req: NextRequest) {
  // Fail closed, same shape as /api/cron/pinterest: an unset CRON_SECRET
  // must not leave the job callable by anyone.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron/automations] CRON_SECRET unset; rejecting");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = gogaAdmin();
  const [shootReminders, upsells] = await Promise.all([
    runShootReminders(sb),
    runUpsells(sb),
  ]);

  return NextResponse.json({ ok: true, shootReminders, upsells });
}
