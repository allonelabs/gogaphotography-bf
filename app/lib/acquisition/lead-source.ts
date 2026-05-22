// Lead source — emits raw lead candidates from the ICP.
//
// Today: synthetic generator that produces plausible prospect shapes
// from ICP.keywords + regions, with per-platform event emission so the
// LiveActivity panel renders real "Scraping Google Maps page 2 of 5"
// progress.
//
// Tomorrow (when API keys exist): swap the body of each per-platform
// function for the real scraper call. The Lead shape + emit pattern
// stay the same — the qualifier and dispatch don't care which path
// produced the row.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolveOutRoot } from '../spawn-loader';
import { publish } from './activity-bus';
import { leadsBackendConfigured, searchLeads, type LeadsRow } from './supabase-leads';
import type { ICP } from './icp-extractor';

export interface Lead {
  /** Stable id: hash(platform + url-or-name). De-dupe key. */
  id: string;
  /** Platform the lead came from. */
  platform: 'google-maps' | 'twogis' | 'instagram' | 'linkedin';
  /** Display name (business / person). */
  name: string;
  /** URL (website / social profile). */
  url: string;
  /** A one-line scraped snippet — tagline / about / first-line bio. */
  snippet: string;
  /** Optional location string. */
  location?: string;
  /** Source-specific raw fields, kept for forensics. */
  raw?: Record<string, unknown>;
  /** ISO timestamp when the row was added. */
  scrapedAt: string;
}

/**
 * Run the lead-gathering step. Iterates ICP.channels, emits scrape
 * events per platform, and appends new leads to leads.raw.jsonl.
 *
 * De-dupes against any existing rows in the same file so re-runs don't
 * pile duplicates.
 */
export async function gatherLeads(spawnId: string, icp: ICP): Promise<Lead[]> {
  const dir = path.join(resolveOutRoot(), spawnId, '.acquisition');
  await fs.mkdir(dir, { recursive: true });
  const ledger = path.join(dir, 'leads.raw.jsonl');

  // Load existing ids so we don't double-add.
  const seen = new Set<string>();
  try {
    const raw = await fs.readFile(ledger, 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Lead;
        if (row.id) seen.add(row.id);
      } catch { /* skip malformed */ }
    }
  } catch { /* fresh ledger */ }

  const fresh: Lead[] = [];
  for (const channel of icp.channels) {
    const platform = channelToPlatform(channel);
    if (!platform) continue;
    await publish(spawnId, { kind: 'scrape.platform', platform, status: 'started', ts: new Date().toISOString() });

    try {
      const candidates = await scrapeForPlatform(channel, icp);
      const newOnes = candidates.filter((c) => !seen.has(c.id));
      for (const c of newOnes) seen.add(c.id);
      fresh.push(...newOnes);
      // Append to the JSONL incrementally so an SSE subscriber would
      // see entries land even if the cycle errors later.
      if (newOnes.length > 0) {
        await fs.appendFile(ledger, newOnes.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf-8');
      }

      await publish(spawnId, {
        kind: 'scrape.platform',
        platform,
        status: 'done',
        count: newOnes.length,
        ts: new Date().toISOString(),
      });
    } catch (err) {
      await publish(spawnId, {
        kind: 'scrape.platform',
        platform,
        status: 'failed',
        ts: new Date().toISOString(),
      });
      await publish(spawnId, {
        kind: 'error',
        step: `scrape:${platform}`,
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      });
    }
  }

  return fresh;
}

function channelToPlatform(channel: ICP['channels'][number]): 'maps' | '2gis' | 'instagram' | 'linkedin' | null {
  if (channel === 'google-maps') return 'maps';
  if (channel === 'twogis') return '2gis';
  if (channel === 'instagram') return 'instagram';
  if (channel === 'linkedin') return 'linkedin';
  return null;
}

// ── per-platform scrapers (synthetic for now) ──────────────────────────

async function scrapeForPlatform(channel: ICP['channels'][number], icp: ICP): Promise<Lead[]> {
  // Real path: when LEAD_SUPABASE_URL + LEAD_SUPABASE_SERVICE_ROLE_KEY are
  // set, pull from the shared allone-scraper Supabase table. The scraper
  // VM already populates leads with Google Places + 2GIS results — BF
  // reads what's there, filtered by the ICP's keywords + regions.
  // Strictly SELECT-only (see supabase-leads.ts); the allonelabs lead
  // pipeline keeps its own status/value/scored_at fields untouched.
  if (leadsBackendConfigured()) {
    return await readFromSharedSupabase(channel, icp);
  }

  // Synthetic fallback — only used when env is unset (local dev without
  // credentials, or a fresh deploy that hasn't been wired yet).
  const out: Lead[] = [];
  const kw = icp.keywords.slice(0, 3);
  const region = icp.regions[0] ?? 'US';
  for (const k of kw) {
    for (let i = 1; i <= 2; i++) {
      out.push(buildSyntheticLead(channel, k, region, i));
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  return out;
}

async function readFromSharedSupabase(channel: ICP['channels'][number], icp: ICP): Promise<Lead[]> {
  // Only certain channels map to data the scraper actually populates.
  // google-maps and twogis both flow into the `leads` table — they're
  // the platforms the existing scraper covers. Instagram + LinkedIn
  // rows are pulled out by social URL presence below.
  const rows = await searchLeads({
    keywords: icp.keywords,
    regions: icp.regions,
    limit: 40,
  });

  // Per-channel filter — derive which rows belong on which channel based
  // on what social URLs the scraper captured. Keeps the per-platform
  // event timeline meaningful (instagram step shows rows that have an
  // IG handle, etc).
  const filtered = rows.filter((r) => matchesChannel(channel, r));
  return filtered.map((r) => leadFromRow(channel, r));
}

function matchesChannel(channel: ICP['channels'][number], row: LeadsRow): boolean {
  if (channel === 'instagram') return Boolean(row.instagram_url);
  if (channel === 'linkedin') return Boolean(row.linkedin_url);
  // google-maps / twogis: any row with city / address is a place result.
  return Boolean(row.address || row.city);
}

function leadFromRow(channel: ICP['channels'][number], r: LeadsRow): Lead {
  // url priority: per-channel social if present, then website, then a
  // generated maps query as last resort.
  const channelUrl =
    channel === 'instagram' ? r.instagram_url :
    channel === 'linkedin' ? r.linkedin_url :
    null;
  const url = channelUrl ?? r.website ?? buildPlaceQueryUrl(channel, r);
  // Stable id: hash(platform + canonical url) so re-runs over the same
  // row produce the same Lead.id and dedupe cleanly with leads.raw.jsonl.
  const id = createHash('sha256').update(`${channel}|${url}`).digest('hex').slice(0, 16);
  const snippet = [r.description, r.matched_service, r.industry]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' · ')
    .slice(0, 280) ||
    `${r.name}${r.city ? ` · ${r.city}` : ''}${r.country ? ` (${r.country})` : ''}`;

  return {
    id,
    platform: channel,
    name: r.company || r.name,
    url,
    snippet,
    location: [r.city, r.country].filter(Boolean).join(', ') || undefined,
    scrapedAt: new Date().toISOString(),
    raw: {
      source: 'shared-supabase',
      leadsRowId: r.id,
      email: r.email,
      phone: r.phone,
      website: r.website,
      instagram_url: r.instagram_url,
      linkedin_url: r.linkedin_url,
      facebook_url: r.facebook_url,
      relevance_score: r.relevance_score,
      tags: r.tags,
      matched_service: r.matched_service,
      industry: r.industry,
      source_url: r.source_url,
    },
  };
}

function buildPlaceQueryUrl(channel: ICP['channels'][number], r: LeadsRow): string {
  const host = channel === 'twogis' ? 'https://2gis.com/search/' : 'https://maps.google.com/?q=';
  const q = encodeURIComponent([r.name, r.city, r.country].filter(Boolean).join(' '));
  return `${host}${q}`;
}

function buildSyntheticLead(channel: ICP['channels'][number], keyword: string, region: string, n: number): Lead {
  const slug = `${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${n}`;
  const platform: Lead['platform'] = channel;
  const host = channel === 'google-maps' ? 'maps.google.com/?q=' :
               channel === 'twogis'      ? '2gis.com/search/' :
               channel === 'instagram'   ? 'instagram.com/' :
               'linkedin.com/in/';
  const url = `https://${host}${slug}`;
  const id = createHash('sha256').update(`${platform}|${url}`).digest('hex').slice(0, 16);
  return {
    id,
    platform,
    name: `Sample ${capitalize(keyword)} ${n}`,
    url,
    snippet: `Found via ${labelForChannel(channel)} search — synthetic candidate matching "${keyword}" in ${region}. Replace with real scrape when credentials are wired.`,
    location: region,
    scrapedAt: new Date().toISOString(),
    raw: { mode: 'synthetic', keyword, region, channel },
  };
}

function labelForChannel(c: ICP['channels'][number]): string {
  return c === 'google-maps' ? 'Google Maps'
       : c === 'twogis'      ? '2GIS'
       : c === 'instagram'   ? 'Instagram'
       : c === 'linkedin'    ? 'LinkedIn'
       : c;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
