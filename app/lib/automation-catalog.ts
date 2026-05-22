// ════════════════════════════════════════════════════════════════════════════
// automation-catalog — single source of truth for the available triggers +
// actions consumed by the from-prompt composer + the visual editor's
// validator + the catalog pages. Eventually swaps to reading the spawn's
// emitted trigger-registry / action-registry cells.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

export interface AutomationCatalog {
  triggers: Readonly<Record<string, readonly string[]>>;
  actions: Readonly<Record<string, readonly { name: string; cost: 'free' | 'paid' }[]>>;
}

const STATIC_CATALOG: AutomationCatalog = {
  triggers: {
    'crm-spawn':       ['contact.created', 'contact.updated', 'deal.created', 'deal.advanced', 'deal.won', 'deal.lost'],
    'payment-forge':   ['payment.received', 'payment.failed', 'subscription.created', 'subscription.cancelled', 'invoice.paid'],
    'desk-forge':      ['ticket.created', 'ticket.replied', 'ticket.closed', 'sla.warning'],
    'booking-forge':   ['booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.rescheduled'],
    'lead-hunter':     ['lead.imported', 'lead.qualified', 'lead.replied'],
    'email-forge':     ['email.bounced', 'email.opened', 'email.clicked', 'email.unsubscribed'],
    'content-factory': ['blog.published', 'newsletter.queued'],
    'social-forge':    ['post.scheduled', 'post.engagement-spike'],
    'ledger-spawn':    ['entry.posted', 'period.closed'],
    'monitor-forge':   ['incident.opened', 'incident.resolved'],
  },
  actions: {
    'email-forge':     [{ name: 'sendTransactional', cost: 'paid' }, { name: 'queueNewsletter', cost: 'paid' }, { name: 'unsubscribe', cost: 'free' }, { name: 'sendConfirmation', cost: 'paid' }, { name: 'sendThankYou', cost: 'paid' }],
    'crm-spawn':       [{ name: 'appendActivity', cost: 'free' }, { name: 'lookupContact', cost: 'free' }, { name: 'assignOwner', cost: 'free' }],
    'payment-forge':   [{ name: 'createInvoice', cost: 'paid' }, { name: 'emitReceipt', cost: 'paid' }, { name: 'refundCharge', cost: 'paid' }],
    'ledger-spawn':    [{ name: 'postEntry', cost: 'free' }, { name: 'recordReceipt', cost: 'free' }],
    'desk-forge':      [{ name: 'draftAiReply', cost: 'paid' }, { name: 'startSlaTimer', cost: 'free' }, { name: 'closeTicket', cost: 'free' }],
    'booking-forge':   [{ name: 'sendConfirmation', cost: 'paid' }, { name: 'syncCalendar', cost: 'paid' }],
    'lead-hunter':     [{ name: 'enrichApollo', cost: 'paid' }, { name: 'scoreLead', cost: 'free' }],
    'social-forge':    [{ name: 'crossPost', cost: 'free' }, { name: 'scheduleQueue', cost: 'free' }, { name: 'skipAudienceSegment', cost: 'free' }],
    'analytics-forge': [{ name: 'trackRevenueEvent', cost: 'free' }, { name: 'trackFunnel', cost: 'free' }],
    'admin-spawn':     [{ name: 'slackNotify', cost: 'free' }, { name: 'pagerDutyAlert', cost: 'free' }],
    'content-factory': [{ name: 'scheduleFollowup', cost: 'free' }],
  },
};

export function getCatalog(): AutomationCatalog {
  return STATIC_CATALOG;
}

/** Plain-name view of actions, suitable for the composer + validator. */
export function actionNamesByTool(): Readonly<Record<string, readonly string[]>> {
  const out: Record<string, string[]> = {};
  for (const [tool, actions] of Object.entries(STATIC_CATALOG.actions)) {
    out[tool] = actions.map((a) => a.name);
  }
  return out;
}

export interface ValidationIssue {
  level: 'error' | 'warn';
  field: string;
  message: string;
}

export interface DraftWorkflow {
  name: string;
  description: string;
  trigger: { tool: string; event: string; conditionSummary?: string };
  actions: Array<{ tool: string; action: string }>;
  capUsd?: number;
}

/**
 * Validate a draft workflow against the catalog. Returns an empty array
 * when the draft is publishable.
 */
export function validateDraft(draft: DraftWorkflow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cat = STATIC_CATALOG;

  if (!draft.name || draft.name.trim().length === 0) {
    issues.push({ level: 'error', field: 'name', message: 'Name is required.' });
  } else if (draft.name.length > 100) {
    issues.push({ level: 'warn', field: 'name', message: 'Name is quite long — keep it under 60 chars for legibility.' });
  }

  if (!draft.trigger?.tool) {
    issues.push({ level: 'error', field: 'trigger.tool', message: 'Pick a trigger tool.' });
  } else if (!cat.triggers[draft.trigger.tool]) {
    issues.push({ level: 'error', field: 'trigger.tool', message: `Tool "${draft.trigger.tool}" is not in the catalog.` });
  } else if (!draft.trigger.event) {
    issues.push({ level: 'error', field: 'trigger.event', message: 'Pick a trigger event.' });
  } else if (!cat.triggers[draft.trigger.tool]!.includes(draft.trigger.event)) {
    issues.push({ level: 'error', field: 'trigger.event', message: `Event "${draft.trigger.event}" not available on ${draft.trigger.tool}.` });
  }

  if (!Array.isArray(draft.actions) || draft.actions.length === 0) {
    issues.push({ level: 'error', field: 'actions', message: 'Add at least one action.' });
  } else {
    if (draft.actions.length > 5) {
      issues.push({ level: 'warn', field: 'actions', message: 'More than 5 actions — consider splitting into multiple workflows.' });
    }
    draft.actions.forEach((a, i) => {
      if (!a?.tool) {
        issues.push({ level: 'error', field: `actions[${i}].tool`, message: 'Action tool required.' });
        return;
      }
      const tool = cat.actions[a.tool];
      if (!tool) {
        issues.push({ level: 'error', field: `actions[${i}].tool`, message: `Tool "${a.tool}" is not in the catalog.` });
        return;
      }
      if (!a.action) {
        issues.push({ level: 'error', field: `actions[${i}].action`, message: 'Action name required.' });
        return;
      }
      if (!tool.some((x) => x.name === a.action)) {
        issues.push({ level: 'error', field: `actions[${i}].action`, message: `Action "${a.action}" not available on ${a.tool}.` });
      }
    });
  }

  if (typeof draft.capUsd === 'number') {
    if (draft.capUsd < 0) {
      issues.push({ level: 'error', field: 'capUsd', message: 'Cap must be non-negative.' });
    } else if (draft.capUsd > 1000) {
      issues.push({ level: 'warn', field: 'capUsd', message: 'Cap above $1000 — confirm this is intentional.' });
    }
  }

  return issues;
}
