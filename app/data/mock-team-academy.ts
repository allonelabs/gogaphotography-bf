// Per-business team-academy mock fixture.
// Shape mirrors what academy-forge cells will eventually populate via
// .cells/academy-forge.{course,lesson,slide,quiz,enrollment,certificate}.json
// and the academy-forge schema (53 tables, see src/lib/academy-forge/schema-sql.ts).
// The loader at app/lib/team-academy-loader.ts swaps mock for real once cells write.

import { mockMembers, type MockMember } from './mock-members';

export type SlideKind =
  | 'cover'
  | 'text'
  | 'image'
  | 'video'
  | 'code'
  | 'quiz'
  | 'embed'
  | 'callout';

export interface TeamSlide {
  id: string;
  kind: SlideKind;
  title?: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  language?: string;
  code?: string;
  quizRef?: string;
  durationMin?: number;
}

export type QuizQuestionKind = 'multi-choice' | 'short-answer' | 'code' | 'true-false';

export interface TeamQuizQuestion {
  id: string;
  kind: QuizQuestionKind;
  prompt: string;
  /** Multi-choice: 2-6 options. True-false: ['True','False']. Else absent. */
  options?: string[];
  /** Index into options[] for the correct answer; required for multi-choice + true-false. */
  correctIndex?: number;
  /** Optional explanation shown after the learner answers. */
  explanation?: string;
}

export interface TeamLesson {
  id: string;
  title: string;
  summary: string;
  durationMin: number;
  slides: TeamSlide[];
  /** Denormalized count — kept for list views. Source of truth is `quiz.length`. */
  quizCount: number;
  /** Optional persisted quiz items. Empty/absent on legacy lessons. */
  quiz?: TeamQuizQuestion[];
  hasDiscussion: boolean;
  draft: boolean;
}

export interface TeamCourseEnrollment {
  memberId: string;
  progressPct: number;
  status: 'not-started' | 'in-progress' | 'complete' | 'overdue';
  startedAt?: string;
  dueAt?: string;
  completedAt?: string;
}

export interface TeamCourse {
  id: string;
  slug: string;
  title: string;
  summary: string;
  ownerId: string;
  audience: 'all-employees' | 'admins' | 'engineers' | 'sales' | 'support';
  status: 'draft' | 'published' | 'archived';
  durationMin: number;
  lessons: TeamLesson[];
  enrollments: TeamCourseEnrollment[];
  createdAt: string;
  updatedAt: string;
  /** Source mode used to author the course (Qualige authoring channels). */
  authoredVia: 'manual' | 'ai-prompt' | 'ai-pdf' | 'ai-youtube' | 'imported';
  /** Version-bumps each time published. */
  version: number;
}

export interface TeamGroup {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  assignedCourseIds: string[];
}

export interface TeamCertificate {
  id: string;
  memberId: string;
  courseId: string;
  issuedAt: string;
  hash: string;
}

export interface TeamDiscussionReply {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TeamDiscussion {
  id: string;
  courseId: string;
  lessonId: string;
  authorId: string;
  body: string;
  createdAt: string;
  /** Number of replies — kept as a denormalized count for list views. */
  replies: number;
  /** Optional persisted reply records. List-view ignores; detail-view reads. */
  replyList?: TeamDiscussionReply[];
}

export interface TeamAssignment {
  id: string;
  courseId: string;
  audience: 'all-employees' | 'admins' | 'engineers' | 'sales' | 'support' | 'group';
  groupId?: string;
  dueAt: string;
  reminderSent: boolean;
}

export interface MockTeamAcademyFixture {
  members: MockMember[];
  courses: TeamCourse[];
  groups: TeamGroup[];
  certificates: TeamCertificate[];
  discussions: TeamDiscussion[];
  assignments: TeamAssignment[];
}

const sampleSlides = (cid: string, lid: string, count: number): TeamSlide[] => {
  const kinds: SlideKind[] = ['cover', 'text', 'image', 'video', 'code', 'callout', 'quiz'];
  return Array.from({ length: count }, (_, i) => ({
    id: `${cid}-${lid}-s${i + 1}`,
    kind: i === 0 ? 'cover' : kinds[i % kinds.length]!,
    title: i === 0 ? 'Lesson cover' : `Section ${i}`,
    body:
      i === 0
        ? undefined
        : 'A concise paragraph teaching the reader the next concept. ' +
          'Replaceable in the slide editor; AI-authored via the lesson-writer cell.',
    imageUrl: i % 3 === 2 ? `/api/og?title=Slide+${i + 1}` : undefined,
    durationMin: 1,
  }));
};

// Mock data emptied — pages relying on this fixture render empty states.
// Real spawn data flows through `loadSpawnDetail` and the cell loader.
const _legacyMockTeamAcademy: MockTeamAcademyFixture = {
  members: mockMembers,
  groups: [
    { id: 'g1', name: 'Engineering', description: 'Backend + frontend + ops', memberIds: ['m2', 'm3', 'm4'], assignedCourseIds: ['c1', 'c2'] },
    { id: 'g2', name: 'Onboarding · Q2', description: 'Hires from April–June 2026', memberIds: ['m4', 'm5', 'm6'], assignedCourseIds: ['c1'] },
    { id: 'g3', name: 'Compliance', description: 'GDPR + SOC2 review path', memberIds: ['m1', 'm2', 'm5'], assignedCourseIds: ['c3'] },
  ],
  courses: [
    {
      id: 'c1',
      slug: 'getting-started',
      title: 'Getting Started at AllOne',
      summary: 'Your first two weeks. Tools, expectations, who-does-what, security basics.',
      ownerId: 'm1',
      audience: 'all-employees',
      status: 'published',
      durationMin: 45,
      authoredVia: 'manual',
      version: 3,
      createdAt: '2026-04-08',
      updatedAt: '2026-04-22',
      lessons: [
        { id: 'l1', title: 'Welcome + tour', summary: 'A short tour of the product, the team, and the rituals.', durationMin: 8, slides: sampleSlides('c1', 'l1', 6), quizCount: 0, hasDiscussion: true, draft: false },
        { id: 'l2', title: 'Your first PR', summary: 'How we ship — branches, reviews, deploys.', durationMin: 12, slides: sampleSlides('c1', 'l2', 7), quizCount: 3, hasDiscussion: true, draft: false },
        { id: 'l3', title: 'Security 101', summary: 'Keys, secrets, devices, the kill-switch.', durationMin: 10, slides: sampleSlides('c1', 'l3', 5), quizCount: 4, hasDiscussion: false, draft: false },
        { id: 'l4', title: 'Comms playbook', summary: 'Slack vs email vs PR vs none-of-the-above.', durationMin: 9, slides: sampleSlides('c1', 'l4', 4), quizCount: 2, hasDiscussion: true, draft: false },
        { id: 'l5', title: 'Wrap-up', summary: 'Recap + your week-2 buddy assignment.', durationMin: 6, slides: sampleSlides('c1', 'l5', 4), quizCount: 1, hasDiscussion: false, draft: true },
      ],
      enrollments: [
        { memberId: 'm1', progressPct: 100, status: 'complete', completedAt: '2026-04-09', startedAt: '2026-04-09' },
        { memberId: 'm2', progressPct: 100, status: 'complete', completedAt: '2026-04-12', startedAt: '2026-04-10' },
        { memberId: 'm3', progressPct: 80,  status: 'in-progress', startedAt: '2026-04-15', dueAt: '2026-04-30' },
        { memberId: 'm4', progressPct: 40,  status: 'in-progress', startedAt: '2026-04-20', dueAt: '2026-04-30' },
        { memberId: 'm5', progressPct: 0,   status: 'not-started', dueAt: '2026-04-29' },
        { memberId: 'm6', progressPct: 0,   status: 'not-started', dueAt: '2026-05-04' },
      ],
    },
    {
      id: 'c2',
      slug: 'shipping-cadence',
      title: 'Shipping Cadence + Code Review',
      summary: 'Branch / commit / review / deploy. Real PRs from the repo, walked through.',
      ownerId: 'm2',
      audience: 'engineers',
      status: 'published',
      durationMin: 60,
      authoredVia: 'ai-prompt',
      version: 1,
      createdAt: '2026-04-15',
      updatedAt: '2026-04-21',
      lessons: [
        { id: 'l1', title: 'Why we squash-merge', summary: 'A concrete defense of single-line history.', durationMin: 10, slides: sampleSlides('c2', 'l1', 6), quizCount: 2, hasDiscussion: true, draft: false },
        { id: 'l2', title: 'Reviewing without ego', summary: 'Tone, blocking-vs-suggesting, the 24h rule.', durationMin: 14, slides: sampleSlides('c2', 'l2', 8), quizCount: 3, hasDiscussion: true, draft: false },
        { id: 'l3', title: 'Deploy flows', summary: 'Vercel + GitHub gh-deploy + the kill-switch.', durationMin: 16, slides: sampleSlides('c2', 'l3', 9), quizCount: 4, hasDiscussion: false, draft: false },
        { id: 'l4', title: 'Hotfixes', summary: 'When the rules bend.', durationMin: 12, slides: sampleSlides('c2', 'l4', 5), quizCount: 2, hasDiscussion: true, draft: false },
        { id: 'l5', title: 'Post-mortems', summary: 'Blameless template + 5-whys.', durationMin: 8, slides: sampleSlides('c2', 'l5', 4), quizCount: 1, hasDiscussion: true, draft: false },
      ],
      enrollments: [
        { memberId: 'm2', progressPct: 100, status: 'complete', completedAt: '2026-04-22', startedAt: '2026-04-16' },
        { memberId: 'm3', progressPct: 60, status: 'in-progress', startedAt: '2026-04-18', dueAt: '2026-04-30' },
        { memberId: 'm4', progressPct: 25, status: 'in-progress', startedAt: '2026-04-22', dueAt: '2026-05-05' },
      ],
    },
    {
      id: 'c3',
      slug: 'gdpr-essentials',
      title: 'GDPR Essentials for Operators',
      summary: 'Data subjects, consent, right-to-erasure walkthrough — with case studies.',
      ownerId: 'm5',
      audience: 'admins',
      status: 'published',
      durationMin: 30,
      authoredVia: 'ai-pdf',
      version: 2,
      createdAt: '2026-04-12',
      updatedAt: '2026-04-19',
      lessons: [
        { id: 'l1', title: 'Lawful bases', summary: 'The six grounds + when each fits.', durationMin: 8, slides: sampleSlides('c3', 'l1', 5), quizCount: 3, hasDiscussion: true, draft: false },
        { id: 'l2', title: 'Subject access requests', summary: 'A 30-day clock + practical playbook.', durationMin: 10, slides: sampleSlides('c3', 'l2', 6), quizCount: 3, hasDiscussion: true, draft: false },
        { id: 'l3', title: 'Breach response', summary: '72-hour clock + report template.', durationMin: 12, slides: sampleSlides('c3', 'l3', 7), quizCount: 4, hasDiscussion: false, draft: false },
      ],
      enrollments: [
        { memberId: 'm1', progressPct: 100, status: 'complete', completedAt: '2026-04-15', startedAt: '2026-04-13' },
        { memberId: 'm2', progressPct: 100, status: 'complete', completedAt: '2026-04-18', startedAt: '2026-04-14' },
        { memberId: 'm5', progressPct: 50, status: 'in-progress', startedAt: '2026-04-20' },
      ],
    },
    {
      id: 'c4',
      slug: 'product-deep-dive',
      title: 'Product Deep-Dive — the matrix',
      summary: 'How tools cooperate. Where bridges fire. Why the cell registry matters.',
      ownerId: 'm1',
      audience: 'all-employees',
      status: 'draft',
      durationMin: 75,
      authoredVia: 'ai-youtube',
      version: 0,
      createdAt: '2026-04-23',
      updatedAt: '2026-04-25',
      lessons: [
        { id: 'l1', title: 'The matrix in 5 minutes', summary: 'Tools, bridges, contributions, surfaces.', durationMin: 12, slides: sampleSlides('c4', 'l1', 6), quizCount: 0, hasDiscussion: false, draft: true },
        { id: 'l2', title: 'A spawn lifecycle', summary: 'Brief → classifier → tool plan → execute → materialize → deploy.', durationMin: 18, slides: sampleSlides('c4', 'l2', 8), quizCount: 0, hasDiscussion: false, draft: true },
      ],
      enrollments: [],
    },
  ],
  certificates: [
    { id: 'cert1', memberId: 'm1', courseId: 'c1', issuedAt: '2026-04-09', hash: 'sha256:7f3a…' },
    { id: 'cert2', memberId: 'm2', courseId: 'c1', issuedAt: '2026-04-12', hash: 'sha256:9c12…' },
    { id: 'cert3', memberId: 'm2', courseId: 'c2', issuedAt: '2026-04-22', hash: 'sha256:11d4…' },
    { id: 'cert4', memberId: 'm1', courseId: 'c3', issuedAt: '2026-04-15', hash: 'sha256:38e7…' },
    { id: 'cert5', memberId: 'm2', courseId: 'c3', issuedAt: '2026-04-18', hash: 'sha256:5b9a…' },
  ],
  discussions: [
    { id: 'd1', courseId: 'c1', lessonId: 'l3', authorId: 'm3', body: 'Should we rotate the YubiKey on every device swap, or only on offboarding?', createdAt: '2026-04-22T14:12:00Z', replies: 4 },
    { id: 'd2', courseId: 'c2', lessonId: 'l2', authorId: 'm4', body: 'How do you balance "don\'t block on style" vs "we have a style guide for a reason"?', createdAt: '2026-04-23T09:48:00Z', replies: 7 },
    { id: 'd3', courseId: 'c3', lessonId: 'l2', authorId: 'm5', body: 'When a SAR comes from a former contractor — is the 30-day clock different?', createdAt: '2026-04-24T11:30:00Z', replies: 2 },
    { id: 'd4', courseId: 'c1', lessonId: 'l4', authorId: 'm6', body: 'Where do I put a question that doesn\'t fit any of these channels?', createdAt: '2026-04-25T16:02:00Z', replies: 3 },
  ],
  assignments: [
    { id: 'a1', courseId: 'c1', audience: 'all-employees', dueAt: '2026-04-30', reminderSent: true },
    { id: 'a2', courseId: 'c2', audience: 'engineers',     dueAt: '2026-05-05', reminderSent: false },
    { id: 'a3', courseId: 'c3', audience: 'admins',        dueAt: '2026-05-08', reminderSent: false },
    { id: 'a4', courseId: 'c1', audience: 'group', groupId: 'g2', dueAt: '2026-05-04', reminderSent: false },
  ],
};
void _legacyMockTeamAcademy;

export const mockTeamAcademy: MockTeamAcademyFixture = {
  members: mockMembers,
  groups: [],
  courses: [],
  certificates: [],
  discussions: [],
  assignments: [],
};
