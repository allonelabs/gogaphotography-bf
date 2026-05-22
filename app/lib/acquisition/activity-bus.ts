// In-memory pub/sub for acquisition-pipeline activity events.
//
// Every step of the pipeline emits a typed event. Two consumers care:
//   1. activity.jsonl — persistent ledger (replay + after-the-fact view)
//   2. SSE stream — live operator UI on /inbox
//
// This module is the in-memory bus. The SSE endpoint subscribes; the
// orchestrator publishes; the JSONL writer also subscribes.
//
// Lifetime: process-local (Vercel serverless lambda). When the spawn's
// orchestrator runs in one lambda and the operator's SSE connection is
// in another, they don't share the bus. That's fine for the first slice
// — the JSONL ledger is the durable channel; the bus is the bonus
// live-feed for operators currently watching. When we move to a single
// long-lived orchestrator (Auto-130 Hetzner) the bus becomes the
// primary channel.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveOutRoot } from '../spawn-loader';

export type ActivityEvent =
  | { kind: 'cycle.start'; cycleId: string; ts: string }
  | { kind: 'cycle.end'; cycleId: string; ts: string; summary: { scraped: number; qualified: number; queued: number; dispatched: number } }
  | { kind: 'icp.generated'; ms: number; ts: string }
  | { kind: 'icp.cached'; ts: string }
  | { kind: 'scrape.platform'; platform: 'maps' | '2gis' | 'instagram' | 'linkedin'; status: 'started' | 'done' | 'failed'; count?: number; page?: number; ts: string }
  | { kind: 'qualifier.batch'; size: number; ms: number; ts: string }
  | { kind: 'content.lead'; leadId: string; ms: number; channels: ('email' | 'linkedin' | 'bluesky' | 'mastodon')[]; ts: string }
  | { kind: 'outreach.decision'; draftId: string; leadId: string; decision: 'approved' | 'rejected'; channels: ('email' | 'linkedin' | 'bluesky' | 'mastodon')[]; ts: string }
  | { kind: 'queue.dispatch'; channel: 'email' | 'social'; targetId: string; ts: string }
  | { kind: 'error'; step: string; message: string; ts: string };

type Subscriber = (event: ActivityEvent) => void;
const subs = new Map<string, Set<Subscriber>>(); // keyed by spawnId

/** Subscribe to live events for one spawn. Returns the unsubscribe fn. */
export function subscribe(spawnId: string, sub: Subscriber): () => void {
  let set = subs.get(spawnId);
  if (!set) {
    set = new Set();
    subs.set(spawnId, set);
  }
  set.add(sub);
  return () => {
    set?.delete(sub);
    if (set?.size === 0) subs.delete(spawnId);
  };
}

/** Publish an event. Always writes to disk AND broadcasts in-memory. */
export async function publish(spawnId: string, event: ActivityEvent): Promise<void> {
  // 1. Broadcast to live subscribers (don't await — fire-and-forget).
  const set = subs.get(spawnId);
  if (set) {
    for (const sub of set) {
      try { sub(event); } catch { /* subscriber errors shouldn't block pipeline */ }
    }
  }
  // 2. Append to disk ledger. This is the durable channel.
  try {
    const dir = path.join(resolveOutRoot(), spawnId, '.acquisition');
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, 'activity.jsonl'), JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // Best-effort. If disk write fails the in-memory broadcast still went
    // out, and the next event will try again.
  }
}

/** Read the last N events from disk — for the after-the-fact view. */
export async function readRecent(spawnId: string, limit = 50): Promise<ActivityEvent[]> {
  try {
    const file = path.join(resolveOutRoot(), spawnId, '.acquisition', 'activity.jsonl');
    const raw = await fs.readFile(file, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const tail = lines.slice(-limit);
    return tail
      .map((l): ActivityEvent | null => {
        try { return JSON.parse(l) as ActivityEvent; } catch { return null; }
      })
      .filter((x): x is ActivityEvent => x !== null);
  } catch {
    return [];
  }
}
