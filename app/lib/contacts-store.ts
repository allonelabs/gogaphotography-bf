// ════════════════════════════════════════════════════════════════════════════
// contacts-store — derives a unified customer list from existing data sources:
//   • .bf/forms-submissions.jsonl   (form leads → contacts)
//   • .bf/orders.jsonl              (order purchasers → contacts)
//   • .bf/contacts.json             (manual adds + operator notes)
//
// Contact identity is the email address (lowercased). Activity is the merged
// stream of submissions + orders + future events for a given email.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export interface ManualContact {
  email: string;
  name?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  addedAt: string;
}

export interface ContactRow {
  email: string;
  name: string;
  phone: string;
  tags: string[];
  notes: string;
  /** Earliest contact event we've seen. */
  firstSeenAt: string;
  /** Latest contact event we've seen. */
  lastSeenAt: string;
  /** Counts per source. */
  formSubmissions: number;
  orders: number;
  /** Total revenue from this email's orders, in minor units. */
  totalCents: number;
  currency: string;
  /** Tags inferred from sources (in addition to manual tags). */
  source: Array<'form' | 'order' | 'manual'>;
}

export interface ActivityItem {
  at: string;
  kind: 'form_submission' | 'order' | 'note';
  summary: string;
  detail: Record<string, string | number>;
}

interface FormSubmission { formId: string; submittedAt: string; values: Record<string, string> }
interface Order { id: string; at: string; status: string; customerEmail: string; customerName: string; totalCents: number; currency: string; items?: Array<{ name?: string; qty?: number }> }

function contactsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'contacts.json');
}

function submissionsPath(id: string): string {
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'forms-submissions.jsonl');
}

function ordersPath(id: string): string {
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'orders.jsonl');
}

async function readJsonl<T>(p: string): Promise<T[]> {
  try {
    const raw = await readFile(p, 'utf8');
    return raw.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as T);
  } catch { return []; }
}

export async function readManualContacts(spawnId: string): Promise<ManualContact[]> {
  const f = contactsFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as ManualContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function writeManualContacts(spawnId: string, contacts: ManualContact[]): Promise<void> {
  const f = contactsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(contacts, null, 2), 'utf8');
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function pickEmail(values: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(values)) {
    if (k.toLowerCase().includes('email') && isEmail(v)) return v.toLowerCase();
    if (isEmail(v)) return v.toLowerCase();
  }
  return null;
}

function pickName(values: Record<string, string>): string {
  for (const k of Object.keys(values)) {
    if (k.toLowerCase().includes('name')) return values[k] ?? '';
  }
  return '';
}

function pickPhone(values: Record<string, string>): string {
  for (const k of Object.keys(values)) {
    if (k.toLowerCase().match(/(phone|tel|mobile)/)) return values[k] ?? '';
  }
  return '';
}

export async function readContacts(spawnId: string): Promise<ContactRow[]> {
  if (!VALID_SPAWN_ID.test(spawnId)) return [];

  const [submissions, orders, manual] = await Promise.all([
    readJsonl<FormSubmission>(submissionsPath(spawnId)),
    readJsonl<Order>(ordersPath(spawnId)),
    readManualContacts(spawnId),
  ]);

  const map = new Map<string, ContactRow>();
  function ensure(email: string): ContactRow {
    const lower = email.toLowerCase();
    let r = map.get(lower);
    if (!r) {
      r = {
        email: lower,
        name: '', phone: '', tags: [], notes: '',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: '0000-01-01T00:00:00.000Z',
        formSubmissions: 0, orders: 0, totalCents: 0,
        currency: 'USD',
        source: [],
      };
      map.set(lower, r);
    }
    return r;
  }

  // 1) Form submissions
  for (const s of submissions) {
    const email = pickEmail(s.values);
    if (!email) continue;
    const r = ensure(email);
    if (s.submittedAt < r.firstSeenAt || r.firstSeenAt === r.lastSeenAt /* sentinel */) {
      if (s.submittedAt && s.submittedAt < r.firstSeenAt) r.firstSeenAt = s.submittedAt;
    }
    if (s.submittedAt > r.lastSeenAt) r.lastSeenAt = s.submittedAt;
    if (!r.name) r.name = pickName(s.values);
    if (!r.phone) r.phone = pickPhone(s.values);
    r.formSubmissions += 1;
    if (!r.source.includes('form')) r.source.push('form');
  }

  // 2) Orders
  for (const o of orders) {
    if (!o.customerEmail) continue;
    const r = ensure(o.customerEmail);
    if (o.at < r.firstSeenAt) r.firstSeenAt = o.at;
    if (o.at > r.lastSeenAt) r.lastSeenAt = o.at;
    if (!r.name) r.name = o.customerName ?? '';
    r.orders += 1;
    if (o.status === 'paid' || o.status === 'fulfilled') {
      r.totalCents += o.totalCents;
      r.currency = o.currency ?? r.currency;
    }
    if (!r.source.includes('order')) r.source.push('order');
  }

  // 3) Manual contacts (overrides + adds)
  for (const m of manual) {
    if (!m.email) continue;
    const r = ensure(m.email);
    if (m.name)  r.name  = m.name;
    if (m.phone) r.phone = m.phone;
    if (m.notes) r.notes = m.notes;
    if (Array.isArray(m.tags)) r.tags = m.tags;
    if (m.addedAt && m.addedAt < r.firstSeenAt) r.firstSeenAt = m.addedAt;
    if (!r.source.includes('manual')) r.source.push('manual');
  }

  // Sort by lastSeen desc
  const out = Array.from(map.values());
  out.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  return out;
}

export async function readActivity(spawnId: string, email: string): Promise<ActivityItem[]> {
  const lower = email.toLowerCase();
  if (!isEmail(lower)) return [];

  const [submissions, orders] = await Promise.all([
    readJsonl<FormSubmission>(submissionsPath(spawnId)),
    readJsonl<Order>(ordersPath(spawnId)),
  ]);

  const out: ActivityItem[] = [];

  for (const s of submissions) {
    const eml = pickEmail(s.values);
    if (eml !== lower) continue;
    out.push({
      at: s.submittedAt,
      kind: 'form_submission',
      summary: `Submitted form ${s.formId}`,
      detail: { ...s.values, formId: s.formId },
    });
  }

  for (const o of orders) {
    if (o.customerEmail?.toLowerCase() !== lower) continue;
    const itemsLabel = (o.items ?? []).map((i) => `${i.qty ?? 1}× ${i.name ?? '?'}`).join(', ');
    out.push({
      at: o.at,
      kind: 'order',
      summary: `Order ${o.id} · ${o.status} · ${itemsLabel || '—'}`,
      detail: { id: o.id, status: o.status, totalCents: o.totalCents, currency: o.currency },
    });
  }

  out.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}
