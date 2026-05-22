/**
 * Automation runtime — evaluates conditions, expands templates, queues
 * actions onto the outbox.
 *
 * Adapted from BF's automation-runtime.ts. Major differences:
 *   - Single-org-per-row tenancy (organization_id is on the rule + the
 *     event payload).
 *   - No filesystem cells — execution log lives in audit_log (writes to
 *     automation_rule go through the audit trigger automatically).
 *   - Actions queue onto the outbox; the drain delivers them. This keeps
 *     the runtime synchronous and replay-safe.
 */
import "server-only";

import { enqueueOutbound } from "@/app/lib/outbox/singleton";
import { getAction } from "./catalog";

export interface AutomationRule {
  id: number;
  organization_id: number;
  name: string;
  trigger_event: string;
  conditions: Record<string, unknown> | null;
  actions: Array<Record<string, unknown>>;
  enabled: boolean;
}

export interface RunContext {
  organization_id: number;
  event: string;
  payload: Record<string, unknown>;
}

export interface RunResult {
  ok: boolean;
  ruleId: number;
  actionsQueued: number;
  outboxEventIds: number[];
  skipped?: string;
  errors?: string[];
}

/**
 * Run a single rule against an event payload. Idempotent enough: each
 * action enqueues with a deterministic key derived from `(rule.id,
 * event.id, action.index)` so re-firing the same dispatch on the same
 * event doesn't double-deliver.
 */
export async function runAutomation(
  rule: AutomationRule,
  ctx: RunContext,
): Promise<RunResult> {
  if (!rule.enabled) {
    return {
      ok: true,
      ruleId: rule.id,
      actionsQueued: 0,
      outboxEventIds: [],
      skipped: "rule_disabled",
    };
  }

  if (rule.trigger_event !== ctx.event) {
    return {
      ok: true,
      ruleId: rule.id,
      actionsQueued: 0,
      outboxEventIds: [],
      skipped: "event_mismatch",
    };
  }

  if (!evaluateConditions(rule.conditions, ctx.payload)) {
    return {
      ok: true,
      ruleId: rule.id,
      actionsQueued: 0,
      outboxEventIds: [],
      skipped: "conditions_unmet",
    };
  }

  const outboxIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rule.actions.length; i++) {
    const action = rule.actions[i];
    if (!action) continue;
    try {
      const id = await queueAction(rule, ctx, action, i);
      if (id != null) outboxIds.push(id);
    } catch (e) {
      errors.push(`action[${i}]: ${(e as Error).message}`);
    }
  }

  return {
    ok: errors.length === 0,
    ruleId: rule.id,
    actionsQueued: outboxIds.length,
    outboxEventIds: outboxIds,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

/**
 * Tiny condition evaluator — handles a small set of operators that cover
 * the documented use cases without pulling in a JSON-logic dependency.
 *
 * Conditions shape:
 *   { "total_gt": 1000, "client_country": "GE", "field.is_present": true }
 *
 * Each key is interpreted as `<path>[_operator]`. Operators:
 *   - `_gt`, `_gte`, `_lt`, `_lte` — numeric compare
 *   - `_eq` (default), `_ne`
 *   - `_in` — value must be one of the array
 *   - `_present` — true means the path resolves to a non-null value
 */
export function evaluateConditions(
  conditions: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown>,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  for (const [key, expected] of Object.entries(conditions)) {
    const m = key.match(/^(.+?)_(gt|gte|lt|lte|eq|ne|in|present)$/);
    const op = m ? m[2] : "eq";
    const path = m ? (m[1] ?? key) : key;
    const actual = readPath(payload, path);

    switch (op) {
      case "eq":
        if (actual !== expected) return false;
        break;
      case "ne":
        if (actual === expected) return false;
        break;
      case "gt":
        if (!(Number(actual) > Number(expected))) return false;
        break;
      case "gte":
        if (!(Number(actual) >= Number(expected))) return false;
        break;
      case "lt":
        if (!(Number(actual) < Number(expected))) return false;
        break;
      case "lte":
        if (!(Number(actual) <= Number(expected))) return false;
        break;
      case "in":
        if (!Array.isArray(expected) || !expected.includes(actual as never))
          return false;
        break;
      case "present":
        if (Boolean(expected) !== (actual != null && actual !== ""))
          return false;
        break;
    }
  }
  return true;
}

function readPath(obj: unknown, dottedPath: string): unknown {
  const parts = dottedPath.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (
      cur &&
      typeof cur === "object" &&
      p in (cur as Record<string, unknown>)
    ) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * Replace `{{path.to.value}}` placeholders in `template` with values from
 * `payload`. Unknown paths render as empty string.
 */
export function expandTemplate(
  template: string,
  payload: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const v = readPath(payload, path);
    if (v == null) return "";
    return String(v);
  });
}

async function queueAction(
  rule: AutomationRule,
  ctx: RunContext,
  action: Record<string, unknown>,
  index: number,
): Promise<number | null> {
  const kind = String(action.kind ?? "");
  const def = getAction(kind);
  if (!def) {
    throw new Error(`unknown action kind: ${kind}`);
  }

  // Expand all string fields in the action against the payload.
  const expanded: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(action)) {
    if (k === "kind") continue;
    expanded[k] = typeof v === "string" ? expandTemplate(v, ctx.payload) : v;
  }

  switch (kind) {
    case "send_email": {
      // The `to` field may be an explicit address OR a `to_field` pointing
      // at the payload (e.g. "client_email"). Resolve.
      const to =
        typeof expanded.to === "string" && expanded.to.includes("@")
          ? (expanded.to as string)
          : typeof expanded.to_field === "string"
            ? ((readPath(ctx.payload, expanded.to_field as string) as string) ??
              "")
            : (expanded.to as string);
      if (!to) {
        throw new Error("send_email: no `to` address resolved");
      }
      const subject = String(expanded.subject ?? "");
      const body = String(expanded.body ?? "");
      const html = body.startsWith("<")
        ? body
        : `<p>${body.replace(/\n/g, "<br>")}</p>`;
      const enq = await enqueueOutbound({
        kind: "email.send",
        organization_id: ctx.organization_id,
        payload: { to, subject, html, text: body, from: undefined },
        idempotencyKey: `rule:${rule.id}:event:${ctx.event}:idx:${index}:${stableHash(ctx.payload)}`,
      });
      return enq.id;
    }

    case "create_payment_link":
    case "webhook.outbound":
    case "update_field": {
      // Generic path — drop the action descriptor on the outbox so a
      // dedicated handler (registered later) processes it. Today these
      // kinds have no registered handlers, so the drain marks them as
      // `sent` with `no_handler_registered:<kind>` — clean visibility.
      const enq = await enqueueOutbound({
        kind: kind,
        organization_id: ctx.organization_id,
        payload: { ...expanded, _rule_id: rule.id, _event: ctx.event },
        idempotencyKey: `rule:${rule.id}:event:${ctx.event}:idx:${index}:${stableHash(ctx.payload)}`,
      });
      return enq.id;
    }

    default:
      throw new Error(`unhandled action kind: ${kind}`);
  }
}

function stableHash(obj: unknown): string {
  // Cheap, deterministic-enough hash for idempotency keys. NOT cryptographic.
  const str = JSON.stringify(
    obj,
    Object.keys(obj as Record<string, unknown>).sort(),
  );
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
