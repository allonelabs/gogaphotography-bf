// ════════════════════════════════════════════════════════════════════════════
// perf-aggregator — reads the spawned site's events.jsonl and computes
// per-route Web Vitals percentiles (LCP / INP / CLS / TTFB).
//
// Web Vitals thresholds (https://web.dev/vitals):
//   LCP  good ≤ 2500ms · needs ≤ 4000ms · poor > 4000ms
//   INP  good ≤ 200ms  · needs ≤ 500ms  · poor > 500ms
//   CLS  good ≤ 0.10   · needs ≤ 0.25   · poor > 0.25 (×100 in storage)
//   TTFB good ≤ 800ms  · needs ≤ 1800ms · poor > 1800ms
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export type VitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB';
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalThresholds {
  good: number;
  needs: number;
}

export const VITAL_THRESHOLDS: Record<VitalName, VitalThresholds> = {
  LCP:  { good: 2500, needs: 4000 },
  INP:  { good: 200,  needs: 500  },
  CLS:  { good: 10,   needs: 25   }, // CLS ×100 (events store ints)
  TTFB: { good: 800,  needs: 1800 },
};

export interface PerfRoute {
  path: string;
  pageviews: number;
  vitals: Partial<Record<VitalName, { p50: number; p75: number; p95: number; samples: number; rating: VitalRating }>>;
}

export interface PerfSummary {
  totalPageviews: number;
  uniqueRoutes: number;
  totalVitalSamples: number;
  routes: PerfRoute[];
  /** Earliest event in the file. */
  since: string | null;
  /** Site-wide vitals roll-up. */
  siteVitals: Partial<Record<VitalName, { p50: number; p75: number; p95: number; samples: number; rating: VitalRating }>>;
}

interface RawEvent {
  event: string;
  at: string;
  path?: string;
  props?: Record<string, unknown>;
}

export async function readPerf(spawnId: string): Promise<PerfSummary> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return emptySummary();
  const file = path.join(resolveOutRoot(), spawnId, 'site', 'data', 'events.jsonl');

  let rows: RawEvent[];
  try {
    const raw = await readFile(file, 'utf8');
    rows = raw.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as RawEvent);
  } catch {
    return emptySummary();
  }

  if (rows.length === 0) return emptySummary();

  const since = rows[0]?.at ?? null;
  const pageviews = rows.filter((r) => r.event === 'pageview' || r.event === 'pageView');
  const vitals = rows.filter((r) => r.event === 'vitals');

  const byRoute = new Map<string, RawEvent[]>();
  for (const e of pageviews) {
    const p = e.path ?? '/';
    if (!byRoute.has(p)) byRoute.set(p, []);
    byRoute.get(p)!.push(e);
  }
  for (const e of vitals) {
    const p = e.path ?? '/';
    if (!byRoute.has(p)) byRoute.set(p, []);
    byRoute.get(p)!.push(e);
  }

  const routes: PerfRoute[] = [];
  for (const [routePath, events] of byRoute.entries()) {
    const pv = events.filter((e) => e.event === 'pageview' || e.event === 'pageView').length;
    const v = events.filter((e) => e.event === 'vitals');
    const perVital: PerfRoute['vitals'] = {};
    for (const name of ['LCP', 'INP', 'CLS', 'TTFB'] as VitalName[]) {
      const xs = v
        .filter((e) => (e.props as { name?: string })?.name === name)
        .map((e) => Number((e.props as { value?: number })?.value ?? NaN))
        .filter((n) => Number.isFinite(n));
      if (xs.length === 0) continue;
      const sorted = xs.slice().sort((a, b) => a - b);
      const p50 = pickPct(sorted, 0.50);
      const p75 = pickPct(sorted, 0.75);
      const p95 = pickPct(sorted, 0.95);
      perVital[name] = { p50, p75, p95, samples: xs.length, rating: rateVital(name, p75) };
    }
    routes.push({ path: routePath, pageviews: pv, vitals: perVital });
  }

  // Sort: most-traffic routes first, ties by alpha
  routes.sort((a, b) => b.pageviews - a.pageviews || a.path.localeCompare(b.path));

  // Site-wide vitals (across all routes)
  const siteVitals: PerfSummary['siteVitals'] = {};
  for (const name of ['LCP', 'INP', 'CLS', 'TTFB'] as VitalName[]) {
    const xs = vitals
      .filter((e) => (e.props as { name?: string })?.name === name)
      .map((e) => Number((e.props as { value?: number })?.value ?? NaN))
      .filter((n) => Number.isFinite(n));
    if (xs.length === 0) continue;
    const sorted = xs.slice().sort((a, b) => a - b);
    const p50 = pickPct(sorted, 0.50);
    const p75 = pickPct(sorted, 0.75);
    const p95 = pickPct(sorted, 0.95);
    siteVitals[name] = { p50, p75, p95, samples: xs.length, rating: rateVital(name, p75) };
  }

  return {
    totalPageviews: pageviews.length,
    uniqueRoutes: byRoute.size,
    totalVitalSamples: vitals.length,
    routes,
    since,
    siteVitals,
  };
}

function emptySummary(): PerfSummary {
  return { totalPageviews: 0, uniqueRoutes: 0, totalVitalSamples: 0, routes: [], since: null, siteVitals: {} };
}

function pickPct(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p));
  return Math.round(sortedAsc[idx]!);
}

export function rateVital(name: VitalName, value: number): VitalRating {
  const t = VITAL_THRESHOLDS[name];
  if (value <= t.good) return 'good';
  if (value <= t.needs) return 'needs-improvement';
  return 'poor';
}
