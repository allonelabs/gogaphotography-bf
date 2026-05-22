// plans-store — server-only persistence for subscription plans.
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Price in minor units (cents). */
  priceCents: number;
  currency: string;
  /** Billing interval. */
  interval: 'month' | 'year' | 'one-time';
  /** Bullet-point features list. */
  features: string[];
  /** Highlight badge ("Most popular", "Best value"). Empty = no badge. */
  badge: string;
  /** Free trial period in days; 0 = no trial. */
  trialDays: number;
  status: 'draft' | 'active' | 'archived';
  /** Stripe price/product IDs once provisioned. */
  stripePriceId?: string;
  stripeProductId?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: Plan[] = [];

function plansFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'plans.json');
}

export async function readPlans(spawnId: string): Promise<Plan[]> {
  const f = plansFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as Plan[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writePlans(spawnId: string, plans: Plan[]): Promise<void> {
  const f = plansFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(plans, null, 2), 'utf8');
}
