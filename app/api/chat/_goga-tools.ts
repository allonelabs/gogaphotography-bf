import "server-only";

import type { ToolDef } from "@/app/lib/llm-fallback";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { safeLike } from "@/app/lib/goga/safe-like";

export const GOGA_TOOLS: ToolDef[] = [
  {
    name: "today",
    description:
      "Return today's local date and time in the studio's timezone (Tbilisi). Use whenever the user asks about now/today/this week.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_leads",
    description:
      "List recent leads (most recent first). Optionally filter by stage. Returns at most 20 rows.",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          description:
            "Stage filter: lead, consultation, contract, shoot, delivery, upsell, won, lost",
        },
        limit: { type: "number", description: "Max rows, default 20" },
      },
    },
  },
  {
    name: "count_leads_by_stage",
    description: "Count active (non-archived) leads grouped by stage.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "find_lead",
    description:
      "Search leads by case-insensitive substring across name/email/phone. Returns up to 10 matches.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_upcoming_shoots",
    description:
      "List bookings whose shoot_date is today or in the future, ordered by date. Use for 'next shoots', 'what's coming up'.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Look-ahead window in days (default 30)",
        },
      },
    },
  },
  {
    name: "find_booking",
    description:
      "Search bookings by client name/email substring. Returns up to 10 matches with shoot date and status.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "revenue_summary",
    description:
      "Sum total_cents across completed/confirmed bookings between two dates (YYYY-MM-DD).",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD (exclusive)" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "awaiting_signature",
    description: "List contracts that are sent or viewed but not yet signed.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "recent_deliveries",
    description:
      "List the 10 most-recently-viewed client galleries with their view counts.",
    input_schema: { type: "object", properties: {} },
  },
];

export type GogaToolResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

export async function runGogaTool(
  name: string,
  input: Record<string, unknown>,
): Promise<GogaToolResult> {
  const sb = gogaAdmin();
  try {
    switch (name) {
      case "today": {
        const now = new Date();
        const fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Tbilisi",
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          ok: true,
          result: { tbilisi: fmt.format(now), iso: now.toISOString() },
        };
      }
      case "list_leads": {
        const stage = typeof input.stage === "string" ? input.stage : undefined;
        const limit = Math.min(
          typeof input.limit === "number" ? input.limit : 20,
          50,
        );
        let q = sb
          .from("leads")
          .select(
            "id, name, email, phone, stage, shoot_date, source, created_at",
          )
          .eq("archived", false)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (
          stage === "lead" ||
          stage === "consultation" ||
          stage === "contract" ||
          stage === "shoot" ||
          stage === "delivery" ||
          stage === "upsell" ||
          stage === "won" ||
          stage === "lost"
        ) {
          q = q.eq("stage", stage);
        }
        const { data, error } = await q;
        if (error) throw error;
        return { ok: true, result: data };
      }
      case "count_leads_by_stage": {
        const { data, error } = await sb
          .from("leads")
          .select("stage")
          .eq("archived", false);
        if (error) throw error;
        const counts: Record<string, number> = {};
        for (const r of data ?? []) {
          counts[r.stage] = (counts[r.stage] ?? 0) + 1;
        }
        return { ok: true, result: counts };
      }
      case "find_lead": {
        const query = String(input.query ?? "").trim();
        if (!query) return { ok: true, result: [] };
        const like = safeLike(query);
        const { data, error } = await sb
          .from("leads")
          .select(
            "id, name, email, phone, stage, shoot_date, source, created_at",
          )
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(10);
        if (error) throw error;
        return { ok: true, result: data };
      }
      case "list_upcoming_shoots": {
        const days = typeof input.days === "number" ? input.days : 30;
        const today = new Date();
        const start = today.toISOString().slice(0, 10);
        const end = new Date(today.getTime() + days * 86400000)
          .toISOString()
          .slice(0, 10);
        const { data, error } = await sb
          .from("bookings")
          .select(
            "id, client_name, client_email, shoot_date, shoot_time, location, status",
          )
          .gte("shoot_date", start)
          .lte("shoot_date", end)
          .order("shoot_date", { ascending: true })
          .limit(30);
        if (error) throw error;
        return { ok: true, result: data };
      }
      case "find_booking": {
        const query = String(input.query ?? "").trim();
        if (!query) return { ok: true, result: [] };
        const like = safeLike(query);
        const { data, error } = await sb
          .from("bookings")
          .select(
            "id, client_name, client_email, shoot_date, shoot_time, location, status, total_cents, currency",
          )
          .or(`client_name.ilike.${like},client_email.ilike.${like}`)
          .limit(10);
        if (error) throw error;
        return { ok: true, result: data };
      }
      case "revenue_summary": {
        const from = String(input.from ?? "");
        const to = String(input.to ?? "");
        if (!from || !to) return { ok: false, error: "from/to required" };
        const { data, error } = await sb
          .from("bookings")
          .select("total_cents, currency, status")
          .gte("shoot_date", from)
          .lt("shoot_date", to)
          .in("status", ["confirmed", "completed"]);
        if (error) throw error;
        const totals: Record<string, number> = {};
        let bookings = 0;
        for (const r of data ?? []) {
          totals[r.currency] = (totals[r.currency] ?? 0) + (r.total_cents ?? 0);
          bookings++;
        }
        return {
          ok: true,
          result: {
            bookings,
            totals: Object.fromEntries(
              Object.entries(totals).map(([cur, cents]) => [
                cur,
                (cents / 100).toFixed(2),
              ]),
            ),
          },
        };
      }
      case "awaiting_signature": {
        const { data, error } = await sb
          .from("contracts")
          .select(
            "id, status, signer_name, signer_email, sent_at, bookings(client_name, shoot_date)",
          )
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return { ok: true, result: data };
      }
      case "recent_deliveries": {
        const { data, error } = await sb
          .from("deliveries")
          .select(
            "id, token, view_count, last_viewed_at, password_hash, bookings(client_name)",
          )
          .eq("archived", false)
          .order("last_viewed_at", { ascending: false, nullsFirst: false })
          .limit(10);
        if (error) throw error;
        return { ok: true, result: data };
      }
      default:
        return { ok: false, error: `unknown tool ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "tool failed",
    };
  }
}
