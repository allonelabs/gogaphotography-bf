// Generic proxy: forward an inbound API request to the Hetzner runner.
// Preserves method, query, and body. Used by any shell-zone route whose
// original implementation imported src/lib/* — the heavy logic lives on
// Hetzner; shell-zone just transports.
//
// Fallback: if the runner returns 404 (endpoint not yet implemented) or
// the runner is unreachable, return an empty-success shape (200 with
// {ok:true, items: [], data: null}) so the UI shows "no data yet" rather
// than error toasts. Real implementations migrate to Hetzner over time
// in V3-F; this fallback keeps the UI functional during migration.

const RUNNER_URL = process.env.BF_RUNNER_URL ?? 'http://178.104.47.126:3100';

function emptyOkResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      items: [],
      spawns: [],
      runs: [],
      cells: [],
      data: null,
      _stub: true,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

export async function proxyToRunner(
  req: Request,
  pathOverride?: string,
): Promise<Response> {
  const u = new URL(req.url);
  const path = pathOverride ?? u.pathname.replace(/^\/api\//, '/');
  const targetUrl = `${RUNNER_URL}${path}${u.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: { 'X-Forwarded-Host': u.host },
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
    (init.headers as Record<string, string>)['Content-Type'] = req.headers.get('content-type') ?? 'application/json';
  }

  try {
    const upstream = await fetch(targetUrl, init);
    if (upstream.status === 404) {
      // Runner doesn't have this endpoint yet — return empty-ok so the UI
      // doesn't show an error. This is V3-F territory.
      return emptyOkResponse();
    }
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (err) {
    void err;
    // Runner unreachable — return empty-ok for safe UI degradation.
    return emptyOkResponse();
  }
}
