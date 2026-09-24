"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { renderTemplate, plainTextToHtml } from "./template-render";
import { Resend } from "resend";

export type AutomationRuleKey =
  | "booking_received"
  | "contract_sent"
  | "contract_signed"
  | "shoot_reminder"
  | "delivery_ready"
  | "upsell";

export async function updateAutomationRule(
  key: AutomationRuleKey,
  patch: {
    enabled: boolean;
    delay_days: number;
    notify_studio: boolean;
    subject_en: string;
    subject_ka: string;
    subject_ru: string;
    body_en: string;
    body_ka: string;
    body_ru: string;
  },
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { error } = await sb
    .from("automation_rules")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/automations");
}

/** Sample context used only for previews / test sends — never real data. */
const SAMPLE_CTX: Record<string, string> = {
  client_name: "Nino Beridze",
  package: "Full-day wedding",
  shoot_date: "2026-10-12",
  shoot_time: "14:00",
  location: "Old Tbilisi",
  total: "4,000 ₾",
  deposit: "1,200 ₾",
  sign_url: "https://gogaphotography.vercel.app/sign?t=sample",
  contract_url: "https://gogaphotography-bf.vercel.app/admin/contracts/sample",
  gallery_url: "https://gogaphotography-bf.vercel.app/gallery/sample",
  store_url: "https://gogaphotography.vercel.app/store",
  site_url: "https://gogaphotography.vercel.app",
  studio_email: "hello@goga.photography",
  studio_phone: "+995 599 12 34 56",
};

/**
 * Send a rendered preview of a rule to the signed-in admin. Never touches
 * `automation_log` — this isn't a real automation firing.
 */
export async function sendTestAutomation(
  key: AutomationRuleKey,
): Promise<void> {
  const { email } = await requireSession();
  const sb = gogaAdmin();
  const { data: rule } = await sb
    .from("automation_rules")
    .select("*")
    .eq("key", key)
    .single();
  if (!rule) throw new Error("rule_not_found");

  const subject = `[TEST] ${renderTemplate(rule.subject_en, SAMPLE_CTX)}`;
  const body = renderTemplate(rule.body_en, SAMPLE_CTX);

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const resend = new Resend(apiKey);
  const from =
    process.env["CONTACT_FROM_ADDRESS"] ?? "no-reply@goga.photography";
  const { error } = await resend.emails.send({
    from: `GOGA Photography <${from}>`,
    to: email,
    subject,
    html: plainTextToHtml(body),
    text: body,
  });
  if (error) throw new Error(error.message ?? "send failed");
}
