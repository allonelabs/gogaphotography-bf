import "server-only";

import { Resend } from "resend";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { renderTemplate, plainTextToHtml } from "./template-render";

export type AutomationLocale = "en" | "ka" | "ru";

export interface AutomationCtx {
  [key: string]: string | number | null | undefined;
}

export interface RunRuleOptions {
  to: string;
  locale?: AutomationLocale | string | null;
  /** Skip the automation_log write — used by "send test to me". */
  skipLog?: boolean;
}

export interface RunRuleResult {
  ok: boolean;
  skipped?: "disabled" | "already_sent" | "no_recipient";
  error?: string;
}

function pickLocale(locale?: string | null): AutomationLocale {
  return locale === "ka" || locale === "ru" ? locale : "en";
}

function originForEmail(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ??
    (process.env["VERCEL_URL"]
      ? `https://${process.env["VERCEL_URL"]}`
      : "http://localhost:3030")
  );
}

/** Common placeholders every rule gets for free, on top of the caller's ctx. */
async function commonCtx(): Promise<AutomationCtx> {
  const sb = gogaAdmin();
  // studio_info isn't in goga-types yet (same gap as actions-studio.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (sb as any)
    .from("studio_info")
    .select("email, phone")
    .eq("id", 1)
    .maybeSingle()) as {
    data: { email: string | null; phone: string | null } | null;
  };
  return {
    site_url: originForEmail(),
    studio_email: data?.email ?? "",
    studio_phone: data?.phone ?? "",
  };
}

async function sendMail(
  to: string,
  subject: string,
  bodyText: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    // No Resend key configured (e.g. local dev) — treat as a no-op success
    // so the caller can still log the attempt without crashing the flow.
    console.warn("[automation] RESEND_API_KEY unset; skipping send to", to);
    return { ok: true };
  }
  const resend = new Resend(key);
  const from =
    process.env["CONTACT_FROM_ADDRESS"] ?? "no-reply@goga.photography";
  const { error } = await resend.emails.send({
    from: `GOGA Photography <${from}>`,
    to,
    subject,
    html: plainTextToHtml(bodyText),
    text: bodyText,
  });
  if (error)
    return { ok: false, error: error.message ?? "unknown Resend error" };
  return { ok: true };
}

/**
 * Render + send one automation rule to a recipient, writing an
 * `automation_log` row (unique per rule_key + entity_id — a second call for
 * the same entity is a no-op, "already_sent"). Failures still write a row
 * with status "error" so retries aren't silently swallowed.
 */
export async function runRule(
  key: string,
  entityId: string,
  ctx: AutomationCtx,
  opts: RunRuleOptions,
): Promise<RunRuleResult> {
  const sb = gogaAdmin();
  const { data: rule } = await sb
    .from("automation_rules")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (!rule || !rule.enabled) return { ok: true, skipped: "disabled" };
  if (!opts.to) return { ok: true, skipped: "no_recipient" };

  if (!opts.skipLog) {
    const { data: existing } = await sb
      .from("automation_log")
      .select("id")
      .eq("rule_key", key)
      .eq("entity_id", entityId)
      .maybeSingle();
    if (existing) return { ok: true, skipped: "already_sent" };
  }

  const locale = pickLocale(opts.locale);
  const merged: AutomationCtx = { ...(await commonCtx()), ...ctx };
  const subjectTpl =
    locale === "ka"
      ? rule.subject_ka
      : locale === "ru"
        ? rule.subject_ru
        : rule.subject_en;
  const bodyTpl =
    locale === "ka"
      ? rule.body_ka
      : locale === "ru"
        ? rule.body_ru
        : rule.body_en;

  const subject = renderTemplate(subjectTpl || "", merged);
  const body = renderTemplate(bodyTpl || "", merged);

  const result = await sendMail(opts.to, subject, body);

  if (rule.notify_studio && merged["studio_email"]) {
    await sendMail(
      String(merged["studio_email"]),
      `[Studio alert] ${subject}`,
      `Automation "${key}" fired for ${merged["client_name"] ?? "a client"}.\n\n${body}`,
    ).catch(() => {});
  }

  if (!opts.skipLog) {
    await sb.from("automation_log").insert({
      rule_key: key,
      entity_id: entityId,
      recipient: opts.to,
      status: result.ok ? "sent" : "error",
      error: result.ok ? null : (result.error ?? "send failed"),
    });
  }

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
