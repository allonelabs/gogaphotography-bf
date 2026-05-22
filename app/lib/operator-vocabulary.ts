// ════════════════════════════════════════════════════════════════════════════
// Operator vocabulary translation — shared utilities.
//
// Wave 1 + 3 of operator-ui-ia.md. Translates internal artifacts (cellRefs,
// tool names, source tags) into operator-language sentences for surfaces
// that need to be operator-friendly: RunRails, Timeline, Bridges, Proposals.
//
// Engineer-facing surfaces (cells/[cellRef], bridges/page.tsx, matrix) keep
// the technical vocabulary — those are intentionally power-user views.
// ════════════════════════════════════════════════════════════════════════════

const TOOL_TO_SURFACE: Record<string, string> = {
  'brand-forge':       'Brand',
  'voice-forge':       'Brand voice',
  'site-forge':        'Website',
  'app-forge':         'App',
  'media-forge':       'Media',
  'ecom-forge':        'Shop',
  'booking-forge':     'Bookings',
  'content-factory':   'Content',
  'academy-forge':     'Courses',
  'knowledge-forge':   'Knowledge',
  'ad-reel':           'Videos',
  'social-forge':      'Social',
  'email-forge':       'Mails',
  'crm-spawn':         'Customers',
  'lead-hunter':       'Leads',
  'desk-forge':        'Support',
  'payment-forge':     'Billing',
  'ledger-spawn':      'Books',
  'proposal-forge':    'Proposals',
  'automation-forge':  'Automations',
  'legal-forge':       'Legal',
  'compliance-forge':  'Compliance',
  'analytics-forge':   'Analytics',
  'hr-forge':          'Hiring',
  'admin-spawn':       'Admin',
  'dns-forge':         'Domain',
  'monitor-forge':     'Status',
  'backup-forge':      'Backups',
};

/** Convert an internal tool slug ("brand-forge", "ad-reel") to its operator
 *  surface noun ("Brand", "Videos"). Falls back to a humanised slug. */
export function operatorSurfaceForTool(toolSlug: string): string {
  return TOOL_TO_SURFACE[toolSlug] ?? humaniseSlug(toolSlug);
}

/** Translate a cellRef + source-tag pair into a sentence an operator can
 *  read at a glance. No internal jargon (cell, source, fingerprint) in the
 *  output. Example:
 *    `brand-forge.tokens` + `manual` → "You edited Brand palette"
 *    `content-factory.post.kakheti` + `claude-authored` → "AI generated Content post — kakheti"
 */
export function cellRefToOperatorSentence(cellRef: string, source: string): string {
  const [tool, ...rest] = cellRef.split('.');
  const subject = rest.join('.') || 'core';
  const surface = operatorSurfaceForTool(tool ?? '');

  // Subject (the part after the tool slug) → readable detail
  const detail =
    subject === 'tokens'         ? 'palette'
    : subject === 'hero'         ? 'homepage hero'
    : subject === 'name-tagline' ? 'brand name & tagline'
    : subject === 'logo'         ? 'logo'
    : subject === 'voice'        ? 'brand voice'
    : subject.startsWith('post.')              ? `post — ${humaniseSlug(subject.slice('post.'.length))}`
    : subject.startsWith('queued-newsletter.') ? `newsletter — ${humaniseSlug(subject.slice('queued-newsletter.'.length))}`
    : subject.startsWith('queued-post.')       ? `social post — ${humaniseSlug(subject.slice('queued-post.'.length))}`
    : subject.startsWith('queued-welcome.')    ? `welcome email`
    : subject.startsWith('product.')           ? `product — ${humaniseSlug(subject.slice('product.'.length))}`
    : subject.startsWith('campaign.')          ? `campaign — ${humaniseSlug(subject.slice('campaign.'.length))}`
    : subject.startsWith('lesson-body.')       ? `lesson — ${humaniseSlug(subject.slice('lesson-body.'.length))}`
    : subject.includes('.')                    ? humaniseSlug(subject.split('.').slice(1).join(' '))
    : humaniseSlug(subject);

  // Verb depends on source tag (translated to operator-language)
  const verb =
    source === 'manual'           ? 'You edited'
    : source === 'locked'         ? 'You pinned'
    : source === 'claude-authored'? 'AI generated'
    : source === 'cache-hit'      ? 'Reused'
    : source === 'fallback'       ? 'Placeholder used for'
    : source === 'validate-failed'? 'Generation failed for'
    : source === 'deterministic'  ? 'Built'
    : source === 'autonomy'       ? 'Autonomy ran'
    : 'Updated';

  return `${verb} ${surface} ${detail}`;
}

/** Translate a bridge (from-tool → to-tool) into an operator sentence
 *  describing what the connection does. Example:
 *    `payment-forge → ledger-spawn` → "Billing → Books"
 *    `content-factory → social-forge` → "Content → Social"
 */
export function bridgeToOperatorSentence(fromTool: string, toTool: string): string {
  return `${operatorSurfaceForTool(fromTool)} → ${operatorSurfaceForTool(toTool)}`;
}

function humaniseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}
