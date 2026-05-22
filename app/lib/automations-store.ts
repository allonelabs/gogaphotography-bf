// ════════════════════════════════════════════════════════════════════════════
// automations-store — server-only persistence for "when X happens, do Y" rules.
//
// Layout:
//   .bf/automations.json        ← array of AutomationRule
//   .bf/automations-log.jsonl   ← append-only execution log (Slice X wires runtime)
//
// Trigger catalogue mirrors the events the auto-tracker emits + form/order
// lifecycle. Action catalogue maps to existing tools (mail-forge, crm-spawn,
// ledger-spawn, webhook). Execution engine ships in Slice X — for now this
// surface stores config + lets operators test rules manually.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type TriggerEvent =
  | 'pageview' | 'cta_click' | 'form_submit' | 'outbound_click'
  | 'order_paid' | 'order_fulfilled' | 'order_refunded'
  | 'contact_added' | 'cart_abandoned' | 'lead_scored';

export type ActionKind =
  | 'send_email' | 'webhook' | 'tag_contact' | 'add_to_segment' | 'log_event' | 'slack_notify';

export interface TriggerFilter {
  field: string;
  op: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  value: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  trigger: { event: TriggerEvent; filters: TriggerFilter[] };
  actions: Array<{ kind: ActionKind; config: Record<string, unknown> }>;
  createdAt: string;
  updatedAt: string;
  /** Number of times this rule fired (informational; engine writes). */
  firedCount?: number;
  /** ISO of the last fire. */
  lastFiredAt?: string;
}

const DEFAULT: AutomationRule[] = [];

function rulesFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'automations.json');
}

export async function readRules(spawnId: string): Promise<AutomationRule[]> {
  const f = rulesFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as AutomationRule[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writeRules(spawnId: string, rules: AutomationRule[]): Promise<void> {
  const f = rulesFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(rules, null, 2), 'utf8');
}

// ── Catalogues used by the operator UI ────────────────────────────────────

export const TRIGGER_CATALOG: Array<{ event: TriggerEvent; label: string; description: string; example: string }> = [
  { event: 'pageview',       label: 'Pageview',                 description: 'A visitor loads any page on the spawned site.', example: 'Welcome banner on first /pricing visit.' },
  { event: 'cta_click',      label: 'CTA click',                description: 'Visitor clicks any [data-track] element.',       example: 'Tag the contact "intent:premium" on Pro CTA.' },
  { event: 'form_submit',    label: 'Form submit',              description: 'Visitor submits a form built in /s/website > Forms.', example: 'Send "thanks" email + Slack ping to ops.' },
  { event: 'outbound_click', label: 'Outbound link click',      description: 'Visitor clicks a link to another domain.',         example: 'Log partner-link clicks for affiliate tracking.' },
  { event: 'order_paid',     label: 'Order paid',               description: 'Stripe webhook marks an order as paid.',           example: 'Send receipt email + add contact to "buyer" segment.' },
  { event: 'order_fulfilled',label: 'Order fulfilled',          description: 'Operator marks an order shipped.',                 example: 'Send tracking number + ask for review.' },
  { event: 'order_refunded', label: 'Order refunded',           description: 'Operator processes a refund.',                     example: 'Send apology email + survey for cause.' },
  { event: 'contact_added',  label: 'Contact added',            description: 'A new email lands in any source.',                 example: 'Welcome email + add to drip sequence.' },
  { event: 'cart_abandoned', label: 'Cart abandoned',           description: 'Cart sits idle for 24 h without checkout.',        example: 'Recovery email with a 10% off coupon.' },
  { event: 'lead_scored',    label: 'Lead score crosses threshold', description: 'Lead score updates by lead-hunter or manual.', example: 'Hand off to sales when score > 80.' },
];

export const ACTION_CATALOG: Array<{ kind: ActionKind; label: string; description: string; configSchema: Record<string, string> }> = [
  { kind: 'send_email',     label: 'Send email',         description: 'Render + send a template via email-forge.',
    configSchema: { templateSlug: 'string', to: 'email | "{{contact.email}}"' } },
  { kind: 'webhook',        label: 'Webhook (HTTP POST)', description: 'POST a JSON payload to any URL — Zapier, Make, custom.',
    configSchema: { url: 'string', includeFullEvent: 'boolean' } },
  { kind: 'tag_contact',    label: 'Tag contact',         description: 'Add one or more tags to the contact identified by the event.',
    configSchema: { tags: 'string[] (comma-separated)' } },
  { kind: 'add_to_segment', label: 'Add to segment',      description: 'Push the contact into a named segment for downstream campaigns.',
    configSchema: { segment: 'string' } },
  { kind: 'log_event',      label: 'Log to feed',         description: 'Append a structured note to the contact\'s activity timeline.',
    configSchema: { note: 'string' } },
  { kind: 'slack_notify',   label: 'Slack notify',        description: 'Post a message to a Slack channel via webhook URL.',
    configSchema: { webhookUrl: 'string', message: 'string' } },
];

export function emptyRule(): AutomationRule {
  const now = new Date().toISOString();
  return {
    id: `r_${Math.random().toString(36).slice(2, 8)}`,
    name: 'When form submits, send confirmation',
    status: 'draft',
    trigger: { event: 'form_submit', filters: [] },
    actions: [{ kind: 'send_email', config: { templateSlug: 'form-thanks', to: '{{contact.email}}' } }],
    createdAt: now,
    updatedAt: now,
    firedCount: 0,
  };
}
