// ════════════════════════════════════════════════════════════════════════════
// Server-side team-academy loader — surfaces the Qualige-class team LMS
// inside the operator UI's /s/team/* tree.
//
// Read order:
//   1. Walk <spawnOutDir>/.cells/academy-forge.course.<id>.json (+ siblings
//      for groups, enrollments, certificates, discussions, assignments).
//   2. If any course cell is found → use that, real-data mode.
//   3. Otherwise fall through to the mock fixture so first-spawn dev still
//      sees a populated team page.
//
// On-disk shape mirrors the UI types in mock-team-academy.ts so the round
// trip is one writeJson() / readJson() — no translation layer needed. The
// /api/team/courses/create route writes these files; this loader reads them.
//
// The brand snapshot is loaded alongside so every team-LMS page can apply the
// per-business identity automatically (CSS variable scope set in the layout).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  mockTeamAcademy,
  type MockTeamAcademyFixture,
  type TeamCourse,
  type TeamGroup,
  type TeamCertificate,
  type TeamDiscussion,
  type TeamAssignment,
} from '../data/mock-team-academy';
import { mockMembers, type MockMember } from '../data/mock-members';
import { loadBrandSnapshot, type BrandSnapshot } from './brand-loader';
import { resolveOutRoot } from './spawn-loader';

export type {
  MockTeamAcademyFixture as TeamAcademyDetail,
  TeamCourse,
  TeamLesson,
  TeamSlide,
  TeamCourseEnrollment,
  TeamGroup,
  TeamCertificate,
  TeamDiscussion,
  TeamAssignment,
  SlideKind,
} from '../data/mock-team-academy';

export interface TeamAcademySnapshot {
  detail: MockTeamAcademyFixture;
  brand: BrandSnapshot | null;
  /** When true, the data is the mock fixture (no academy-forge cells yet). */
  isFixture: boolean;
}

const ACADEMY_PREFIX = 'academy-forge.';

async function readJson<T>(abs: string): Promise<T | null> {
  try {
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Disk shape written by /api/team/members/invite — kept narrow on purpose. */
interface LearnerCell {
  id: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Operator' | 'Viewer';
  status: 'pending' | 'active' | 'suspended';
  invitedAt?: string;
  joinedAt?: string;
  lastActive?: string;
  invitationNote?: string;
  /** When set, supplied by the operator on invite (vs auto-generated). */
  name?: string;
}

function learnerCellToMember(l: LearnerCell): MockMember {
  const inferredName = l.name ?? l.email.split('@')[0]!.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // 2-letter avatar from name initials, fallback to first 2 letters of email.
  const initials = inferredName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || l.email.slice(0, 2).toUpperCase();
  return {
    id: l.id,
    name: inferredName,
    email: l.email,
    role: l.role,
    avatar: initials,
    lastActive: l.lastActive ?? (l.status === 'pending' ? '—' : 'now'),
    joinedAt: l.joinedAt ?? l.invitedAt ?? new Date().toISOString().slice(0, 10),
    status: l.status,
  };
}

interface CellsRead {
  members: MockMember[];           // real learners (academy-forge.learner.<id>.json)
  courses: TeamCourse[];
  groups: TeamGroup[];
  certificates: TeamCertificate[];
  discussions: TeamDiscussion[];
  assignments: TeamAssignment[];
}

async function readAcademyCells(spawnId: string): Promise<CellsRead | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  const dir = path.join(resolveOutRoot(), spawnId, '.cells');
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const out: CellsRead = { members: [], courses: [], groups: [], certificates: [], discussions: [], assignments: [] };

  // Pre-classify by filename, then fan out the JSON reads — every
  // /s/team/* page mounts re-reads every academy cell, and 6-cell-kind
  // serialization meant page latency scaled with cell count.
  type Kind = 'learner' | 'course' | 'group' | 'certificate' | 'discussion' | 'assignment';
  const KNOWN: ReadonlySet<Kind> = new Set(['learner', 'course', 'group', 'certificate', 'discussion', 'assignment']);
  interface Pending { kind: Kind; abs: string }
  const pending: Pending[] = [];
  for (const f of files) {
    if (!f.startsWith(ACADEMY_PREFIX) || !f.endsWith('.json')) continue;
    const stem = f.slice(ACADEMY_PREFIX.length, -'.json'.length);
    const [kindStr] = stem.split('.', 1);
    if (!kindStr || !KNOWN.has(kindStr as Kind)) continue;
    pending.push({ kind: kindStr as Kind, abs: path.join(dir, f) });
  }
  const parsed = await Promise.all(
    pending.map(async (p) => ({ kind: p.kind, value: await readJson<unknown>(p.abs) })),
  );
  for (const p of parsed) {
    if (!p.value) continue;
    switch (p.kind) {
      case 'learner': {
        const l = p.value as LearnerCell;
        if (typeof l.id === 'string' && typeof l.email === 'string') {
          out.members.push(learnerCellToMember(l));
        }
        break;
      }
      case 'course': {
        const c = p.value as TeamCourse;
        if (typeof c.id === 'string') out.courses.push(c);
        break;
      }
      case 'group': {
        const g = p.value as TeamGroup;
        if (typeof g.id === 'string') out.groups.push(g);
        break;
      }
      case 'certificate': {
        const c = p.value as TeamCertificate;
        if (typeof c.id === 'string') out.certificates.push(c);
        break;
      }
      case 'discussion': {
        const d = p.value as TeamDiscussion;
        if (typeof d.id === 'string') out.discussions.push(d);
        break;
      }
      case 'assignment': {
        const a = p.value as TeamAssignment;
        if (typeof a.id === 'string') out.assignments.push(a);
        break;
      }
    }
  }

  // Pending invites first (action-required), then active, then by name.
  out.members.sort((a, b) => {
    const rank = (m: MockMember) => (m.status === 'pending' ? 0 : m.status === 'active' ? 1 : 2);
    const dr = rank(a) - rank(b);
    return dr !== 0 ? dr : a.name.localeCompare(b.name);
  });
  // Sort courses by updatedAt desc (most-recently-edited first).
  out.courses.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  promoteOverdueEnrollments(out.courses);
  return out;
}

/**
 * Read-time status promotion: any enrollment with dueAt < today and status
 * !== 'complete' becomes 'overdue'. Pure mutation against the in-memory
 * TeamCourse[] — never writes back to disk (operator's intent on the cell
 * stays canonical; this is just what the operator sees on render). The
 * /api/team/enrollment endpoint is the only place that writes status.
 */
function promoteOverdueEnrollments(courses: TeamCourse[]): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const c of courses) {
    for (const e of c.enrollments) {
      if (e.status === 'complete') continue;
      if (!e.dueAt) continue;
      if (e.dueAt < today) {
        // We mutate in-place — the loader's caller treats the snapshot
        // as immutable, but the loader-internal mutation here is safe
        // because we only run it once before returning.
        (e as { status: string }).status = 'overdue';
      }
    }
  }
}

export async function loadTeamAcademy(spawnId: string): Promise<TeamAcademySnapshot> {
  // Brand is real even when academy data isn't — load in parallel.
  const [brand, real] = await Promise.all([
    loadBrandSnapshot(spawnId).catch(() => null),
    readAcademyCells(spawnId),
  ]);

  // Real-cells mode kicks in when there's anything authored — courses OR
  // learners. This way the operator can populate either side first.
  if (real && (real.courses.length > 0 || real.members.length > 0)) {
    // Members: real learners always come first; mockMembers fill the gap
    // up to a small floor so the demo isn't an empty roster on day one
    // when only one invite has been sent.
    const merged: MockMember[] = [...real.members];
    if (merged.length < 3) {
      for (const m of mockMembers) {
        if (merged.some((x) => x.email === m.email)) continue;
        merged.push(m);
        if (merged.length >= 6) break;
      }
    }
    const detail: MockTeamAcademyFixture = {
      members: merged,
      courses: real.courses,
      groups: real.groups.length > 0 ? real.groups : mockTeamAcademy.groups,
      certificates: real.certificates,
      discussions: real.discussions.length > 0 ? real.discussions : mockTeamAcademy.discussions,
      assignments: real.assignments,
    };
    return { detail, brand, isFixture: false };
  }

  return {
    detail: mockTeamAcademy,
    brand,
    isFixture: true,
  };
}

// ── small derived selectors for the UI layer ───────────────────────────────

export function totalProgress(detail: MockTeamAcademyFixture): {
  enrolledMemberCount: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  averageProgressPct: number;
  certificatesIssued: number;
} {
  const enrolledMembers = new Set<string>();
  let completedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;
  let progressSum = 0;
  let progressN = 0;

  for (const c of detail.courses) {
    for (const e of c.enrollments) {
      enrolledMembers.add(e.memberId);
      if (e.status === 'complete') completedCount += 1;
      else if (e.status === 'in-progress') inProgressCount += 1;
      else if (e.status === 'overdue') overdueCount += 1;
      progressSum += e.progressPct;
      progressN += 1;
    }
  }

  return {
    enrolledMemberCount: enrolledMembers.size,
    completedCount,
    inProgressCount,
    overdueCount,
    averageProgressPct: progressN === 0 ? 0 : Math.round(progressSum / progressN),
    certificatesIssued: detail.certificates.length,
  };
}

export function memberById(
  detail: MockTeamAcademyFixture,
  memberId: string,
): MockTeamAcademyFixture['members'][number] | null {
  return detail.members.find((m) => m.id === memberId) ?? null;
}

export function courseById(
  detail: MockTeamAcademyFixture,
  courseId: string,
): MockTeamAcademyFixture['courses'][number] | null {
  return detail.courses.find((c) => c.id === courseId) ?? null;
}

export function lessonByIds(
  detail: MockTeamAcademyFixture,
  courseId: string,
  lessonId: string,
): MockTeamAcademyFixture['courses'][number]['lessons'][number] | null {
  const c = courseById(detail, courseId);
  return c ? (c.lessons.find((l) => l.id === lessonId) ?? null) : null;
}

export function enrollmentsForMember(
  detail: MockTeamAcademyFixture,
  memberId: string,
): Array<{ course: MockTeamAcademyFixture['courses'][number]; enrollment: MockTeamAcademyFixture['courses'][number]['enrollments'][number] }> {
  const out: Array<{ course: MockTeamAcademyFixture['courses'][number]; enrollment: MockTeamAcademyFixture['courses'][number]['enrollments'][number] }> = [];
  for (const c of detail.courses) {
    const e = c.enrollments.find((x) => x.memberId === memberId);
    if (e) out.push({ course: c, enrollment: e });
  }
  return out;
}
