/**
 * Event dispatcher — the surface API routes call after a write.
 *
 *   await dispatchEvent("order.created", { order: newOrderRow }, orgId);
 *
 * Looks up every enabled automation_rule for `(organization_id, event)`
 * and runs each one through the runtime. Errors are swallowed so a
 * misconfigured rule never breaks the originating write.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { runAutomation, type AutomationRule, type RunResult } from "./runtime";

export interface DispatchSummary {
  event: string;
  organization_id: number;
  rulesMatched: number;
  results: RunResult[];
}

export async function dispatchEvent(
  event: string,
  payload: Record<string, unknown>,
  organization_id: number,
): Promise<DispatchSummary> {
  let rules: AutomationRule[] = [];
  try {
    const sb = await createServerSupabaseClient();
    const { data, error } = await (sb as any)
      .from("automation_rule")
      .select(
        "id, organization_id, name, trigger_event, conditions, actions, enabled",
      )
      .eq("organization_id", organization_id)
      .eq("trigger_event", event)
      .eq("enabled", true);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[automation.dispatch] rules query failed", error.message);
      return { event, organization_id, rulesMatched: 0, results: [] };
    }
    rules = (data ?? []) as AutomationRule[];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[automation.dispatch] supabase init failed", e);
    return { event, organization_id, rulesMatched: 0, results: [] };
  }

  const results: RunResult[] = [];
  for (const rule of rules) {
    try {
      const r = await runAutomation(rule, { organization_id, event, payload });
      results.push(r);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[automation.dispatch] rule ${rule.id} threw`, e);
    }
  }

  return {
    event,
    organization_id,
    rulesMatched: rules.length,
    results,
  };
}
