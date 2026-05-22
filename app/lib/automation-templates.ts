// Pre-built workflow templates. Each is a DraftWorkflow shape that the
// visual editor can hydrate from. Triggers + actions reference the
// shared automation-catalog so validation always agrees.

export interface TemplateDraft {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly popularity: '★★★★★' | '★★★★☆' | '★★★☆☆' | '★★☆☆☆';
  readonly draft: {
    name: string;
    description: string;
    trigger: { tool: string; event: string; conditionSummary?: string };
    actions: Array<{ tool: string; action: string }>;
    capUsd: number;
  };
}

export const AUTOMATION_TEMPLATES: readonly TemplateDraft[] = [
  {
    slug: 'deal-won-pipeline',
    title: 'Deal won → invoice + receipt + analytics',
    subtitle: 'Closes the loop when a CRM deal moves to won — books the invoice, mails the receipt, logs to analytics.',
    popularity: '★★★★★',
    draft: {
      name: 'Deal won pipeline',
      description: 'When a deal is won, create the invoice, emit the receipt email, and post a revenue event to analytics.',
      trigger: { tool: 'crm-spawn', event: 'deal.won' },
      actions: [
        { tool: 'payment-forge',   action: 'createInvoice' },
        { tool: 'payment-forge',   action: 'emitReceipt' },
        { tool: 'crm-spawn',       action: 'appendActivity' },
        { tool: 'analytics-forge', action: 'trackRevenueEvent' },
      ],
      capUsd: 10,
    },
  },
  {
    slug: 'booking-pipeline',
    title: 'Booking confirmed → email + CRM + calendar',
    subtitle: 'Customer confirms a booking — sends the confirmation, logs the activity, syncs to the calendar.',
    popularity: '★★★★☆',
    draft: {
      name: 'Booking confirmed pipeline',
      description: 'When a booking is confirmed, send confirmation email, append CRM activity, and sync to calendar.',
      trigger: { tool: 'booking-forge', event: 'booking.confirmed' },
      actions: [
        { tool: 'booking-forge', action: 'sendConfirmation' },
        { tool: 'crm-spawn',     action: 'appendActivity' },
        { tool: 'booking-forge', action: 'syncCalendar' },
      ],
      capUsd: 8,
    },
  },
  {
    slug: 'payment-pipeline',
    title: 'Payment received → receipt + ledger + notify',
    subtitle: 'Money lands — emits the receipt, posts the ledger entry, notifies the team.',
    popularity: '★★★★★',
    draft: {
      name: 'Payment received pipeline',
      description: 'When a payment is received, emit the receipt, post the ledger entry, and notify the team in Slack.',
      trigger: { tool: 'payment-forge', event: 'payment.received' },
      actions: [
        { tool: 'payment-forge', action: 'emitReceipt' },
        { tool: 'ledger-spawn',  action: 'recordReceipt' },
        { tool: 'admin-spawn',   action: 'slackNotify' },
      ],
      capUsd: 8,
    },
  },
  {
    slug: 'lead-pipeline',
    title: 'Lead imported → enrich + score + assign + notify',
    subtitle: 'Fresh lead arrives — enriches via Apollo, scores, assigns an owner, pings Slack.',
    popularity: '★★★☆☆',
    draft: {
      name: 'Lead imported pipeline',
      description: 'When a lead is imported, enrich via Apollo, score it, assign an owner, and notify Slack.',
      trigger: { tool: 'lead-hunter', event: 'lead.imported' },
      actions: [
        { tool: 'lead-hunter', action: 'enrichApollo' },
        { tool: 'lead-hunter', action: 'scoreLead' },
        { tool: 'crm-spawn',   action: 'assignOwner' },
        { tool: 'admin-spawn', action: 'slackNotify' },
      ],
      capUsd: 12,
    },
  },
  {
    slug: 'support-pipeline',
    title: 'Ticket created → CRM lookup + AI reply + SLA',
    subtitle: 'New support ticket — looks up the contact, drafts an AI reply, starts the SLA clock.',
    popularity: '★★★★☆',
    draft: {
      name: 'Support ticket pipeline',
      description: 'When a ticket is created, look up the contact, draft an AI reply for review, and start the SLA timer.',
      trigger: { tool: 'desk-forge', event: 'ticket.created' },
      actions: [
        { tool: 'crm-spawn',  action: 'lookupContact' },
        { tool: 'desk-forge', action: 'draftAiReply' },
        { tool: 'desk-forge', action: 'startSlaTimer' },
      ],
      capUsd: 15,
    },
  },
  {
    slug: 'content-pipeline',
    title: 'Blog published → social + newsletter + calendar',
    subtitle: 'New blog post goes live — cross-posts to social, queues the newsletter, schedules a follow-up.',
    popularity: '★★☆☆☆',
    draft: {
      name: 'Blog published pipeline',
      description: 'When a blog is published, cross-post to social channels, queue the newsletter, and schedule a follow-up.',
      trigger: { tool: 'content-factory', event: 'blog.published' },
      actions: [
        { tool: 'social-forge',    action: 'crossPost' },
        { tool: 'email-forge',     action: 'queueNewsletter' },
        { tool: 'content-factory', action: 'scheduleFollowup' },
      ],
      capUsd: 6,
    },
  },
  {
    slug: 'churn-winback',
    title: 'Subscription cancelled → winback drip',
    subtitle: 'Subscriber cancels — fires off the winback sequence, logs the activity.',
    popularity: '★★★☆☆',
    draft: {
      name: 'Subscription cancelled winback',
      description: 'When a subscription is cancelled, send a winback email and append a CRM activity for follow-up.',
      trigger: { tool: 'payment-forge', event: 'subscription.cancelled' },
      actions: [
        { tool: 'email-forge', action: 'sendTransactional' },
        { tool: 'crm-spawn',   action: 'appendActivity' },
      ],
      capUsd: 5,
    },
  },
  {
    slug: 'social-skip-on-churn',
    title: 'Subscription cancelled → skip social audience',
    subtitle: 'Customer churns — pauses the brand-feel-good social campaigns from re-engaging them during the cool-down window. Pairs with the winback drip.',
    popularity: '★★★☆☆',
    draft: {
      name: 'Skip social on churn',
      description: 'When a subscription is cancelled, exclude the contact from social campaigns tagged testimonial / spotlight / upsell / community for a reason-driven cool-down (30d voluntary / 7d involuntary / 60d admin) so the brand voice stays consistent with the actual relationship state.',
      trigger: { tool: 'payment-forge', event: 'subscription.cancelled' },
      actions: [
        { tool: 'social-forge', action: 'skipAudienceSegment' },
        { tool: 'crm-spawn',    action: 'appendActivity' },
      ],
      capUsd: 4,
    },
  },
  {
    slug: 'low-engagement-tag',
    title: 'Email opened → score + activity log',
    subtitle: 'Recipient engages — logs to CRM, scores the contact for re-engagement targeting.',
    popularity: '★★☆☆☆',
    draft: {
      name: 'Email opened tagging',
      description: 'When an email is opened, append a CRM activity and bump the contact score.',
      trigger: { tool: 'email-forge', event: 'email.opened' },
      actions: [
        { tool: 'crm-spawn',   action: 'appendActivity' },
        { tool: 'lead-hunter', action: 'scoreLead' },
      ],
      capUsd: 3,
    },
  },
];

export function findTemplate(slug: string): TemplateDraft | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.slug === slug);
}
