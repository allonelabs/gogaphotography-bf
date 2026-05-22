// LLM step 1 of the acquisition pipeline: derive an ICP (Ideal Customer
// Profile) from the business brief. Cached on disk by hash(brief) so the
// same brief doesn't re-bill the model. Invalidated when the operator
// edits the brief (delete out/<slug>/.acquisition/icp.json).
//
// Downstream consumers (lead-hunter, qualifier, content-gen) read this
// file to drive their behavior. Keep the schema STABLE — version it if
// it has to change.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { callLLM } from '../llm-fallback';
import { resolveOutRoot } from '../spawn-loader';

export interface ICP {
  /** Stable hash of the brief used to produce this. Operator brief edit → new hash → regen. */
  source_hash: string;
  /** ISO timestamp when generated. */
  generated_at: string;
  /** Schema version. Bump when the shape changes so consumers can adapt. */
  schema_version: 1;

  /** One-line segment description — used as the prompt for downstream LLMs. */
  segment: string;
  /** Broader market category. */
  market: string;
  /** Geographic regions in priority order. ISO country / region codes. */
  regions: string[];
  /** Search keywords for scrapers. */
  keywords: string[];
  /** Channels to prioritise. Lead-hunter reads this to decide which sub-tools to invoke. */
  channels: ('google-maps' | 'twogis' | 'instagram' | 'linkedin')[];
  /** Persona description — used by content-gen for tone. */
  buyer_persona: string;
  /** Pain-signal phrases to look for in scraped bios / sites. */
  pain_signals: string[];
}

const SYSTEM_PROMPT = `You are a B2B / B2C go-to-market strategist. Given a one-paragraph business
description, output STRICT JSON describing the ideal customer profile.

Schema (no other keys):
{
  "segment": "one-line description of the target customer segment, e.g. 'B2B SaaS · small dev teams (5-20)'",
  "market": "broader category, e.g. 'developer tools'",
  "regions": ["US","EU","GB"],
  "keywords": ["7-10 search phrases a scraper would use to find prospects"],
  "channels": ["google-maps" | "twogis" | "instagram" | "linkedin"],
  "buyer_persona": "one sentence on who the decision-maker is",
  "pain_signals": ["5-8 short phrases that signal high intent if seen in a prospect's bio/site"]
}

Pick channels honestly: if the business sells to consumers physically located somewhere,
include google-maps + twogis. If it's a developer tool, include linkedin + google-maps
(for tech-meetups). If it's lifestyle/creator, include instagram. Be specific.

Return JSON only.`;

/**
 * Get the ICP for a spawn. Reads cached version if its source_hash matches
 * the current brief; otherwise regenerates via LLM and writes the new
 * version to disk.
 *
 * Returns the ICP plus a boolean indicating whether the call was cached.
 */
export async function getOrGenerateICP(spawnId: string, brief: string): Promise<{ icp: ICP; cached: boolean }> {
  const hash = createHash('sha256').update(brief).digest('hex').slice(0, 16);
  const filePath = path.join(resolveOutRoot(), spawnId, '.acquisition', 'icp.json');

  // Try cache first.
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const cached = JSON.parse(raw) as ICP;
    if (cached?.source_hash === hash && cached?.schema_version === 1) {
      return { icp: cached, cached: true };
    }
  } catch {
    // Cache miss or unreadable — fall through to regen.
  }

  // Regen via LLM.
  const result = await callLLM({
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: brief }],
    maxTokens: 1024,
    jsonMode: true,
  });

  const parsed = parseICP(result.text);
  if (!parsed) {
    throw new Error('icp-extractor: LLM returned unparseable JSON');
  }

  const icp: ICP = {
    source_hash: hash,
    generated_at: new Date().toISOString(),
    schema_version: 1,
    ...parsed,
  };

  // Persist atomically. mkdir first.
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(icp, null, 2) + '\n', 'utf-8');

  return { icp, cached: false };
}

/** Parse + validate LLM output. Returns null if the shape's wrong. */
function parseICP(raw: string): Omit<ICP, 'source_hash' | 'generated_at' | 'schema_version'> | null {
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;

  const segment = typeof r.segment === 'string' ? r.segment : null;
  const market = typeof r.market === 'string' ? r.market : null;
  const buyer_persona = typeof r.buyer_persona === 'string' ? r.buyer_persona : null;
  if (!segment || !market || !buyer_persona) return null;

  const regions = Array.isArray(r.regions) ? r.regions.filter((x): x is string => typeof x === 'string') : [];
  const keywords = Array.isArray(r.keywords) ? r.keywords.filter((x): x is string => typeof x === 'string') : [];
  const pain_signals = Array.isArray(r.pain_signals) ? r.pain_signals.filter((x): x is string => typeof x === 'string') : [];
  const channelsRaw = Array.isArray(r.channels) ? r.channels.filter((x): x is string => typeof x === 'string') : [];
  const allowed: ICP['channels'] = [];
  for (const c of channelsRaw) {
    if (c === 'google-maps' || c === 'twogis' || c === 'instagram' || c === 'linkedin') allowed.push(c);
  }

  if (keywords.length === 0 || allowed.length === 0) return null;

  return {
    segment,
    market,
    regions,
    keywords,
    channels: allowed,
    buyer_persona,
    pain_signals,
  };
}
