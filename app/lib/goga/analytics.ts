// app/lib/goga/analytics.ts
//
// Server-side reader for Vercel Web Analytics. The token this uses can read
// other account resources too, so it never leaves the server: the admin page
// calls a route handler, the route handler calls this.
//
// Vercel Web Analytics identifies a visitor by a hash of the request that
// rotates every day rather than by a cookie, so these figures are aggregate by
// construction - countries, pages, referrers, devices. There is no per-person
// view here to expose, which is the reason this was chosen over Google
// Analytics for a site whose visitors are largely in the EU.
//
// Hobby plan: 50k events/month, and a reporting window of ONE month. Requests
// for older ranges come back empty rather than erroring, so the UI caps its
// date picker instead of offering ranges that cannot return data.

import "server-only";

const API = "https://api.vercel.com/v1/query/web-analytics";
/** Hobby keeps one month. Asking for more silently returns nothing. */
export const MAX_RANGE_DAYS = 30;
const TIMEOUT_MS = 12_000;
/** Analytics is a dashboard, not a ledger - a few minutes stale is fine, and it
 *  keeps an open admin tab from spending the event quota on refetches. */
const CACHE_TTL_MS = 5 * 60_000;

export type Dimension =
  | "country"
  | "deviceType"
  | "requestPath"
  | "referrerHostname"
  | "browserName"
  | "osName";

export interface AnalyticsConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

/** Returned instead of throwing, so the page can say what is wrong. */
export type AnalyticsError =
  | { kind: "unconfigured"; missing: string[] }
  | { kind: "unauthorized" }
  | { kind: "not_enabled" }
  | { kind: "rate_limited" }
  | { kind: "unreachable"; detail: string };

export type AnalyticsResult<T> = { ok: true; data: T } | { ok: false; error: AnalyticsError };

export function readConfig(): AnalyticsResult<AnalyticsConfig> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const missing: string[] = [];
  if (!token) missing.push("VERCEL_TOKEN");
  if (!projectId) missing.push("VERCEL_PROJECT_ID");
  if (missing.length) return { ok: false, error: { kind: "unconfigured", missing } };
  return {
    ok: true,
    data: { token: token!, projectId: projectId!, teamId: process.env.VERCEL_TEAM_ID },
  };
}

const cache = new Map<string, { at: number; value: unknown }>();

async function call<T>(path: string, params: Record<string, string>): Promise<AnalyticsResult<T>> {
  const cfg = readConfig();
  if (!cfg.ok) return cfg;

  const qs = new URLSearchParams({ projectId: cfg.data.projectId, ...params });
  if (cfg.data.teamId) qs.set("teamId", cfg.data.teamId);
  const url = `${API}/${path}?${qs}`;

  const key = url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ok: true, data: hit.value as T };
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.data.token}` },
      signal: ctl.signal,
      cache: "no-store",
    });
    if (r.status === 401 || r.status === 403) return { ok: false, error: { kind: "unauthorized" } };
    if (r.status === 404) return { ok: false, error: { kind: "not_enabled" } };
    if (r.status === 429) return { ok: false, error: { kind: "rate_limited" } };
    if (!r.ok) {
      // Body may carry a useful message, but it may also echo the request -
      // truncate so a token in a URL can never reach a log or the UI.
      const body = (await r.text()).slice(0, 200).replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
      return { ok: false, error: { kind: "unreachable", detail: `HTTP ${r.status} ${body}` } };
    }
    const data = (await r.json()) as T;
    cache.set(key, { at: Date.now(), value: data });
    return { ok: true, data };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: "unreachable", detail } };
  } finally {
    clearTimeout(timer);
  }
}

export interface Totals {
  pageviews: number;
  visitors: number;
}

export async function getTotals(days: number): Promise<AnalyticsResult<Totals>> {
  const { since, until } = range(days);
  const r = await call<{ data?: Partial<Totals> }>("visits/count", { since, until });
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      pageviews: r.data?.data?.pageviews ?? 0,
      visitors: r.data?.data?.visitors ?? 0,
    },
  };
}

export interface Breakdown {
  key: string;
  pageviews: number;
  visitors: number;
}

/** Top values for one dimension, biggest first. */
export async function getBreakdown(
  by: Dimension,
  days: number,
  limit = 10,
): Promise<AnalyticsResult<Breakdown[]>> {
  const { since, until } = range(days);
  const r = await call<{ data?: Array<Record<string, unknown>> }>("visits/aggregate", {
    by,
    since,
    until,
    limit: String(limit),
  });
  if (!r.ok) return r;
  const rows = (r.data?.data ?? []).map((row) => ({
    key: String(row[by] ?? row.key ?? "unknown"),
    pageviews: Number(row.pageviews ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
  return { ok: true, data: rows.sort((a, b) => b.pageviews - a.pageviews) };
}

export interface TimePoint extends Breakdown {}

/** Daily series for a chart. */
export async function getDaily(days: number): Promise<AnalyticsResult<TimePoint[]>> {
  const { since, until } = range(days);
  const r = await call<{ data?: Array<Record<string, unknown>> }>("visits/aggregate", {
    by: "day",
    since,
    until,
    limit: String(MAX_RANGE_DAYS),
  });
  if (!r.ok) return r;
  const rows = (r.data?.data ?? []).map((row) => ({
    key: String(row.day ?? row.key ?? ""),
    pageviews: Number(row.pageviews ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
  return { ok: true, data: rows.sort((a, b) => a.key.localeCompare(b.key)) };
}

function range(days: number): { since: string; until: string } {
  const capped = Math.min(Math.max(1, Math.floor(days)), MAX_RANGE_DAYS);
  const until = new Date();
  const since = new Date(until.getTime() - capped * 86_400_000);
  return { since: String(since.getTime()), until: String(until.getTime()) };
}

export function errorMessage(e: AnalyticsError): string {
  switch (e.kind) {
    case "unconfigured":
      return `Not connected yet — missing ${e.missing.join(" and ")}.`;
    case "unauthorized":
      return "Vercel rejected the token. It may have been revoked or scoped to the wrong team.";
    case "not_enabled":
      return "Web Analytics is not enabled on this Vercel project yet.";
    case "rate_limited":
      return "Vercel is rate-limiting requests. Try again shortly.";
    case "unreachable":
      return `Could not reach Vercel: ${e.detail}`;
  }
}
