// Dispatch an approved outreach draft.
//
// Tries each channel listed on the draft. Real send when both:
//   - the target exists on the lead (raw.email / lead.url for socials), AND
//   - the corresponding API key is present in env
// Falls back to dry-run otherwise — logged + counted as "sent-dry-run".
//
// Returns a SendReport with per-channel outcomes so the activity bus
// can publish honest events ("Email sent" vs "Email skipped — no key").

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveOutRoot } from '../spawn-loader';
import type { OutreachDraft } from './content-gen';
import type { QualifiedLead } from './qualifier';

export type ChannelOutcome =
  | { channel: 'email'; status: 'sent' | 'dry-run' | 'skipped' | 'failed'; reason?: string; messageId?: string }
  | { channel: 'linkedin' | 'bluesky' | 'mastodon'; status: 'sent' | 'dry-run' | 'skipped' | 'failed'; reason?: string; uri?: string };

export interface SendReport {
  draftId: string;
  outcomes: ChannelOutcome[];
}

export async function dispatchApprovedOutreach(
  spawnId: string,
  draft: OutreachDraft,
): Promise<SendReport> {
  const lead = await findQualifiedLead(spawnId, draft.leadId);
  const outcomes: ChannelOutcome[] = [];

  for (const channel of draft.channels) {
    if (channel === 'email') {
      outcomes.push(await sendEmail(draft, lead));
      continue;
    }
    if (channel === 'bluesky') {
      outcomes.push(await sendBluesky(draft));
      continue;
    }
    if (channel === 'mastodon') {
      outcomes.push(await sendMastodon(draft));
      continue;
    }
    if (channel === 'linkedin') {
      outcomes.push(await sendLinkedInViaBuffer(draft));
      continue;
    }
    outcomes.push({ channel: 'linkedin', status: 'skipped', reason: 'unknown channel' });
  }

  return { draftId: draft.id, outcomes };
}

// ── per-channel senders ──────────────────────────────────────────────

async function sendEmail(draft: OutreachDraft, lead: QualifiedLead | null): Promise<ChannelOutcome> {
  if (!draft.email) return { channel: 'email', status: 'skipped', reason: 'no email copy on draft' };
  const to = leadEmail(lead);
  if (!to) return { channel: 'email', status: 'skipped', reason: 'lead has no email address (synthetic or social-only)' };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'noreply@bf.allonelabs.com';
  if (!apiKey) {
    console.log(`[outreach/dry-run:email] to=${to} subject="${draft.email.subject}"`);
    return { channel: 'email', status: 'dry-run', reason: 'no RESEND_API_KEY' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: draft.email.subject,
        text: draft.email.body,
      }),
    });
    if (!res.ok) {
      return { channel: 'email', status: 'failed', reason: `Resend HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { channel: 'email', status: 'sent', messageId: data.id };
  } catch (err) {
    return { channel: 'email', status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}

async function sendBluesky(draft: OutreachDraft): Promise<ChannelOutcome> {
  const post = draft.social.find((s) => s.platform === 'bluesky');
  if (!post) return { channel: 'bluesky', status: 'skipped', reason: 'no bluesky copy on draft' };
  const handle = process.env.BLUESKY_HANDLE;
  const pwd = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !pwd) {
    console.log(`[outreach/dry-run:bluesky] text="${post.body.slice(0, 80)}…"`);
    return { channel: 'bluesky', status: 'dry-run', reason: 'no BLUESKY_HANDLE / APP_PASSWORD' };
  }
  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: pwd }),
    });
    if (!sessionRes.ok) {
      return { channel: 'bluesky', status: 'failed', reason: `session HTTP ${sessionRes.status}` };
    }
    const session = (await sessionRes.json()) as { accessJwt: string; did: string };
    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessJwt}` },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: { text: post.body, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.post' },
      }),
    });
    if (!postRes.ok) {
      return { channel: 'bluesky', status: 'failed', reason: `post HTTP ${postRes.status}` };
    }
    const rec = (await postRes.json().catch(() => ({}))) as { uri?: string };
    return { channel: 'bluesky', status: 'sent', uri: rec.uri };
  } catch (err) {
    return { channel: 'bluesky', status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}

// LinkedIn — routed through Buffer so we sidestep LinkedIn's full OAuth +
// Marketing-Developer-Platform approval dance. The operator connects their
// LinkedIn account once inside Buffer's UI; we just push posts to Buffer's
// queue via the access token Buffer issues.
//
// Env:
//   BUFFER_ACCESS_TOKEN — operator's Buffer access token (one per workspace)
//   BUFFER_LINKEDIN_PROFILE_ID — optional pin to a specific Buffer profile id.
//                                When unset, we list profiles and pick the
//                                first one with service='linkedin'.
//
// Returns 'dry-run' (with log line) when either env var is missing so the
// operator sees what would have shipped before flipping the switch.
async function sendLinkedInViaBuffer(draft: OutreachDraft): Promise<ChannelOutcome> {
  const post = draft.social.find((s) => s.platform === 'linkedin');
  if (!post) return { channel: 'linkedin', status: 'skipped', reason: 'no linkedin copy on draft' };

  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) {
    console.log(`[outreach/dry-run:linkedin] text="${post.body.slice(0, 80)}…"`);
    return { channel: 'linkedin', status: 'dry-run', reason: 'no BUFFER_ACCESS_TOKEN' };
  }

  try {
    // 1. Resolve the LinkedIn profile id (pinned or discovered).
    let profileId = process.env.BUFFER_LINKEDIN_PROFILE_ID;
    if (!profileId) {
      const profilesRes = await fetch('https://api.bufferapp.com/1/profiles.json', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profilesRes.ok) {
        return { channel: 'linkedin', status: 'failed', reason: `Buffer profiles HTTP ${profilesRes.status}` };
      }
      const profiles = (await profilesRes.json()) as Array<{ id: string; service: string }>;
      const li = profiles.find((p) => p.service === 'linkedin');
      if (!li) {
        return { channel: 'linkedin', status: 'failed', reason: 'no LinkedIn profile connected in Buffer' };
      }
      profileId = li.id;
    }

    // 2. Schedule the post. `now: true` posts immediately rather than queuing.
    const postRes = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_ids: [profileId], text: post.body, now: true }),
    });
    if (!postRes.ok) {
      return { channel: 'linkedin', status: 'failed', reason: `Buffer post HTTP ${postRes.status}` };
    }
    const data = (await postRes.json().catch(() => ({}))) as { success?: boolean; updates?: Array<{ id: string }> };
    if (!data.success) {
      return { channel: 'linkedin', status: 'failed', reason: 'Buffer returned success=false' };
    }
    const updateId = data.updates?.[0]?.id;
    return { channel: 'linkedin', status: 'sent', ...(updateId ? { uri: `buffer:${updateId}` } : {}) };
  } catch (err) {
    return { channel: 'linkedin', status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}

async function sendMastodon(draft: OutreachDraft): Promise<ChannelOutcome> {
  const post = draft.social.find((s) => s.platform === 'mastodon');
  if (!post) return { channel: 'mastodon', status: 'skipped', reason: 'no mastodon copy on draft' };
  const instance = process.env.MASTODON_INSTANCE; // e.g. https://mastodon.social
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!instance || !token) {
    console.log(`[outreach/dry-run:mastodon] text="${post.body.slice(0, 80)}…"`);
    return { channel: 'mastodon', status: 'dry-run', reason: 'no MASTODON_INSTANCE / ACCESS_TOKEN' };
  }
  try {
    const url = `${instance.replace(/\/$/, '')}/api/v1/statuses`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: post.body, visibility: 'public' }),
    });
    if (!res.ok) {
      return { channel: 'mastodon', status: 'failed', reason: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    return { channel: 'mastodon', status: 'sent', uri: data.url };
  } catch (err) {
    return { channel: 'mastodon', status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── lead lookup ──────────────────────────────────────────────────────

async function findQualifiedLead(spawnId: string, leadId: string): Promise<QualifiedLead | null> {
  try {
    const file = path.join(resolveOutRoot(), spawnId, '.acquisition', 'leads.qualified.jsonl');
    const raw = await fs.readFile(file, 'utf-8');
    for (const line of raw.split('\n').reverse()) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as QualifiedLead;
        if (row.id === leadId) return row;
      } catch { /* skip malformed */ }
    }
  } catch { /* missing ledger — treat as no-lead */ }
  return null;
}

function leadEmail(lead: QualifiedLead | null): string | null {
  if (!lead) return null;
  const raw = (lead.raw ?? {}) as Record<string, unknown>;
  const e = raw.email;
  if (typeof e !== 'string' || !e.includes('@')) return null;
  return e.trim();
}
