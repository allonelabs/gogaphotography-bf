// ════════════════════════════════════════════════════════════════════════════
// team-store — server-only persistence for academy-forge state.
//
// Layout under each spawn (next to .bf/products.json from shop-store):
//   .bf/team-members.json  ← array of TeamMember (invited or active)
//   .bf/team-courses.json  ← array of TeamCourse (draft/published)
//
// Same /tmp-shadow fallback as shop-store: writes go to /tmp on Vercel,
// reads check /tmp first then fall back to the deployment seed.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

function isServerless(): boolean {
  return Boolean(process.env['VERCEL']) || process.env['NODE_ENV'] === 'production';
}

function writableRoot(): string {
  return isServerless() ? '/tmp/business-forge-out' : resolveOutRoot();
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'Operator' | 'Admin' | 'Viewer' | 'Editor';
  status: 'invited' | 'active' | 'suspended';
  groupIds: string[];
  enrolledCourseIds: string[];
  note: string;
  invitedAt: string;
  joinedAt: string | null;
}

export interface TeamCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  channel: 'manual' | 'ai-prompt' | 'ai-pdf' | 'ai-youtube' | 'ai-existing';
  audience: 'all-employees' | 'admins' | 'engineers' | 'sales' | 'support';
  lessons: Array<{
    id: string;
    title: string;
    body: string;
    slides: Array<{ id: string; title: string; body: string }>;
    quiz: Array<{ id: string; q: string; choices: string[]; correctIndex: number }>;
  }>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// ── Path helpers ───────────────────────────────────────────────────────

function bfPath(spawnId: string, file: string): string {
  return path.join(writableRoot(), spawnId, '.bf', file);
}

async function ensureBfDir(spawnId: string): Promise<void> {
  await mkdir(path.dirname(bfPath(spawnId, 'placeholder')), { recursive: true });
}

async function readJsonOrEmpty<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ── Members ────────────────────────────────────────────────────────────

export async function readMembers(spawnId: string): Promise<TeamMember[]> {
  if (!VALID_SPAWN_ID.test(spawnId)) return [];
  return readJsonOrEmpty<TeamMember>(bfPath(spawnId, 'team-members.json'));
}

export async function writeMembers(spawnId: string, members: TeamMember[]): Promise<void> {
  if (!VALID_SPAWN_ID.test(spawnId)) return;
  await ensureBfDir(spawnId);
  await writeFile(bfPath(spawnId, 'team-members.json'), JSON.stringify(members, null, 2), 'utf-8');
}

// ── Courses ────────────────────────────────────────────────────────────

export async function readCourses(spawnId: string): Promise<TeamCourse[]> {
  if (!VALID_SPAWN_ID.test(spawnId)) return [];
  return readJsonOrEmpty<TeamCourse>(bfPath(spawnId, 'team-courses.json'));
}

export async function writeCourses(spawnId: string, courses: TeamCourse[]): Promise<void> {
  if (!VALID_SPAWN_ID.test(spawnId)) return;
  await ensureBfDir(spawnId);
  await writeFile(bfPath(spawnId, 'team-courses.json'), JSON.stringify(courses, null, 2), 'utf-8');
}

// ── Append-only invites log (audit trail) ──────────────────────────────

export async function appendInviteLog(spawnId: string, entry: { email: string; role: string; at: string; note: string }): Promise<void> {
  if (!VALID_SPAWN_ID.test(spawnId)) return;
  await ensureBfDir(spawnId);
  await appendFile(bfPath(spawnId, 'team-invites.jsonl'), JSON.stringify(entry) + '\n', 'utf-8');
}

// ── Helpers used by API routes ─────────────────────────────────────────

export function emptyMember(email: string, role: TeamMember['role'] = 'Operator'): TeamMember {
  const now = new Date().toISOString();
  return {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    email,
    name: email.split('@')[0] ?? email,
    role,
    status: 'invited',
    groupIds: [],
    enrolledCourseIds: [],
    note: '',
    invitedAt: now,
    joinedAt: null,
  };
}

export function emptyCourse(opts: { title: string; channel: TeamCourse['channel']; description?: string; audience?: TeamCourse['audience'] }): TeamCourse {
  const now = new Date().toISOString();
  const baseSlug = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || `c${Math.random().toString(36).slice(2, 6)}`;
  return {
    id: `c_${Math.random().toString(36).slice(2, 8)}`,
    title: opts.title,
    slug: baseSlug,
    description: opts.description ?? '',
    status: 'draft',
    channel: opts.channel,
    audience: opts.audience ?? 'all-employees',
    lessons: [
      { id: `l_${Math.random().toString(36).slice(2, 6)}`, title: 'Lesson 1', body: '', slides: [{ id: `s_${Math.random().toString(36).slice(2, 6)}`, title: 'Cover', body: '' }], quiz: [] },
    ],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
