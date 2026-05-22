// policies-store — server-only persistence for legal policy documents.
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type PolicyKind = 'privacy' | 'terms' | 'cookies' | 'dpa' | 'refund' | 'shipping' | 'acceptable-use' | 'custom';

export interface Policy {
  id: string;
  kind: PolicyKind;
  title: string;
  slug: string;
  bodyMarkdown: string;
  jurisdiction: string;
  status: 'draft' | 'published';
  effectiveAt: string;
  /** Lawyer-reviewed badge — operator marks this when reviewed. */
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: Policy[] = [];

function policiesFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'policies.json');
}

export async function readPolicies(spawnId: string): Promise<Policy[]> {
  const f = policiesFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as Policy[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writePolicies(spawnId: string, policies: Policy[]): Promise<void> {
  const f = policiesFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(policies, null, 2), 'utf8');
}

export const POLICY_TEMPLATES: Record<PolicyKind, { title: string; slug: string; starter: string }> = {
  privacy:    { title: 'Privacy Policy',     slug: 'privacy',     starter: '# Privacy Policy\n\nWe collect the following data…' },
  terms:      { title: 'Terms of Service',    slug: 'terms',       starter: '# Terms of Service\n\nThese terms govern your use of…' },
  cookies:    { title: 'Cookie Policy',       slug: 'cookies',     starter: '# Cookie Policy\n\nWe use the following cookies…' },
  dpa:        { title: 'Data Processing Agreement', slug: 'dpa',   starter: '# Data Processing Agreement\n\nThis DPA forms part of…' },
  refund:     { title: 'Refund Policy',       slug: 'refunds',     starter: '# Refund Policy\n\nRefunds are available within…' },
  shipping:   { title: 'Shipping Policy',     slug: 'shipping',    starter: '# Shipping Policy\n\nWe ship to the following regions…' },
  'acceptable-use': { title: 'Acceptable Use Policy', slug: 'acceptable-use', starter: '# Acceptable Use Policy\n\nYou agree not to…' },
  custom:     { title: 'Custom Policy',       slug: 'custom',      starter: '# Custom Policy\n\nDocument your custom policy here.' },
};
