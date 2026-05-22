// ════════════════════════════════════════════════════════════════════════════
// video-chat-config — per-spawn customization of the video-chat surface
// (v3 — slice 79). Closes the v3 vision pillar #7 ("editable production
// machine"): operators can rename actions, alias common phrases, and
// override defaults without touching code.
//
// Config lives at `out/<spawnId>/site/.bf/video-chat-config.json`. Schema:
//   {
//     "aliases":   { "<phrase>": "<canonical-prose>" },
//     "disabled":  ["<actionKind>", ...],
//     "defaults":  {
//       "generateAd":      { "aspect"?: "16:9"|"9:16"|"1:1", "fps"?: 30|60 },
//       "generateSeedance":{ "aspectRatio"?: "16:9"|"9:16"|"1:1", "durationSeconds"?: 5|10|15 },
//       "generateMusic":   { "durationSeconds"?: number },
//     }
//   }
//
// All fields optional. Missing file or invalid JSON → empty config (no-op).
// Aliases are case-insensitive whole-prose matches; the FIRST hit wins.
// "Whole-prose" = trimmed lower-cased equality, not substring — keeps the
// substitution table simple + predictable.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export interface VideoChatConfig {
  aliases?: Record<string, string>;
  disabled?: string[];
  defaults?: {
    generateAd?: { aspect?: '16:9' | '9:16' | '1:1'; fps?: 30 | 60 };
    generateSeedance?: { aspectRatio?: '16:9' | '9:16' | '1:1'; durationSeconds?: 5 | 10 | 15 };
    generateMusic?: { durationSeconds?: number };
  };
}

const EMPTY: VideoChatConfig = Object.freeze({});

/** Read the per-spawn config from disk. Returns empty config on any
 *  failure (missing file, malformed JSON, type mismatch). The route uses
 *  the result as-is — every field is optional. */
export async function readVideoChatConfig(spawnId: string): Promise<VideoChatConfig> {
  if (!spawnId || typeof spawnId !== 'string') return EMPTY;
  try {
    const file = path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'video-chat-config.json');
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return sanitize(parsed);
  } catch {
    return EMPTY;
  }
}

function sanitize(parsed: unknown): VideoChatConfig {
  if (!parsed || typeof parsed !== 'object') return EMPTY;
  const obj = parsed as Record<string, unknown>;
  const out: VideoChatConfig = {};

  if (obj['aliases'] && typeof obj['aliases'] === 'object') {
    const aliases: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj['aliases'] as Record<string, unknown>)) {
      const key = String(k).trim().toLowerCase().slice(0, 200);
      const val = String(v).trim().slice(0, 600);
      if (key && val) aliases[key] = val;
    }
    if (Object.keys(aliases).length > 0) out.aliases = aliases;
  }

  if (Array.isArray(obj['disabled'])) {
    const disabled = obj['disabled']
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .slice(0, 32);
    if (disabled.length > 0) out.disabled = disabled;
  }

  if (obj['defaults'] && typeof obj['defaults'] === 'object') {
    const defs = obj['defaults'] as Record<string, unknown>;
    const sanitized: NonNullable<VideoChatConfig['defaults']> = {};
    if (defs['generateAd'] && typeof defs['generateAd'] === 'object') {
      const a = defs['generateAd'] as Record<string, unknown>;
      const ad: NonNullable<VideoChatConfig['defaults']>['generateAd'] = {};
      if (['16:9', '9:16', '1:1'].includes(String(a['aspect']))) ad.aspect = String(a['aspect']) as '16:9' | '9:16' | '1:1';
      if ([30, 60].includes(Number(a['fps']))) ad.fps = Number(a['fps']) as 30 | 60;
      if (Object.keys(ad).length > 0) sanitized.generateAd = ad;
    }
    if (defs['generateSeedance'] && typeof defs['generateSeedance'] === 'object') {
      const s = defs['generateSeedance'] as Record<string, unknown>;
      const sd: NonNullable<VideoChatConfig['defaults']>['generateSeedance'] = {};
      if (['16:9', '9:16', '1:1'].includes(String(s['aspectRatio']))) sd.aspectRatio = String(s['aspectRatio']) as '16:9' | '9:16' | '1:1';
      if ([5, 10, 15].includes(Number(s['durationSeconds']))) sd.durationSeconds = Number(s['durationSeconds']) as 5 | 10 | 15;
      if (Object.keys(sd).length > 0) sanitized.generateSeedance = sd;
    }
    if (defs['generateMusic'] && typeof defs['generateMusic'] === 'object') {
      const m = defs['generateMusic'] as Record<string, unknown>;
      const dur = Number(m['durationSeconds']);
      if (Number.isFinite(dur) && dur >= 5 && dur <= 60) {
        sanitized.generateMusic = { durationSeconds: dur };
      }
    }
    if (Object.keys(sanitized).length > 0) out.defaults = sanitized;
  }
  return out;
}

/** Apply alias substitution to operator prose. Whole-prose, case-insensitive
 *  match. Returns the rewritten prose, or the input unchanged if no alias
 *  fires. Aliases let operators say "vibe check" and have it route to
 *  "show locks" (or any other canonical phrase) without touching the
 *  classifier. */
export function applyAliases(prose: string, aliases: Record<string, string> | undefined): string {
  if (!aliases) return prose;
  const key = prose.trim().toLowerCase();
  const hit = aliases[key];
  return hit ?? prose;
}

/** Suppress disabled action kinds. When the classifier picked a kind the
 *  operator has disabled in config, swap it for an `unknown` action with
 *  an operator-actionable nudge. Lets operators turn off noisy or risky
 *  generation kinds for a particular spawn (e.g. disable `generate-ad`
 *  during a budget freeze) without touching code. */
export function applyDisabled<T extends { kind: string }>(
  action: T,
  disabled: readonly string[] | undefined,
): T | { kind: 'unknown'; reason: string } {
  if (!disabled || disabled.length === 0) return action;
  if (disabled.includes(action.kind)) {
    return {
      kind: 'unknown',
      reason: `Action "${action.kind}" is disabled for this spawn (see .bf/video-chat-config.json).`,
    };
  }
  return action;
}
