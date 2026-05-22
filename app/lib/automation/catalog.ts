/**
 * Automation catalog — the registry of available triggers + actions.
 *
 * Adapted from BF's automation-catalog.ts but trimmed to travelplace-bf's
 * actual surface area: orders, refunds, balance, hotels, audit. Each
 * trigger fires `dispatchEvent(event, payload, organization_id)` (see
 * dispatcher.ts). Each action is a handler registered in the outbox drain
 * (e.g. `send_email` → email handler).
 */
import "server-only";

export interface TriggerDef {
  event: string;
  label: string;
  /** JSON-path-style sample keys the conditions can reference. */
  payloadKeys: string[];
}

export interface ActionDef {
  kind: string;
  label: string;
  cost: "free" | "paid";
  /** JSON-schema-style required fields. */
  required: string[];
}

export const TRIGGERS: TriggerDef[] = [
  {
    event: "order.created",
    label: "Order created",
    payloadKeys: [
      "order.id",
      "order.client_first_name",
      "order.client_last_name",
      "order.client_email",
      "order.client_phone",
      "order.all_sell_price",
      "order.client_country",
    ],
  },
  {
    event: "order.paid",
    label: "Order paid",
    payloadKeys: ["order.id", "order.all_sell_price"],
  },
  {
    event: "order.refunded",
    label: "Order refunded",
    payloadKeys: ["order.id", "refund.amount"],
  },
  {
    event: "hotel.created",
    label: "Hotel added to catalog",
    payloadKeys: ["hotel.id", "hotel.name", "hotel.country"],
  },
  {
    event: "audit.entry",
    label: "Audit log entry",
    payloadKeys: ["action", "table_name", "actor_email"],
  },
];

export const ACTIONS: ActionDef[] = [
  {
    kind: "send_email",
    label: "Send email",
    cost: "paid",
    required: ["to", "subject", "body"],
  },
  {
    kind: "create_payment_link",
    label: "Create Stripe payment link",
    cost: "paid",
    required: ["amount_cents", "currency", "description"],
  },
  {
    kind: "update_field",
    label: "Update field on the trigger row",
    cost: "free",
    required: ["table", "field", "value"],
  },
  {
    kind: "webhook.outbound",
    label: "Call outbound webhook",
    cost: "paid",
    required: ["url"],
  },
];

export function getTrigger(event: string): TriggerDef | undefined {
  return TRIGGERS.find((t) => t.event === event);
}

export function getAction(kind: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.kind === kind);
}

export interface ValidationIssue {
  level: "error" | "warn";
  field: string;
  message: string;
}

export interface DraftRule {
  name: string;
  trigger_event: string;
  conditions?: Record<string, unknown> | null;
  actions: Array<{ kind: string; [k: string]: unknown }>;
}

export function validateDraft(draft: DraftRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!draft.name || draft.name.trim() === "") {
    issues.push({
      level: "error",
      field: "name",
      message: "Name is required.",
    });
  }

  if (!draft.trigger_event) {
    issues.push({
      level: "error",
      field: "trigger_event",
      message: "Pick a trigger event.",
    });
  } else if (!getTrigger(draft.trigger_event)) {
    issues.push({
      level: "error",
      field: "trigger_event",
      message: `Unknown trigger event "${draft.trigger_event}".`,
    });
  }

  if (!Array.isArray(draft.actions) || draft.actions.length === 0) {
    issues.push({
      level: "error",
      field: "actions",
      message: "Add at least one action.",
    });
  } else {
    draft.actions.forEach((a, i) => {
      const def = getAction(a.kind);
      if (!def) {
        issues.push({
          level: "error",
          field: `actions[${i}].kind`,
          message: `Unknown action kind "${a.kind}".`,
        });
        return;
      }
      for (const r of def.required) {
        if (!(r in a) || a[r] === null || a[r] === "") {
          issues.push({
            level: "error",
            field: `actions[${i}].${r}`,
            message: `Action "${a.kind}" requires field "${r}".`,
          });
        }
      }
    });
  }

  return issues;
}
