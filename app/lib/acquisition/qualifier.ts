// LLM step 4 of the acquisition pipeline: qualify each raw lead against
// the ICP. Scores 0-100 + tags hot/warm/cold/spam + gives a one-line
// reason the operator can audit.
//
// Batched 10 leads per call so we keep $$ down — sonnet would be
// overkill here, haiku has plenty of headroom for a structured score.
//
// Output goes to leads.qualified.jsonl alongside the raw rows. The
// orchestrator reads from this file when picking high-intent leads
// for content generation.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { callLLM } from '../llm-fallback';
import { resolveOutRoot } from '../spawn-loader';
import { publish } from './activity-bus';
import type { ICP } from './icp-extractor';
import type { Lead } from './lead-source';

export interface QualifiedLead extends Lead {
  /** 0-100. Threshold for outreach is configurable; default 70. */
  score: number;
  /** Discrete tier the operator filters by. */
  intent: 'hot' | 'warm' | 'cold' | 'spam';
  /** 0..1 fit with the ICP segment. */
  segment_fit: number;
  /** One-line reason — used in the UI as the audit trail. */
  reason: string;
  qualifiedAt: string;
}

const SYSTEM_PROMPT = `You score B2B / B2C prospects against an Ideal Customer Profile.

For each prospect, output STRICT JSON in this exact shape — return an array
of objects, one per input prospect, in the same order:

  [
    {
      "id": "<the prospect id from input>",
      "score": 0-100 integer,
      "intent": "hot" | "warm" | "cold" | "spam",
      "segment_fit": 0.0-1.0 number,
      "reason": "one short sentence — what tipped the score (max 120 chars)"
    },
    ...
  ]

Scoring guide:
- 90-100 hot: bio/url shows explicit intent in the ICP's segment + pain signals
- 70-89 warm: clear segment fit, no explicit intent signal yet
- 40-69 cold: adjacent segment or weak signal, worth a single touch
- 0-39 spam: not a real business, off-segment, spammy patterns

Be honest — if the prospect snippet is generic synthetic placeholder text,
score 30-50 with reason "synthetic candidate — needs real scrape" so the
operator knows the row is a stand-in.

Return JSON array only. No prose.`;

/** Qualify a list of leads. Returns one QualifiedLead per input, in the same order. */
export async function qualifyLeads(
  spawnId: string,
  icp: ICP,
  leads: Lead[],
): Promise<QualifiedLead[]> {
  if (leads.length === 0) return [];
  const dir = path.join(resolveOutRoot(), spawnId, '.acquisition');
  await fs.mkdir(dir, { recursive: true });
  const ledger = path.join(dir, 'leads.qualified.jsonl');

  const out: QualifiedLead[] = [];

  // Batched 10-at-a-time — keep LLM input tight, response latency low.
  const BATCH = 10;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const t0 = Date.now();

    const userMsg = buildUserMessage(icp, batch);
    let parsed: unknown = null;
    try {
      const result = await callLLM({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 1500,
        jsonMode: true,
      });
      parsed = JSON.parse(result.text);
    } catch (err) {
      await publish(spawnId, {
        kind: 'error',
        step: 'qualifier',
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      });
      // Fall back to safe defaults so the pipeline doesn't dead-end.
      parsed = batch.map((b) => ({
        id: b.id, score: 50, intent: 'cold', segment_fit: 0.5,
        reason: 'qualifier unavailable — defaulting to cold',
      }));
    }

    const scores = normalizeScores(parsed, batch);
    const qualified: QualifiedLead[] = batch.map((lead, idx) => {
      const s = scores[idx]!;
      return {
        ...lead,
        score: s.score,
        intent: s.intent,
        segment_fit: s.segment_fit,
        reason: s.reason,
        qualifiedAt: new Date().toISOString(),
      };
    });

    // Append batch to ledger.
    await fs.appendFile(ledger, qualified.map((q) => JSON.stringify(q)).join('\n') + '\n', 'utf-8');
    out.push(...qualified);

    await publish(spawnId, {
      kind: 'qualifier.batch',
      size: batch.length,
      ms: Date.now() - t0,
      ts: new Date().toISOString(),
    });
  }

  return out;
}

function buildUserMessage(icp: ICP, batch: Lead[]): string {
  return [
    'ICP:',
    `  segment: ${icp.segment}`,
    `  market: ${icp.market}`,
    `  buyer_persona: ${icp.buyer_persona}`,
    `  pain_signals: ${icp.pain_signals.join('; ')}`,
    '',
    `Prospects (${batch.length}):`,
    ...batch.map((b, i) =>
      `  [${i}] id=${b.id} platform=${b.platform} name="${b.name}" url=${b.url} snippet="${b.snippet}" location=${b.location ?? '—'}`,
    ),
    '',
    'Return a JSON array with one object per prospect.',
  ].join('\n');
}

interface Score {
  score: number;
  intent: 'hot' | 'warm' | 'cold' | 'spam';
  segment_fit: number;
  reason: string;
}

function normalizeScores(raw: unknown, batch: Lead[]): Score[] {
  const fallback = (): Score => ({
    score: 50, intent: 'cold', segment_fit: 0.5,
    reason: 'qualifier returned unparseable JSON — defaulting to cold',
  });
  if (!Array.isArray(raw)) return batch.map(fallback);
  return batch.map((_lead, i) => {
    const r = raw[i];
    if (!r || typeof r !== 'object') return fallback();
    const o = r as Record<string, unknown>;
    const score = typeof o.score === 'number' ? Math.max(0, Math.min(100, Math.round(o.score))) : 50;
    const intent = (o.intent === 'hot' || o.intent === 'warm' || o.intent === 'cold' || o.intent === 'spam') ? o.intent : intentFromScore(score);
    const segment_fit = typeof o.segment_fit === 'number' ? Math.max(0, Math.min(1, o.segment_fit)) : 0.5;
    const reason = typeof o.reason === 'string' ? o.reason.slice(0, 200) : '';
    return { score, intent, segment_fit, reason };
  });
}

function intentFromScore(score: number): Score['intent'] {
  if (score >= 90) return 'hot';
  if (score >= 70) return 'warm';
  if (score >= 40) return 'cold';
  return 'spam';
}
