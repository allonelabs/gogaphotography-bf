// LLM step 6 of the acquisition pipeline: for each high-intent qualified
// lead, generate personalized outreach — email (subject + preview + body)
// plus 1-2 short social variants (LinkedIn / Bluesky) sized for the
// platform's character limit.
//
// Model: Claude sonnet 4.6 — copy quality matters more than $$ at this
// step. Cached by hash(leadId + week) so the same lead doesn't get the
// same outreach drafted twice in a week.
//
// Output rows land in outreach.jsonl with status='pending'. The cron /
// approval gate (Slice 5) drains them into the existing leads.imported
// chain when an email address exists. When the lead only has a social
// URL we route to dispatchQueuedSocialPosts instead. Either way, the
// generated copy is what gets sent.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { callLLM } from '../llm-fallback';
import { resolveOutRoot } from '../spawn-loader';
import { publish } from './activity-bus';
import type { ICP } from './icp-extractor';
import type { QualifiedLead } from './qualifier';

export interface OutreachDraft {
  /** Stable id derived from lead.id + week-of-year. */
  id: string;
  leadId: string;
  /** Composite key so we know which week's draft this is — re-runs same week skip. */
  weekKey: string;
  /** Channels this lead is reachable on. */
  channels: ('email' | 'linkedin' | 'bluesky' | 'mastodon')[];
  /** Email payload — present when email channel applies. */
  email?: {
    subject: string;
    preview: string;
    body: string;
  };
  /** One short post per social channel (if applicable). */
  social: Array<{
    platform: 'linkedin' | 'bluesky' | 'mastodon';
    body: string;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  generatedAt: string;
}

const SYSTEM_PROMPT = `You write outreach copy for a B2B / B2C business reaching prospects it
just scored as a good fit. Output STRICT JSON only.

You'll get:
- the business's brand voice ("warm-casual" / "professional" / "playful" / "calm")
- the ICP segment + buyer persona
- one prospect: id, name, snippet, channels available, intent reason

Return:
  {
    "email": {
      "subject":  "max 60 chars, personal, no all-caps, no exclamation",
      "preview":  "max 90 chars, complements the subject",
      "body":     "120-180 words, plain text, opens with a specific reference to the prospect's snippet/name, ends with a low-pressure CTA"
    },
    "social": [
      { "platform": "linkedin", "body": "max 280 chars, conversational" },
      { "platform": "bluesky",  "body": "max 280 chars, conversational" }
    ]
  }

Rules:
- Include "email" only if the channels list contains "email"
- Include each social entry only if its platform is in channels
- NEVER fabricate the prospect's product, employees, or revenue
- If the prospect snippet is generic ("synthetic candidate"), write a
  neutral introduction without specifics — DO NOT pretend to know more
- Reference the prospect by name once in the body
- Match the brand voice — warm-casual is informal but not slangy;
  professional is direct, not stiff; playful uses one tasteful joke;
  calm is short sentences with breathing room

Return JSON only. No prose.`;

/**
 * Generate outreach for a batch of high-intent qualified leads.
 *
 * Filters to score >= 70 AND segment_fit >= 0.7 (the threshold for
 * "worth reaching out to"). Skips leads we already drafted for in the
 * current ISO week.
 */
export async function generateOutreach(
  spawnId: string,
  icp: ICP,
  brandVoice: 'warm-casual' | 'professional' | 'playful' | 'calm',
  leads: QualifiedLead[],
): Promise<OutreachDraft[]> {
  const eligible = leads.filter((l) => l.score >= 70 && l.segment_fit >= 0.7);
  if (eligible.length === 0) return [];

  const dir = path.join(resolveOutRoot(), spawnId, '.acquisition');
  await fs.mkdir(dir, { recursive: true });
  const ledger = path.join(dir, 'outreach.jsonl');

  // Load existing draft ids (lead + week) so we don't re-draft.
  const drafted = new Set<string>();
  try {
    const raw = await fs.readFile(ledger, 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line) as OutreachDraft;
        if (d.id) drafted.add(d.id);
      } catch { /* skip */ }
    }
  } catch { /* fresh */ }

  const weekKey = currentIsoWeek();
  const out: OutreachDraft[] = [];

  for (const lead of eligible) {
    const draftId = createHash('sha256')
      .update(`${lead.id}|${weekKey}`)
      .digest('hex')
      .slice(0, 16);
    if (drafted.has(draftId)) continue;

    const channels = channelsForLead(lead);
    if (channels.length === 0) continue;

    const t0 = Date.now();
    interface LLMOutput {
      email?: { subject: string; preview: string; body: string };
      social?: Array<{ platform: string; body: string }>;
    }
    let parsed: LLMOutput | null = null;

    try {
      const userMsg = buildUserMessage(icp, brandVoice, lead, channels);
      const result = await callLLM({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 1024,
        jsonMode: true,
        // Prefer sonnet for copy quality; the fallback ladder picks haiku
        // if sonnet's unavailable.
        models: { anthropic: 'claude-sonnet-4-6' },
      });
      parsed = JSON.parse(result.text) as LLMOutput;
    } catch (err) {
      await publish(spawnId, {
        kind: 'error',
        step: 'content',
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      });
      continue; // skip this lead; try the next
    }

    if (!parsed) continue;

    const draft: OutreachDraft = {
      id: draftId,
      leadId: lead.id,
      weekKey,
      channels,
      email: channels.includes('email') && parsed.email
        ? {
            subject: String(parsed.email.subject ?? '').slice(0, 120),
            preview: String(parsed.email.preview ?? '').slice(0, 200),
            body: String(parsed.email.body ?? '').slice(0, 4000),
          }
        : undefined,
      social: (parsed.social ?? [])
        .filter((s): s is { platform: string; body: string } =>
          s && typeof s === 'object' && typeof s.platform === 'string' && typeof s.body === 'string',
        )
        .filter((s) => s.platform === 'linkedin' || s.platform === 'bluesky' || s.platform === 'mastodon')
        .map((s) => ({
          platform: s.platform as 'linkedin' | 'bluesky' | 'mastodon',
          body: s.body.slice(0, 600),
        })),
      status: 'pending',
      generatedAt: new Date().toISOString(),
    };

    await fs.appendFile(ledger, JSON.stringify(draft) + '\n', 'utf-8');
    out.push(draft);
    drafted.add(draftId);

    await publish(spawnId, {
      kind: 'content.lead',
      leadId: lead.id,
      ms: Date.now() - t0,
      channels: draft.channels,
      ts: new Date().toISOString(),
    });
  }

  return out;
}

function channelsForLead(lead: QualifiedLead): OutreachDraft['channels'] {
  // Map platform → reachable channels. Real scrapers fill in
  // emails / handles; for synthetic leads, we route via the discovery
  // platform itself (LinkedIn / Bluesky / no email).
  const channels: OutreachDraft['channels'] = [];
  // Email channel is added when the lead's raw fields include a real
  // address. Synthetic leads don't — those route via social only.
  const raw = lead.raw ?? {};
  const maybeEmail = typeof (raw as Record<string, unknown>).email === 'string'
    ? ((raw as Record<string, unknown>).email as string)
    : null;
  if (maybeEmail && maybeEmail.includes('@')) channels.push('email');
  if (lead.platform === 'linkedin') channels.push('linkedin');
  if (lead.platform === 'instagram') channels.push('bluesky'); // we can't post to IG (no API); cross-post to bluesky instead
  if (lead.platform === 'google-maps' || lead.platform === 'twogis') {
    // Local-business leads — no social reach unless we got the IG/website. Skip.
    // (when real scrapers extract the linked IG/site, that adds channels here.)
  }
  return channels;
}

function buildUserMessage(
  icp: ICP,
  brandVoice: string,
  lead: QualifiedLead,
  channels: OutreachDraft['channels'],
): string {
  return [
    `Brand voice: ${brandVoice}`,
    `ICP segment: ${icp.segment}`,
    `Buyer persona: ${icp.buyer_persona}`,
    '',
    `Prospect:`,
    `  id: ${lead.id}`,
    `  name: ${lead.name}`,
    `  platform: ${lead.platform}`,
    `  snippet: ${lead.snippet}`,
    `  intent: ${lead.intent} (score ${lead.score}/100, fit ${lead.segment_fit.toFixed(2)})`,
    `  qualifier said: ${lead.reason}`,
    '',
    `Channels available: ${channels.join(', ')}`,
    '',
    'Return JSON.',
  ].join('\n');
}

function currentIsoWeek(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
