// ════════════════════════════════════════════════════════════════════════════
// fal-queue — shared submit/poll/result/download primitives for every fal.ai
// queue endpoint we dispatch to (Seedance, cassetteai music, Topaz upscale,
// Bria bg-remove, Framepack interpolation, sync-lipsync, dia-tts, playai TTS).
//
// Each route owns its own persistence shape and result-extraction logic; this
// module owns the wire protocol. Slice 20 of the v1 plan — pure refactor with
// no behavior change.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { writeFile } from 'node:fs/promises';

const QUEUE_BASE = 'https://queue.fal.run';

export interface FalStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | string;
}

/** Submit a request body to a fal.ai queue endpoint. Returns the request_id
 *  or throws with the upstream error text on a non-2xx response. */
export async function falSubmit(
  endpoint: string,
  key: string,
  body: Record<string, unknown>,
): Promise<string> {
  const r = await fetch(`${QUEUE_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { authorization: `Key ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`fal.ai submit ${r.status}: ${text.slice(0, 300)}`);
  }
  const data = (await r.json()) as { request_id?: string };
  if (!data.request_id) throw new Error('fal.ai response missing request_id');
  return data.request_id;
}

/** Best-effort status poll — returns null on any failure so callers leave the
 *  row queued for the next pass instead of hard-locking on a transient error. */
export async function falPoll(
  endpoint: string,
  key: string,
  requestId: string,
): Promise<FalStatus | null> {
  try {
    const r = await fetch(`${QUEUE_BASE}/${endpoint}/requests/${requestId}/status`, {
      headers: { authorization: `Key ${key}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as FalStatus;
  } catch { return null; }
}

/** Fetch the result payload for a completed request. Returns the parsed JSON
 *  or null on failure — caller extracts the actual asset URL since the field
 *  shape varies by endpoint (video.url, audio_file.url, output.url, etc). */
export async function falResult<T = unknown>(
  endpoint: string,
  key: string,
  requestId: string,
): Promise<T | null> {
  try {
    const r = await fetch(`${QUEUE_BASE}/${endpoint}/requests/${requestId}`, {
      headers: { authorization: `Key ${key}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

/** Download a public URL to disk. Throws on non-2xx. */
export async function downloadTo(url: string, absPath: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(absPath, buf);
}
