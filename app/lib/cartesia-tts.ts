// ════════════════════════════════════════════════════════════════════════════
// cartesia-tts — Cartesia Sonic TTS provider (v3 — slice 70)
//
// Higher-quality alternative to fal.ai voice-clone. Wraps the REST API:
//   - synthesize({ voiceId, text }) → MP3 buffer
//   - cloneVoice({ audioBytes, name }) → { voiceId } (Cartesia "clip" clone)
//
// Per-spawn preference via VideoProject.voicePreference 'fal' | 'cartesia'.
// Voice-clone route consults the preference (next slice) and routes here
// when 'cartesia'. Without CARTESIA_API_KEY in env, callers should
// degrade silently to fal.ai.
//
// Cartesia docs: https://docs.cartesia.ai/api-reference/tts/bytes
// Sonic-2 is the current default model id.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

const CARTESIA_API = 'https://api.cartesia.ai';
const CARTESIA_VERSION = '2024-11-13';
const DEFAULT_MODEL = 'sonic-2';
const DEFAULT_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091'; // Cartesia default-stock voice

export function isCartesiaConfigured(): boolean {
  return typeof process.env['CARTESIA_API_KEY'] === 'string'
    && process.env['CARTESIA_API_KEY'].length > 0;
}

export interface SynthesizeInput {
  text: string;
  /** Cartesia voice id. Falls back to DEFAULT_VOICE_ID when omitted. */
  voiceId?: string;
  /** "sonic-2" by default; "sonic" for the older model. */
  model?: string;
  /** ISO-639-1 code. Defaults to 'en'. */
  language?: string;
  /** mp3 default. wav supported but heavier. */
  outputFormat?: 'mp3' | 'wav';
}

export interface SynthesizeOutput {
  bytes: Uint8Array;
  contentType: string;
}

/** Synthesize speech via Cartesia's TTS bytes endpoint. Throws on misuse
 *  (no API key, malformed text); HTTP failures bubble up the response.
 *  Caller is responsible for persisting the bytes (typically to
 *  /public/audio/<id>.mp3). */
export async function cartesiaSynthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
  const apiKey = process.env['CARTESIA_API_KEY'];
  if (!apiKey) throw new Error('CARTESIA_API_KEY is not set — composer refuses to construct a request');
  const text = String(input.text ?? '').trim();
  if (text.length === 0) throw new Error('cartesiaSynthesize: text is required');
  if (text.length > 10_000) throw new Error('cartesiaSynthesize: text exceeds 10k cap');

  const format = input.outputFormat ?? 'mp3';
  const body = {
    model_id: input.model ?? DEFAULT_MODEL,
    transcript: text,
    voice: { mode: 'id', id: input.voiceId ?? DEFAULT_VOICE_ID },
    output_format: format === 'wav'
      ? { container: 'wav', encoding: 'pcm_s16le', sample_rate: 44100 }
      : { container: 'mp3', bit_rate: 192_000, sample_rate: 44100 },
    language: input.language ?? 'en',
  };

  const res = await fetch(`${CARTESIA_API}/tts/bytes`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Cartesia-Version': CARTESIA_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable body>');
    throw new Error(`cartesiaSynthesize: HTTP ${res.status} — ${err.slice(0, 500)}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, contentType: format === 'wav' ? 'audio/wav' : 'audio/mpeg' };
}

export interface CloneVoiceInput {
  audioBytes: Uint8Array;
  /** Operator-facing label. Cartesia stores this as the voice name. */
  name: string;
  /** Optional ISO-639-1 hint. Defaults to 'en'. */
  language?: string;
}

export interface CloneVoiceOutput {
  voiceId: string;
}

/** Clone a voice from a 10-30s audio sample. The result `voiceId` is
 *  what subsequent `cartesiaSynthesize({ voiceId, ... })` calls reference.
 *  Per Cartesia: 10-30s of clean speech, single speaker, no background
 *  music. Caller should validate these constraints before invoking. */
export async function cartesiaCloneVoice(input: CloneVoiceInput): Promise<CloneVoiceOutput> {
  const apiKey = process.env['CARTESIA_API_KEY'];
  if (!apiKey) throw new Error('CARTESIA_API_KEY is not set — composer refuses to construct a request');
  const name = String(input.name ?? '').trim();
  if (name.length === 0) throw new Error('cartesiaCloneVoice: name is required');
  if (input.audioBytes.byteLength === 0) throw new Error('cartesiaCloneVoice: audioBytes empty');
  if (input.audioBytes.byteLength > 25 * 1024 * 1024) throw new Error('cartesiaCloneVoice: audio exceeds 25MB cap');

  const fd = new FormData();
  // BlobPart accepts BufferSource; cast to ArrayBuffer for TS strict-mode
  // satisfaction. Runtime semantics unchanged — Uint8Array is a typed array
  // view, and Blob copies the bytes regardless of view type.
  fd.append('clip', new Blob([input.audioBytes.buffer as ArrayBuffer], { type: 'audio/wav' }), `${name}.wav`);
  fd.append('name', name);
  fd.append('language', input.language ?? 'en');
  fd.append('mode', 'stability');     // Cartesia's stable-clone mode (vs 'similarity')
  fd.append('enhance', 'true');

  const res = await fetch(`${CARTESIA_API}/voices/clone/clip`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Cartesia-Version': CARTESIA_VERSION,
      // Content-Type omitted — fetch sets multipart boundary automatically
    },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '<unreadable body>');
    throw new Error(`cartesiaCloneVoice: HTTP ${res.status} — ${err.slice(0, 500)}`);
  }

  const json = (await res.json()) as { id?: string; voice?: { id?: string } };
  const voiceId = json.id ?? json.voice?.id;
  if (typeof voiceId !== 'string') {
    throw new Error('cartesiaCloneVoice: response missing voice id');
  }
  return { voiceId };
}
