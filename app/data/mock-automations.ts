// Per-business automation mock fixture. Shape mirrors what
// automation-forge writes to .cells/ + the AutomationWorkflow type from
// src/types.ts. The loader at app/lib/automation-loader.ts swaps mock for
// real cells when the spawn dir has authored workflows.

export type WorkflowStatus = 'enabled' | 'paused' | 'failed' | 'draft';

export interface AutomationWorkflowDetail {
  id: string;
  name: string;
  description: string;
  trigger: { tool: string; event: string; conditionSummary?: string };
  actions: Array<{ tool: string; action: string }>;
  status: WorkflowStatus;
  /** Executions in the last 24 hours. */
  fired24h: number;
  /** Successful executions in the last 24 hours. */
  succeeded24h: number;
  /** Failed executions in the last 24 hours. */
  failed24h: number;
  /** Average latency p95 in ms over last 1k executions. */
  p95LatencyMs: number;
  /** USD cost over the last 30 days. */
  costUsd30d: number;
  /** Daily $ cap; alert at 80%. */
  capUsd: number;
  lastFiredAt: string;        // human "12 min ago" or ISO
  authoredVia: 'template' | 'manual' | 'imported';
  /** Per-vendor auth health (true = fresh, false = expired/refresh-needed). */
  authStatus?: Array<{ vendor: string; ok: boolean }>;
}

export interface AutomationExecution {
  id: string;
  workflowId: string;
  startedAt: string;          // ISO
  durationMs: number;
  status: 'success' | 'failed' | 'replayed' | 'queued' | 'in-progress';
  retryCount: number;
  costCents: number;
  /** When status='failed', the error class. */
  errorKind?: 'rate-limit' | 'auth-expired' | 'timeout' | 'transformer' | 'webhook-verify' | 'unknown';
  errorMessage?: string;
}

export interface OAuthVendor {
  vendor: string;
  status: 'connected' | 'expired' | 'never';
  scopesGranted: string[];
  expiresAt?: string;
  reauthUrl?: string;
}

export interface QueueDepthSnapshot {
  ts: string;                 // ISO
  depth: number;
}

export interface AutomationFixture {
  workflows: AutomationWorkflowDetail[];
  executions: AutomationExecution[];
  oauthVendors: OAuthVendor[];
  queueDepth: QueueDepthSnapshot[];
  /** Aggregate cost across all workflows (last 30d). */
  totalCostUsd30d: number;
  /** Per-tenant daily cap. */
  tenantCapUsd: number;
  /** Provider runtime in use. */
  provider: 'inngest' | 'trigger-dev' | 'custom';
  /** When true, this is the loader's mock fallback. */
  isFixture: boolean;
}

const baseWorkflows: AutomationWorkflowDetail[] = [];

const sampleExecutions: AutomationExecution[] = [];

export const mockAutomations: AutomationFixture = {
  workflows: baseWorkflows,
  executions: sampleExecutions,
  oauthVendors: [
    { vendor: 'stripe',    status: 'connected', scopesGranted: ['read_write'], expiresAt: '2027-04-26' },
    { vendor: 'gmail',     status: 'connected', scopesGranted: ['send', 'compose'], expiresAt: '2026-10-15' },
    { vendor: 'cal.com',   status: 'connected', scopesGranted: ['bookings.read', 'bookings.write'] },
    { vendor: 'apollo',    status: 'expired',   scopesGranted: ['enrich'], reauthUrl: 'https://app.apollo.io/oauth/authorize' },
    { vendor: 'slack',     status: 'expired',   scopesGranted: ['chat.write'], reauthUrl: 'https://slack.com/oauth/v2/authorize' },
    { vendor: 'twitter',   status: 'connected', scopesGranted: ['tweet.write'], expiresAt: '2026-08-12' },
    { vendor: 'linkedin',  status: 'connected', scopesGranted: ['w_member_social'], expiresAt: '2026-09-04' },
    { vendor: 'anthropic', status: 'connected', scopesGranted: ['api'], expiresAt: '2099-01-01' },
  ],
  queueDepth: Array.from({ length: 24 }, (_, i) => ({
    ts: new Date(Date.now() - (23 - i) * 60 * 60_000).toISOString(),
    depth: Math.round(20 + Math.sin(i / 3) * 15 + Math.random() * 8),
  })),
  totalCostUsd30d: baseWorkflows.reduce((s, w) => s + w.costUsd30d, 0),
  tenantCapUsd: 50,
  provider: 'inngest',
  isFixture: true,
};
