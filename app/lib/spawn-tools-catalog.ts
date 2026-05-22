// Real tools catalog for the spawn wizard's step-4 tool picker.
// Mirrors src/tools/*.ts (35 tools, excluding phase32-stubs which is
// scaffolding-only). Each entry carries a category, blurb, always-on
// flag, and an array of token hints used to compute paragraph-relevance.
//
// The wizard's old hardcoded mockToolPool listed 14 tools with a
// 6-bucket cat field. This catalog lists every real tool with a
// 7-phase lifecycle bucket so the picker reflects what the spawn
// pipeline can actually do.

export type ToolGroup =
  | 'infrastructure'   // dns/site/brand/legal — always-on substrates
  | 'discovery'        // SEO, content, social, partnerships
  | 'acquisition'      // lead-hunter, ad-reel
  | 'conversion'       // ecom, booking, payment, proposal
  | 'retention'        // crm, desk, email sequences, community
  | 'operations'       // hr, ledger, compliance, monitor, backup, bi
  | 'enablement';      // academy, knowledge, voice, locale, media, automation

export interface SpawnToolEntry {
  readonly slug: string;
  readonly label: string;
  readonly group: ToolGroup;
  readonly blurb: string;
  /** Core surfaces that are always emitted. */
  readonly always: boolean;
  /** Lower-cased token hits in the paragraph push relevance higher. */
  readonly hints: readonly string[];
  /** Hard dependencies — selecting this tool with these missing produces a
   *  warning (and the auto-include button toggles them on). */
  readonly dependsOn?: readonly string[];
  /** USD/month upstream API cost ranges. `low` is light-volume / starter;
   *  `high` is sustained mid-volume. Hosting + Vercel/Supabase free tier
   *  usage NOT included — these are the upstream-API-only line-items. */
  readonly costMin: number;
  readonly costMax: number;
}

export const SPAWN_TOOLS: readonly SpawnToolEntry[] = [
  // ── Infrastructure (always-on) ──────────────────────────────
  { slug: 'dns-forge',         label: 'DNS Forge',         group: 'infrastructure', always: true,  blurb: 'Domain + DNS records + email delivery DKIM/SPF', hints: [], costMin: 0,   costMax: 2   /* Cloudflare DNS free; domain ~$12/yr ~ $1/mo */ },
  { slug: 'site-forge',        label: 'Site Forge',        group: 'infrastructure', always: true,  blurb: 'Public marketing site, route assembly, SEO',     hints: [], costMin: 0,   costMax: 0   /* Vercel free tier */ },
  { slug: 'brand-forge',       label: 'Brand Forge',       group: 'infrastructure', always: true,  blurb: 'Tokens, palette, type, logo system',             hints: [], costMin: 0,   costMax: 0   /* in-repo */ },
  { slug: 'legal-forge',       label: 'Legal Forge',       group: 'infrastructure', always: true,  blurb: 'Privacy, ToS, cookie, refund — jurisdiction-aware', hints: [], costMin: 0,   costMax: 0   /* template-based */ },
  { slug: 'email-forge',       label: 'Email Forge',       group: 'infrastructure', always: true,  blurb: 'Transactional + sequences, brand-themed templates', hints: [], costMin: 0,   costMax: 35  /* Resend free 3k/mo, then ~$20/100k */ },
  { slug: 'analytics-forge',   label: 'Analytics Forge',   group: 'infrastructure', always: true,  blurb: 'Funnels, revenue events, session tracking',      hints: [], costMin: 0,   costMax: 9   /* Plausible/PostHog free tiers; $9 starter */ },
  { slug: 'ops-bootstrap',     label: 'Ops Bootstrap',     group: 'infrastructure', always: true,  blurb: 'Repository scaffolding + CI/CD + deploy config', hints: [], costMin: 0,   costMax: 0   /* GitHub Actions free for public */ },

  // ── Discovery ───────────────────────────────────────────────
  { slug: 'content-factory',   label: 'Content Factory',   group: 'discovery',      always: false, blurb: 'Blog posts, landing pages, SEO content engine',  hints: ['blog', 'content', 'seo', 'newsletter', 'editorial'], costMin: 5,   costMax: 40  /* Claude tokens for AI authoring */ },
  { slug: 'social-forge',      label: 'Social Forge',      group: 'discovery',      always: false, blurb: 'Cross-platform scheduling — IG/X/LinkedIn/TikTok', hints: ['social', 'instagram', 'tiktok', 'twitter', 'linkedin'], costMin: 0,   costMax: 25  /* APIs free; image gen at high volume */ },
  { slug: 'reputation-forge',  label: 'Reputation Forge',  group: 'discovery',      always: false, blurb: 'Review collection — Google/Yelp/2GIS local SEO', hints: ['reviews', 'reputation', 'local', 'storefront', 'restaurant'], costMin: 0,   costMax: 15  /* Google Places API */ },
  { slug: 'partnership-forge', label: 'Partnership Forge', group: 'discovery',      always: false, blurb: 'Partner program, affiliate tracking, co-marketing', hints: ['partner', 'affiliate', 'integrator', 'reseller'], costMin: 0,   costMax: 10 },

  // ── Acquisition ─────────────────────────────────────────────
  { slug: 'lead-hunter',       label: 'Lead Hunter',       group: 'acquisition',    always: false, blurb: 'Outbound prospecting, enrichment, sequence cadence', hints: ['b2b', 'sales', 'outbound', 'lead', 'prospecting'], dependsOn: ['crm-spawn'], costMin: 49,  costMax: 180 /* Apollo + enrichment APIs are the dominant line item */ },
  { slug: 'ad-reel',           label: 'Ad Reel',           group: 'acquisition',    always: false, blurb: 'Paid social creative + landing-page tests',      hints: ['ads', 'paid', 'campaign', 'meta', 'google'], costMin: 10,  costMax: 60  /* image+copy gen; ad spend NOT included */ },

  // ── Conversion ──────────────────────────────────────────────
  { slug: 'ecom-forge',        label: 'Ecom Forge',        group: 'conversion',     always: false, blurb: 'Storefront, products, cart, fulfillment',        hints: ['shop', 'store', 'product', 'commerce', 'subscription', 'storefront', 'dtc', 'merch'], dependsOn: ['payment-forge', 'ledger-spawn'], costMin: 0,   costMax: 25  /* search index, image transforms */ },
  { slug: 'booking-forge',     label: 'Booking Forge',     group: 'conversion',     always: false, blurb: 'Appointments, calendar sync, deposits',          hints: ['booking', 'appointment', 'calendar', 'consult', 'session', 'class'], costMin: 0,   costMax: 12  /* Calendar APIs free; SMS reminders if enabled */ },
  { slug: 'payment-forge',     label: 'Payment Forge',     group: 'conversion',     always: false, blurb: 'Stripe-class billing — subscriptions, invoices, dunning', hints: ['subscription', 'invoice', 'billing', 'payment', 'dunning'], dependsOn: ['ledger-spawn'], costMin: 0,   costMax: 0   /* Stripe takes processing fees; no flat monthly */ },
  { slug: 'proposal-forge',    label: 'Proposal Forge',    group: 'conversion',     always: false, blurb: 'Quote → contract → e-sign for B2B sales',        hints: ['quote', 'proposal', 'contract', 'b2b', 'enterprise'], dependsOn: ['crm-spawn'], costMin: 10,  costMax: 50  /* DocuSign/HelloSign + Claude for proposal copy */ },
  { slug: 'investor-forge',    label: 'Investor Forge',    group: 'conversion',     always: false, blurb: 'Data room, investor updates, cap-table',         hints: ['investor', 'fundraising', 'angel', 'venture', 'series'], costMin: 0,   costMax: 20 },

  // ── Retention ───────────────────────────────────────────────
  { slug: 'crm-spawn',         label: 'CRM',               group: 'retention',      always: false, blurb: 'Contact + deal pipeline, lifecycle stages',      hints: ['customer', 'crm', 'pipeline', 'deal'], costMin: 0,   costMax: 0   /* in-repo Postgres */ },
  { slug: 'desk-forge',        label: 'Desk Forge',        group: 'retention',      always: false, blurb: 'Helpdesk, SLA timers, AI-drafted replies',       hints: ['support', 'helpdesk', 'ticket', 'sla', 'service'], dependsOn: ['crm-spawn'], costMin: 5,   costMax: 40  /* Claude for AI replies */ },
  { slug: 'community-forge',   label: 'Community Forge',   group: 'retention',      always: false, blurb: 'Forum, Discord/Slack bridge, member directory',  hints: ['community', 'forum', 'discord', 'slack', 'members'], dependsOn: ['app-forge'], costMin: 0,   costMax: 8 },
  { slug: 'event-forge',       label: 'Event Forge',       group: 'retention',      always: false, blurb: 'Webinars, in-person events, RSVP + tickets',     hints: ['event', 'conference', 'workshop', 'webinar', 'meetup'], dependsOn: ['payment-forge'], costMin: 0,   costMax: 15 },

  // ── Operations ──────────────────────────────────────────────
  { slug: 'ledger-spawn',      label: 'Ledger',            group: 'operations',     always: false, blurb: 'Double-entry bookkeeping, tax exports',          hints: ['accounting', 'bookkeeping', 'finance', 'ledger', 'tax'], costMin: 0,   costMax: 0   /* in-repo */ },
  { slug: 'hr-forge',          label: 'HR Forge',          group: 'operations',     always: false, blurb: 'Employee onboarding, payroll, time-off',         hints: ['employee', 'team', 'hire', 'payroll', 'staff'], costMin: 0,   costMax: 30  /* payroll API per-employee fee depends on staff size */ },
  { slug: 'compliance-forge',  label: 'Compliance Forge',  group: 'operations',     always: false, blurb: 'Policy attestations, audit trails, GDPR/SOC2',   hints: ['compliance', 'gdpr', 'soc2', 'audit', 'hipaa', 'iso'], costMin: 0,   costMax: 15 },
  { slug: 'monitor-forge',     label: 'Monitor Forge',     group: 'operations',     always: false, blurb: 'Uptime + performance monitoring, on-call',       hints: ['uptime', 'monitor', 'reliability', 'incident', 'oncall'], dependsOn: ['admin-spawn'], costMin: 0,   costMax: 12  /* Better Stack/Pingdom starter */ },
  { slug: 'backup-forge',      label: 'Backup Forge',      group: 'operations',     always: false, blurb: 'Cross-region backups, restore drills',           hints: ['backup', 'restore', 'disaster', 'recovery'], costMin: 1,   costMax: 8   /* R2/B2 storage */ },
  { slug: 'bi-forge',          label: 'BI Forge',          group: 'operations',     always: false, blurb: 'Dashboards, KPIs, cross-tool analytics',         hints: ['analytics', 'dashboard', 'kpi', 'metrics', 'reporting'], costMin: 0,   costMax: 20 },
  { slug: 'admin-spawn',       label: 'Admin Spawn',       group: 'operations',     always: false, blurb: 'Internal admin app — back-office workflows',     hints: ['admin', 'backoffice', 'internal', 'staff'], costMin: 0,   costMax: 0 },

  // ── Enablement ──────────────────────────────────────────────
  { slug: 'academy-forge',     label: 'Academy',           group: 'enablement',     always: false, blurb: 'Courses, lessons, certifications, LMS',          hints: ['course', 'training', 'academy', 'curriculum', 'lesson'], dependsOn: ['app-forge'], costMin: 0,   costMax: 12  /* video hosting if used */ },
  { slug: 'knowledge-forge',   label: 'Knowledge Base',    group: 'enablement',     always: false, blurb: 'Public docs, internal wiki, search',             hints: ['docs', 'wiki', 'knowledge', 'manual', 'reference'], costMin: 0,   costMax: 5 },
  { slug: 'voice-forge',       label: 'Voice Forge',       group: 'enablement',     always: false, blurb: 'Voice + IVR + call routing, transcription',      hints: ['phone', 'voice', 'call', 'ivr'], costMin: 15,  costMax: 80  /* Twilio + transcription per-minute */ },
  { slug: 'locale-forge',      label: 'Locale Forge',      group: 'enablement',     always: false, blurb: 'i18n strings, multi-locale routing, RTL',        hints: ['multilingual', 'locale', 'translation', 'i18n', 'languages'], costMin: 0,   costMax: 15  /* DeepL or Claude for translations */ },
  { slug: 'media-forge',       label: 'Media Forge',       group: 'enablement',     always: false, blurb: 'Asset library, image transforms, CDN routing',   hints: ['photo', 'media', 'gallery', 'video', 'image'], costMin: 0,   costMax: 20  /* Cloudflare Images / R2 egress */ },
  { slug: 'app-forge',         label: 'App Forge',         group: 'enablement',     always: false, blurb: 'Logged-in customer/operator app',                hints: ['app', 'dashboard', 'portal', 'login'], costMin: 0,   costMax: 8   /* auth provider above free tier */ },
  { slug: 'automation-forge',  label: 'Automation Forge',  group: 'enablement',     always: false, blurb: 'Cross-tool workflows, webhooks, schedulers',     hints: ['automation', 'workflow', 'webhook', 'integration', 'zapier'], costMin: 0,   costMax: 15  /* Inngest free tier covers most */ },
];

const GROUP_ORDER: readonly ToolGroup[] = [
  'infrastructure',
  'discovery',
  'acquisition',
  'conversion',
  'retention',
  'operations',
  'enablement',
];

const GROUP_LABEL: Record<ToolGroup, string> = {
  'infrastructure': 'Foundation',
  'discovery':      'Discovery',
  'acquisition':    'Acquisition',
  'conversion':     'Conversion',
  'retention':      'Retention',
  'operations':     'Operations',
  'enablement':     'Enablement',
};

export function groupToolsByPhase(): ReadonlyArray<{ group: ToolGroup; label: string; tools: SpawnToolEntry[] }> {
  return GROUP_ORDER.map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    tools: SPAWN_TOOLS.filter((t) => t.group === g),
  }));
}

/** Returns 0..1 — fraction of the tool's hints that appear in the paragraph. */
export function relevance(tool: SpawnToolEntry, paragraph: string): number {
  if (tool.always) return 1;
  if (tool.hints.length === 0) return 0;
  const t = paragraph.toLowerCase();
  const hits = tool.hints.filter((h) => t.includes(h)).length;
  return hits / tool.hints.length;
}

/** All tools the paragraph-classifier would likely auto-pick: always-on + hint-matched. */
export function recommendedTools(paragraph: string): Set<string> {
  const out = new Set<string>();
  for (const t of SPAWN_TOOLS) {
    if (t.always) out.add(t.slug);
    else if (relevance(t, paragraph) > 0) out.add(t.slug);
  }
  return out;
}

export interface MissingDependency {
  /** The tool the operator selected that has unmet deps. */
  readonly tool: string;
  /** The deps that are not currently selected. */
  readonly missing: readonly string[];
}

/** Validates the selected set against each tool's dependsOn list. Returns
 *  the list of tools whose deps aren't met, plus the union of all missing
 *  dep slugs (handy for one-click "auto-include"). */
export function validateDependencies(selected: ReadonlySet<string>): {
  warnings: MissingDependency[];
  missingUnion: Set<string>;
} {
  const warnings: MissingDependency[] = [];
  const missingUnion = new Set<string>();
  for (const t of SPAWN_TOOLS) {
    if (!selected.has(t.slug) || !t.dependsOn || t.dependsOn.length === 0) continue;
    const missing = t.dependsOn.filter((d) => !selected.has(d));
    if (missing.length > 0) {
      warnings.push({ tool: t.slug, missing });
      for (const m of missing) missingUnion.add(m);
    }
  }
  return { warnings, missingUnion };
}

export interface CostSummary {
  /** Sum of low-volume monthly USD across the selected tools. */
  readonly low: number;
  /** Sum of mid-volume monthly USD. */
  readonly high: number;
  /** Top 5 cost contributors at the high-end, descending. */
  readonly drivers: ReadonlyArray<{ slug: string; label: string; high: number }>;
}

/** Aggregates upstream-API monthly cost across the selected tool set.
 *  Returns { low, high, drivers[] } where drivers ranks the 5 biggest
 *  contributors at the mid-volume cap. Each tool's cost is its own
 *  costMin/costMax — we don't double-count shared dependencies. */
export function summarizeCost(selected: ReadonlySet<string>): CostSummary {
  let low = 0;
  let high = 0;
  const contributions: Array<{ slug: string; label: string; high: number }> = [];
  for (const t of SPAWN_TOOLS) {
    if (!selected.has(t.slug)) continue;
    low += t.costMin;
    high += t.costMax;
    if (t.costMax > 0) contributions.push({ slug: t.slug, label: t.label, high: t.costMax });
  }
  contributions.sort((a, b) => b.high - a.high);
  return { low, high, drivers: contributions.slice(0, 5) };
}
