"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

export type WeekdayRule = {
  weekday: number;
  closed: boolean;
  start_time: string | null;
  end_time: string | null;
};

/**
 * `availability_rules` has no unique constraint on `weekday` (it's a plain
 * uuid-keyed table), so "upsert on weekday" isn't a single query — look up
 * each weekday's row (if any) and update it, otherwise insert one.
 */
export async function saveAvailabilityRules(
  rules: WeekdayRule[],
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: existing } = await sb
    .from("availability_rules")
    .select("id, weekday");
  const idByWeekday = new Map((existing ?? []).map((r) => [r.weekday, r.id]));

  for (const rule of rules) {
    if (rule.weekday < 0 || rule.weekday > 6) continue;
    const payload = {
      weekday: rule.weekday,
      closed: rule.closed,
      start_time: rule.closed ? null : rule.start_time,
      end_time: rule.closed ? null : rule.end_time,
    };
    const id = idByWeekday.get(rule.weekday);
    if (id) {
      await sb.from("availability_rules").update(payload).eq("id", id);
    } else {
      await sb.from("availability_rules").insert(payload);
    }
  }

  revalidatePath("/admin/availability");
}

export async function addBlackoutDate(
  date: string,
  reason: string,
): Promise<void> {
  await requireSession();
  if (!date) throw new Error("date is required");
  await gogaAdmin()
    .from("blackout_dates")
    .insert({ date, reason: reason.trim() || null });
  revalidatePath("/admin/availability");
}

export async function deleteBlackoutDate(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("blackout_dates").delete().eq("id", id);
  revalidatePath("/admin/availability");
}
