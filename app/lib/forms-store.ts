// ════════════════════════════════════════════════════════════════════════════
// forms-store — server-only persistence for spawned-site form definitions
// and submissions.
//
// Layout under each spawn:
//   out/<id>/site/.bf/forms.json                 — form definitions array
//   out/<id>/site/.bf/forms-submissions.jsonl    — append-only submissions
//
// JSONL is intentional: append-only writes are crash-safe, easy to scan, and
// trivially exportable (one row per submission).  When email-forge wires the
// "new lead" notification later, that worker just tails this file.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export type FieldKind = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'hidden';

export interface FormField {
  id: string;
  kind: FieldKind;
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select/radio
  helpText?: string;
}

export interface FormDef {
  id: string;
  name: string;
  /** Where the form lives in the spawned site. */
  routePath: string;
  /** Optional notify emails — picked up by a future email-forge bridge. */
  notifyEmails: string[];
  /** "thanks for submitting" message shown after success. */
  thankYou: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  formId: string;
  submittedAt: string;
  /** SHA-256 of the IP — never store raw IP. */
  ipHash: string;
  userAgent: string;
  values: Record<string, string>;
}

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export function formsFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'forms.json');
}

export function submissionsFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'forms-submissions.jsonl');
}

export async function readForms(spawnId: string): Promise<FormDef[]> {
  const file = formsFile(spawnId);
  if (!file) return [];
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as FormDef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeForms(spawnId: string, forms: FormDef[]): Promise<void> {
  const file = formsFile(spawnId);
  if (!file) throw new Error('invalid spawn id');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(forms, null, 2), 'utf8');
}

export async function appendSubmission(spawnId: string, sub: FormSubmission): Promise<void> {
  const file = submissionsFile(spawnId);
  if (!file) throw new Error('invalid spawn id');
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(sub) + '\n', 'utf8');
}

export async function readSubmissions(spawnId: string, formId?: string, limit = 200): Promise<FormSubmission[]> {
  const file = submissionsFile(spawnId);
  if (!file) return [];
  try {
    const raw = await readFile(file, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const all = lines.map((l) => JSON.parse(l) as FormSubmission);
    const filtered = formId ? all.filter((s) => s.formId === formId) : all;
    return filtered.slice(-limit).reverse(); // newest first
  } catch {
    return [];
  }
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function emptyForm(id: string): FormDef {
  const now = new Date().toISOString();
  return {
    id,
    name: 'Contact',
    routePath: '/contact',
    notifyEmails: [],
    thankYou: 'Thanks — we got your message and will reply within one business day.',
    fields: [
      { id: 'name',    kind: 'text',     label: 'Your name',  name: 'name',    required: true,  placeholder: 'Anya Petrov' },
      { id: 'email',   kind: 'email',    label: 'Email',      name: 'email',   required: true,  placeholder: 'you@example.com' },
      { id: 'message', kind: 'textarea', label: 'Message',    name: 'message', required: true,  placeholder: 'How can we help?' },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
