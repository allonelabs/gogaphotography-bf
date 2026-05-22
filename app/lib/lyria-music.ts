// ════════════════════════════════════════════════════════════════════════════
// lyria-music — Google Lyria music gen via Vertex AI (v3 — slice 71)
//
// Operator's GOOGLE_API_KEY drives this path; when set + GOOGLE_PROJECT_ID
// also set, the wrapper calls Lyria's predict endpoint:
//   POST https://us-central1-aiplatform.googleapis.com/v1/projects/<PROJ>
//        /locations/us-central1/publishers/google/models/lyria-002:predict
//
// Response shape: { predictions: [{ bytesBase64Encoded, mimeType }] }
// We decode + return the raw audio bytes; caller persists to disk.
//
// Per-spawn `musicPreference: 'fal' | 'lyria' | 'artlist'` (slice 68
// schema) drives the choice; default 'fal' means existing fal.ai music
// gen continues to fire. When operator picks 'lyria' AND env is set,
// /audio-generate will route here. Without env → falls back to fal.
//
// Lyria docs: https://cloud.google.com/vertex-ai/generative-ai/docs/music/generate-music
// Note: Lyria 002 is the public model id; access may be region-gated and
// requires Vertex AI API enabled on the operator's GCP project.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

const VERTEX_REGION = 'us-central1';
const DEFAULT_MODEL = 'lyria-002';

export function isLyriaConfigured(): boolean {
  return typeof process.env['GOOGLE_API_KEY'] === 'string'
    && process.env['GOOGLE_API_KEY'].length > 0
    && typeof process.env['GOOGLE_PROJECT_ID'] === 'string'
    && process.env['GOOGLE_PROJECT_ID'].length > 0;
}

export interface LyriaGenerateInput {
  prompt: string;
  /** Negative prompt — what to AVOID. e.g. "vocals, lyrics, sirens". */
  negativePrompt?: string;
  /** Lyria models default to 30s clips; this is advisory — the model
   *  enforces its own bounds. Operator can request 5-60s and we trust
   *  the response length. */
  durationSeconds?: number;
  /** Sample count. 1 default. Higher = N variants returned. */
  sampleCount?: number;
  /** Override the model id; defaults to lyria-002. */
  model?: string;
  /** Override region; defaults to us-central1. */
  region?: string;
  /** Optional seed for deterministic generation. */
  seed?: number;
}

export interface LyriaGenerateOutput {
  /** First prediction's audio bytes — caller usually wants this. */
  bytes: Uint8Array;
  /** MIME type from the prediction. Lyria returns audio/wav today. */
  contentType: string;
  /** All predictions decoded — present when sampleCount > 1. */
  variants?: Array<{ bytes: Uint8Array; contentType: string }>;
}

/** Generate music via Lyria. Throws when env not configured (caller
 *  should consult `isLyriaConfigured()` first) or HTTP fails. The
 *  endpoint is sync — no queue + poll like fal.ai. Latency is 5-15s
 *  for a 30s clip. */
export async function lyriaGenerate(input: LyriaGenerateInput): Promise<LyriaGenerateOutput> {
  const apiKey = process.env['GOOGLE_API_KEY'];
  const projectId = process.env['GOOGLE_PROJECT_ID'];
  if (!apiKey) throw new Error('GOOGLE_API_KEY is not set — composer refuses to construct a request');
  if (!projectId) throw new Error('GOOGLE_PROJECT_ID is not set — composer refuses to construct a request');

  const prompt = String(input.prompt ?? '').trim();
  if (prompt.length === 0) throw new Error('lyriaGenerate: prompt is required');
  if (prompt.length > 2_000) throw new Error('lyriaGenerate: prompt exceeds 2k cap');

  const region = input.region ?? VERTEX_REGION;
  const model = input.model ?? DEFAULT_MODEL;
  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;

  const instance: Record<string, unknown> = { prompt };
  if (input.negativePrompt) instance['negative_prompt'] = input.negativePrompt;
  if (typeof input.seed === 'number') instance['seed'] = input.seed;

  const body = {
    instances: [instance],
    parameters: {
      sample_count: input.sampleCount ?? 1,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable body>');
    throw new Error(`lyriaGenerate: HTTP ${res.status} — ${err.slice(0, 500)}`);
  }

  const json = (await res.json()) as { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> };
  const predictions = json.predictions ?? [];
  if (predictions.length === 0) {
    throw new Error('lyriaGenerate: response had no predictions');
  }

  const decoded = predictions.map((p) => ({
    bytes: decodeBase64(p.bytesBase64Encoded ?? ''),
    contentType: p.mimeType ?? 'audio/wav',
  }));

  if (decoded.length === 0 || decoded[0]!.bytes.byteLength === 0) {
    throw new Error('lyriaGenerate: prediction missing audio bytes');
  }

  return {
    bytes: decoded[0]!.bytes,
    contentType: decoded[0]!.contentType,
    ...(decoded.length > 1 ? { variants: decoded } : {}),
  };
}

/** Decode a base64 string to Uint8Array. Node's Buffer is the path of
 *  least resistance in a server-only module — atob() works in browsers
 *  but the wrapper is `server-only` so Node Buffer is always available. */
function decodeBase64(s: string): Uint8Array {
  if (typeof s !== 'string' || s.length === 0) return new Uint8Array(0);
  return new Uint8Array(Buffer.from(s, 'base64'));
}
