// account-billing-store — server-only persistence for AllOnce's own
// subscription state (operator's plan on the AllOnce product itself).
//
// Distinct from plans-store (which is per-spawn — a spawn defines plans for
// THEIR customers). This store tracks the operator's plan ON AllOnce + the
// invoice ledger of real charges through us.
//
// Single-tenant MVP: file at out/_account/billing.json. Once auth is wired
// for multi-org, key by orgId. Mission goal needs ≥1 real Stripe charge,
// and that real charge will append to `invoices[]` here.
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export type PlanId = 'pilot' | 'team' | 'custom';

export interface AccountInvoice {
  id: string;                       // INV-… or stripe-… invoice id
  date: string;                     // ISO timestamp
  amountCents: number;              // 0 if status == 'pending'
  currency: string;                 // 'USD'
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  source: 'stripe' | 'polar' | 'manual';
  externalId?: string;              // Stripe / Polar payment id, if any
}

export interface AccountBilling {
  /** Active plan; 'custom' = sales-led, no auto-charge. */
  plan: PlanId;
  /** ISO timestamp of last switch (helps prorate when Stripe is wired). */
  planChangedAt: string;
  /** Stripe / Polar customer id once provisioned. */
  paymentCustomerId?: string;
  /** Last 4 of card on file; empty until real PM is attached. */
  paymentMethodLast4?: string;
  /** 'visa' | 'mastercard' | …; same caveat. */
  paymentMethodBrand?: string;
  /** Append-only ledger of real (or pending) charges. */
  invoices: AccountInvoice[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: AccountBilling = {
  plan: 'pilot',
  planChangedAt: new Date(0).toISOString(),
  invoices: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function billingFile(): string {
  return path.join(resolveOutRoot(), '_account', 'billing.json');
}

export async function readAccountBilling(): Promise<AccountBilling> {
  try {
    const raw = await readFile(billingFile(), 'utf8');
    const parsed = JSON.parse(raw) as AccountBilling;
    if (!parsed || typeof parsed !== 'object' || !parsed.plan) return DEFAULT;
    return parsed;
  } catch {
    return DEFAULT;
  }
}

export async function writeAccountBilling(b: AccountBilling): Promise<void> {
  const f = billingFile();
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(b, null, 2) + '\n', 'utf8');
}

export async function setPlan(plan: PlanId): Promise<AccountBilling> {
  const now = new Date().toISOString();
  const current = await readAccountBilling();
  const seeded = current.createdAt === DEFAULT.createdAt
    ? { ...current, createdAt: now }
    : current;
  const next: AccountBilling = {
    ...seeded,
    plan,
    planChangedAt: now,
    updatedAt: now,
  };
  await writeAccountBilling(next);
  return next;
}

export async function appendInvoice(invoice: AccountInvoice): Promise<AccountBilling> {
  const now = new Date().toISOString();
  const current = await readAccountBilling();
  const next: AccountBilling = {
    ...current,
    invoices: [...current.invoices, invoice],
    updatedAt: now,
    createdAt: current.createdAt === DEFAULT.createdAt ? now : current.createdAt,
  };
  await writeAccountBilling(next);
  return next;
}
