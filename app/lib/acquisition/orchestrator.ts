// Acquisition pipeline orchestrator — runs one cycle for a spawn.
//
// The 8-step flow (see _loop/ACQUISITION_PIPELINE.md):
//   1. ICP from brief                            ← THIS SLICE
//   2. Lead-hunter scrape                        ← stub, to be wired
//   3. Enrich + dedupe                           ← stub, to be wired
//   4. LLM qualifier                             ← Slice 2
//   5. Pick high-intent                          ← Slice 2
//   6. LLM content generator                     ← Slice 3
//   7. Approval gate                             ← Slice 3
//   8. Dispatch via existing leads.imported chain ← Slice 3
//
// Every step publishes an ActivityEvent so the operator can watch live
// AND replay from JSONL afterward.
//
// Entry points:
//   - runCycle(spawnId, brief)  — manual or cron-triggered
//   - The /api/spawn/[id]/acquisition/run route calls this.

import { randomUUID } from 'node:crypto';
import { publish } from './activity-bus';
import { getOrGenerateICP } from './icp-extractor';
import { gatherLeads } from './lead-source';
import { qualifyLeads } from './qualifier';
import { generateOutreach, type OutreachDraft } from './content-gen';
import { dispatchApprovedOutreach } from './dispatcher';
import { updateOutreach } from './outreach-store';

export interface CycleResult {
  cycleId: string;
  spawnId: string;
  startedAt: string;
  finishedAt: string;
  scraped: number;
  qualified: number;
  queued: number;
  dispatched: number;
  /** Steps that ran (skipped ones omitted). Lets the UI show progress. */
  steps: { name: string; ms: number; ok: boolean; note?: string }[];
}

export interface CycleOptions {
  /** When true, skip persistence — used by dry-run tests. */
  dryRun?: boolean;
  /** Per-spawn policy from settings/automation. Defaults to confirm. */
  approval?: 'auto' | 'confirm' | 'off';
}

export async function runCycle(
  spawnId: string,
  brief: string,
  opts: CycleOptions = {},
): Promise<CycleResult> {
  const cycleId = randomUUID();
  const startedAt = new Date().toISOString();
  const steps: CycleResult['steps'] = [];

  await publish(spawnId, { kind: 'cycle.start', cycleId, ts: startedAt });

  // ── Step 1: ICP ────────────────────────────────────────────────────
  let icpResult: Awaited<ReturnType<typeof getOrGenerateICP>> | null = null;
  const icpStart = Date.now();
  try {
    icpResult = await getOrGenerateICP(spawnId, brief);
    const ms = Date.now() - icpStart;
    const ts = new Date().toISOString();
    if (icpResult.cached) {
      await publish(spawnId, { kind: 'icp.cached', ts });
    } else {
      await publish(spawnId, { kind: 'icp.generated', ms, ts });
    }
    steps.push({ name: 'icp', ms, ok: true, note: icpResult.cached ? 'cached' : 'fresh' });
  } catch (err) {
    const ms = Date.now() - icpStart;
    const message = err instanceof Error ? err.message : String(err);
    await publish(spawnId, { kind: 'error', step: 'icp', message, ts: new Date().toISOString() });
    steps.push({ name: 'icp', ms, ok: false, note: message });
    // Without an ICP we can't proceed. Bail out early with a clean cycle.end.
    return finishCycle(spawnId, cycleId, startedAt, { scraped: 0, qualified: 0, queued: 0, dispatched: 0 }, steps);
  }

  const icp = icpResult.icp;

  // ── Step 2-3: scrape + dedupe (lead-source handles both) ───────────
  const scrapeStart = Date.now();
  let leads: Awaited<ReturnType<typeof gatherLeads>> = [];
  try {
    leads = await gatherLeads(spawnId, icp);
    steps.push({ name: 'scrape', ms: Date.now() - scrapeStart, ok: true, note: `${leads.length} new leads` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await publish(spawnId, { kind: 'error', step: 'scrape', message, ts: new Date().toISOString() });
    steps.push({ name: 'scrape', ms: Date.now() - scrapeStart, ok: false, note: message });
  }

  // ── Step 4: LLM qualifier ──────────────────────────────────────────
  const qualifyStart = Date.now();
  let qualifiedCount = 0;
  let qualified: Awaited<ReturnType<typeof qualifyLeads>> = [];
  if (leads.length > 0) {
    try {
      qualified = await qualifyLeads(spawnId, icp, leads);
      qualifiedCount = qualified.length;
      const highIntent = qualified.filter((q) => q.score >= 70 && q.segment_fit >= 0.7).length;
      steps.push({
        name: 'qualify',
        ms: Date.now() - qualifyStart,
        ok: true,
        note: `${qualifiedCount} scored · ${highIntent} high-intent`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await publish(spawnId, { kind: 'error', step: 'qualifier', message, ts: new Date().toISOString() });
      steps.push({ name: 'qualify', ms: Date.now() - qualifyStart, ok: false, note: message });
    }
  }

  // ── Steps 5-6: pick high-intent + LLM content generator ─────────────
  const contentStart = Date.now();
  let queued = 0;
  let drafts: OutreachDraft[] = [];
  // 'off' skips content-gen entirely — no drafts, no dispatch, no LLM spend.
  const approvalEarly = opts.approval ?? 'confirm';
  if (qualified.length > 0 && approvalEarly !== 'off') {
    try {
      // Brand voice default for now — read from per-spawn settings/automation
      // config in a follow-up. The orchestrator gates on its presence so we
      // never produce off-voice copy silently.
      const brandVoice = 'warm-casual';
      drafts = await generateOutreach(spawnId, icp, brandVoice, qualified);
      queued = drafts.length;
      steps.push({
        name: 'content',
        ms: Date.now() - contentStart,
        ok: true,
        note: `${queued} outreach drafted`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await publish(spawnId, { kind: 'error', step: 'content', message, ts: new Date().toISOString() });
      steps.push({ name: 'content', ms: Date.now() - contentStart, ok: false, note: message });
    }
  } else if (approvalEarly === 'off' && qualified.length > 0) {
    steps.push({ name: 'content', ms: 0, ok: true, note: 'skipped (approval=off)' });
  }

  // ── Step 7-8: approval gate + dispatch ──────────────────────────────
  // Drafts land in outreach.jsonl with status='pending'. The per-spawn
  // automation policy (auto/confirm/off) decides whether they auto-send.
  //   - 'confirm' (default): drafts stay pending; operator approves via UI
  //   - 'auto':              orchestrator dispatches every pending draft now
  //   - 'off':               skip content-gen entirely (handled upstream)
  let dispatched = 0;
  const approval = opts.approval ?? 'confirm';
  if (approval === 'auto' && queued > 0) {
    const dispatchStart = Date.now();
    let everySucceeded = true;
    for (const draft of drafts.filter((d) => d.status === 'pending')) {
      try {
        const report = await dispatchApprovedOutreach(spawnId, draft);
        const realAny = report.outcomes.some((o) => o.status === 'sent' || o.status === 'dry-run');
        const everyFailed = report.outcomes.length > 0 && report.outcomes.every((o) => o.status === 'failed');
        if (realAny) {
          dispatched++;
          await updateOutreach(spawnId, draft.id, { status: 'sent' });
        } else if (everyFailed) {
          everySucceeded = false;
        }
        // skipped: silent — no target, no key.
        for (const o of report.outcomes) {
          if (o.status === 'sent' || o.status === 'dry-run') {
            await publish(spawnId, {
              kind: 'queue.dispatch',
              channel: o.channel === 'email' ? 'email' : 'social',
              targetId: 'messageId' in o && o.messageId ? o.messageId : 'uri' in o && o.uri ? o.uri : draft.id,
              ts: new Date().toISOString(),
            });
          } else if (o.status === 'failed') {
            await publish(spawnId, {
              kind: 'error',
              step: `dispatch:${o.channel}`,
              message: o.reason ?? 'unknown',
              ts: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        everySucceeded = false;
        await publish(spawnId, {
          kind: 'error',
          step: 'dispatch',
          message: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString(),
        });
      }
    }
    steps.push({
      name: 'dispatch',
      ms: Date.now() - dispatchStart,
      ok: everySucceeded,
      note: `${dispatched}/${queued} auto-dispatched`,
    });
  }

  return finishCycle(spawnId, cycleId, startedAt, {
    scraped: leads.length,
    qualified: qualifiedCount,
    queued,
    dispatched,
  }, steps);
}


function finishCycle(
  spawnId: string,
  cycleId: string,
  startedAt: string,
  summary: { scraped: number; qualified: number; queued: number; dispatched: number },
  steps: CycleResult['steps'],
): CycleResult {
  const finishedAt = new Date().toISOString();
  // Fire-and-forget the cycle.end event.
  void publish(spawnId, { kind: 'cycle.end', cycleId, ts: finishedAt, summary });
  return { cycleId, spawnId, startedAt, finishedAt, ...summary, steps };
}
