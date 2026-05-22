// ════════════════════════════════════════════════════════════════════════════
// Mock email-forge fixture for /s/mails when no real spawn data exists.
//
// Shape mirrors what email-loader.ts will eventually return from real
// `bf_<tenant>_<brief>_email` rows + R2 bodies. Until cellRecords + DB rows
// are wired, the UI falls through to this fixture so dev/demo stays green.
//
// Maps onto src/lib/email-forge/schema.ts public types but keeps the surface
// narrow (UI-facing only — full schema types live server-side).
// ════════════════════════════════════════════════════════════════════════════

export type MockEmailCategory = 'transactional' | 'marketing' | 'lifecycle';

export interface MockEmailTemplate {
  slug: string;
  displayName: string;
  category: MockEmailCategory;
  fromLocalPart: string;
  preheader?: string;
  latestVersion: number;
  active: boolean;
  /** Sample subject line for the gallery card preview. */
  sampleSubject: string;
  /** Latest send count over rolling 7d for the gallery thumb badge. */
  sends7d: number;
  /** Open rate as 0..1 (only meaningful for marketing/lifecycle). */
  openRate30d?: number;
}

export interface MockEmailSequenceStep {
  /** 0-indexed position. */
  index: number;
  kind: 'wait' | 'send' | 'branch' | 'tag' | 'webhook';
  /** Wait kind only — days before this step fires. */
  waitAfterDays?: number;
  /** Send kind only — slug of the template to send. */
  templateSlug?: string;
  /** Send kind only — pinned version. */
  templateVersion?: number;
  /** Optional condition: only fire when prior send met / didn't meet criterion. */
  condition?: 'always' | 'no_open' | 'no_click' | 'no_reply' | 'replied';
  /** Tag kind only — tag to apply to recipient. */
  tag?: string;
  /** Webhook kind only — URL to POST to. */
  webhookUrl?: string;
  /** Operator-facing description, derived from kind+slugs. */
  label: string;
}

export interface MockEmailSequence {
  slug: string;
  displayName: string;
  triggerKind: 'event' | 'segment-entry' | 'manual' | 'api';
  triggerEvent?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  stepCount: number;
  /** Number of recipients currently mid-sequence. */
  inFlight: number;
  /** Optional ordered step list. When present, /s/mails/sequences/[slug] renders the canvas. */
  steps?: MockEmailSequenceStep[];
}

export interface MockEmailMetrics {
  templatesActive: number;
  sequencesActive: number;
  sends7d: number;
  /** Mean open-rate across marketing+lifecycle sends, last 30d. */
  openRate30d: number;
  bounces7d: number;
  suppressionListSize: number;
}

export interface MockEmailFixture {
  metrics: MockEmailMetrics;
  templates: MockEmailTemplate[];
  sequences: MockEmailSequence[];
}

// ── 12 starter templates: 6 transactional + 4 lifecycle + 2 marketing
//    Mirrors the seed-set Plan 1's acceptance criteria mentions.

const TEMPLATES: MockEmailTemplate[] = [];

const SEQUENCES: MockEmailSequence[] = [];

// MISSION constraint: every dashboard number is real or honestly labeled.
// When this fixture is used (loadEmailDetail returns kind='mock'), the page
// renders a "Mock data" amber badge — but the metrics themselves should be
// zero, not invented. Real numbers ride the email-forge.metrics.7d.json
// cell path in email-loader.ts:tryReadCells.
export const mockMailsFixture: MockEmailFixture = {
  metrics: {
    templatesActive: TEMPLATES.filter((t) => t.active).length,
    sequencesActive: SEQUENCES.filter((s) => s.status === 'active').length,
    sends7d: 0,
    openRate30d: 0,
    bounces7d: 0,
    suppressionListSize: 0,
  },
  templates: TEMPLATES,
  sequences: SEQUENCES,
};
