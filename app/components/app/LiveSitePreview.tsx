'use client';

// ════════════════════════════════════════════════════════════════════════════
// LiveSitePreview — boots `next dev` for out/<businessId>/site/ and renders
// the result as an iframe with a route picker. Used by /s/brand (compact),
// /s/website (full-width), and any other surface that wants to show what
// the spawned business actually looks like.
//
// Route can be parent-controlled via `route` + `onRouteChange` (so a
// surrounding editor can sync a source-code panel to the iframe's URL),
// or self-managed via `initialRoute`.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export interface SiteRoute {
  path: string;
  filePath: string;
  ownerTool?: string;
  meta?: { title?: string; description?: string };
}

export interface SiteManifestShape {
  apex?: string;
  routes?: SiteRoute[];
}

interface Props {
  businessId: string;
  /** When set, render at compact 320px height. Otherwise 760px. */
  compact?: boolean;
  /** Initial route shown when the iframe boots. Ignored when `route` is set. */
  initialRoute?: string;
  /** Externally-controlled route (for parent-driven syncing). */
  route?: string;
  onRouteChange?: (route: string) => void;
  /** Notified once the manifest is loaded (for parent-side rendering). */
  onManifestLoaded?: (manifest: SiteManifestShape) => void;
}

export function LiveSitePreview(props: Props) {
  const { businessId, compact, initialRoute, onRouteChange, onManifestLoaded } = props;
  const [status, setStatus] = useState<'unknown' | 'idle' | 'booting' | 'running' | 'error'>('unknown');
  const [port, setPort] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manifest, setManifest] = useState<SiteManifestShape | null>(null);
  const [internalRoute, setInternalRoute] = useState(initialRoute ?? '/');
  const route = props.route ?? internalRoute;
  const setRoute = (r: string) => {
    if (props.route === undefined) setInternalRoute(r);
    onRouteChange?.(r);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, manifestRes] = await Promise.all([
          fetch(`/api/spawn/${businessId}/site/boot`).then((r) => r.json()),
          fetch(`/api/spawn/${businessId}/site/page`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (statusRes.running && statusRes.ready) {
          setStatus('running');
          setPort(statusRes.port);
        } else {
          setStatus('idle');
        }
        if (manifestRes.manifest) {
          setManifest(manifestRes.manifest);
          onManifestLoaded?.(manifestRes.manifest);
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, onManifestLoaded]);

  async function boot() {
    setStatus('booting');
    setErrorMsg(null);
    try {
      const r = await fetch(`/api/spawn/${businessId}/site/boot`, { method: 'POST' });
      const body = (await r.json()) as { ok: boolean; port?: number; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'boot failed');
      setStatus('running');
      setPort(body.port!);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus('error');
    }
  }

  async function stop() {
    await fetch(`/api/spawn/${businessId}/site/boot`, { method: 'DELETE' });
    setStatus('idle');
    setPort(null);
  }

  const iframeHeight = compact ? 320 : 760;
  const routes = manifest?.routes ?? [];

  if (status === 'unknown' || status === 'idle') {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--allonce-line)] bg-white p-6 text-center">
        <p className="text-[12.5px] text-[var(--ink-700)]">
          The spawned site is on disk at <code>out/{businessId}/site/</code> but no dev server is
          running.
        </p>
        <button
          type="button"
          onClick={boot}
          disabled={status !== 'idle'}
          className="mt-3 rounded-[var(--radius-md)] bg-[var(--ao-accent)] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_-4px_rgba(0,71,255,0.45)] transition hover:translate-y-[-1px] disabled:opacity-50"
        >
          Boot live preview
        </button>
      </div>
    );
  }

  if (status === 'booting') {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--allonce-line)] bg-white p-6 text-center">
        <p className="text-[12.5px] text-[var(--ink-700)]">
          Booting <code>next dev</code> in <code>out/{businessId}/site</code>… (10–30s on first start)
        </p>
        <div className="mt-3 inline-block h-1.5 w-32 overflow-hidden rounded-full bg-[var(--bg-surface-alt)]">
          <div className="h-full w-1/3 animate-pulse bg-[var(--ink-900)]" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--allonce-warn,#d97706)] bg-[var(--allonce-warn,#d97706)]/10 p-4">
        <p className="text-[12.5px] font-medium text-[var(--ink-900)]">Boot failed</p>
        <p className="mt-1 font-mono text-[11.5px] text-[var(--ink-700)]">{errorMsg ?? 'unknown error'}</p>
        <p className="mt-2 text-[11.5px] text-[var(--ink-500)]">
          Most common: deps not installed. Run{' '}
          <code>cd out/{businessId}/site &amp;&amp; pnpm install</code> then retry.
        </p>
        <button
          type="button"
          onClick={boot}
          className="mt-3 rounded-[var(--radius-md)] bg-[var(--ink-900)] px-3 py-1.5 text-[12px] font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 items-center rounded-full bg-[var(--allonce-bg-soft,#f7f4ee)] px-2 text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-900)]">
          ● running · :{port}
        </span>
        {routes.length > 0 ? (
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] px-2 py-1 text-[12px]"
          >
            {routes.map((r) => (
              <option key={r.path} value={r.path}>
                {r.path}
                {r.meta?.title ? ` — ${r.meta.title}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] px-2 py-1 text-[12px]"
            placeholder="/"
          />
        )}
        <a
          href={`http://localhost:${port}${route}`}
          target="_blank"
          rel="noopener"
          className="rounded-[var(--radius-sm)] bg-[var(--bg-surface-alt)] px-2 py-1 text-[11px] text-[var(--ink-700)] hover:text-[var(--ink-900)]"
        >
          Open ↗
        </a>
        <button
          type="button"
          onClick={stop}
          className="ml-auto rounded-[var(--radius-sm)] bg-[var(--bg-surface-alt)] px-2 py-1 text-[11px] text-[var(--ink-700)] hover:text-[var(--ink-900)]"
        >
          Stop
        </button>
      </div>
      <iframe
        src={`http://localhost:${port}${route}`}
        title={`Spawned site · ${businessId}`}
        className="w-full rounded-[var(--radius-md)] border border-[var(--bg-surface-alt)]"
        style={{ height: iframeHeight, background: 'white' }}
      />
    </div>
  );
}
