'use client';

// ════════════════════════════════════════════════════════════════════════════
// LedgerPreview — boots the host's ~/Projects/ledger-app via /api/ledger/boot
// and iframes it into allonce-ui. Per-business org context is passed via
// the `?org=<businessId>` query parameter; the ledger-app's auth flow
// picks the matching organization (or creates one on first visit, per
// its existing onboarding flow).
//
// Mirrors the LiveSitePreview state machine: idle → booting → running →
// error, with retry + Stop affordances.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

interface Props {
  businessId: string;
  /** ISO-2 locale picked from spawn jurisdiction; ledger-app supports
   *  next-intl per-locale routes. Defaults to 'en'. */
  locale?: string;
  /** Path inside the ledger-app to deep-link into. Defaults to dashboard. */
  initialPath?: string;
  /** Compact 320px iframe; otherwise 760px. */
  compact?: boolean;
}

const LEDGER_PATHS: Array<{ path: string; label: string }> = [
  { path: 'dashboard', label: 'Dashboard' },
  { path: 'invoices', label: 'Invoices' },
  { path: 'bills', label: 'Bills' },
  { path: 'expenses', label: 'Expenses' },
  { path: 'journal-entries', label: 'Journal' },
  { path: 'accounts', label: 'Chart of accounts' },
  { path: 'contacts', label: 'Contacts' },
  { path: 'reconciliation', label: 'Reconciliation' },
  { path: 'recurring', label: 'Recurring' },
  { path: 'reports', label: 'Reports' },
  { path: 'settings', label: 'Settings' },
];

export function LedgerPreview({ businessId, locale = 'en', initialPath = 'dashboard', compact }: Props) {
  const [status, setStatus] = useState<'unknown' | 'idle' | 'booting' | 'running' | 'error' | 'unavailable'>('unknown');
  const [port, setPort] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pathSeg, setPathSeg] = useState(initialPath);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ledger/boot');
        const body = await res.json();
        if (cancelled) return;
        if (!body.exists) {
          setStatus('unavailable');
          setErrorMsg("Ledger app not found at ~/Projects/ledger-app — clone it first.");
          return;
        }
        if (body.running && body.ready) {
          setStatus('running');
          setPort(body.port);
        } else {
          setStatus('idle');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function boot() {
    setStatus('booting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ledger/boot', { method: 'POST' });
      const body = (await res.json()) as { ok: boolean; port?: number; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'boot failed');
      setStatus('running');
      setPort(body.port!);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus('error');
    }
  }

  async function stop() {
    await fetch('/api/ledger/boot', { method: 'DELETE' });
    setStatus('idle');
    setPort(null);
  }

  const iframeHeight = compact ? 320 : 800;
  const iframeUrl = port
    ? `http://localhost:${port}/${locale}/${pathSeg}?org=${encodeURIComponent(businessId)}`
    : null;

  if (status === 'unavailable') {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] p-5 text-[12.5px] text-[var(--ink-700)]">
        <p className="font-medium text-[var(--ink-900)]">Ledger app not found</p>
        <p className="mt-1">{errorMsg}</p>
      </div>
    );
  }

  if (status === 'unknown' || status === 'idle') {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--bg-surface-alt)] p-6 text-center">
        <p className="text-[12.5px] text-[var(--ink-700)]">
          The ledger app at <code>~/Projects/ledger-app</code> is not running. Multi-tenant on{' '}
          <code>organizations</code>; this business will appear as one org.
        </p>
        <button
          type="button"
          onClick={boot}
          disabled={status !== 'idle'}
          className="mt-3 rounded-[var(--radius-md)] bg-[var(--ink-900)] px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-50"
        >
          Boot ledger
        </button>
      </div>
    );
  }

  if (status === 'booting') {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--bg-surface-alt)] p-6 text-center">
        <p className="text-[12.5px] text-[var(--ink-700)]">
          Booting <code>~/Projects/ledger-app</code>… (Next 16 first compile, 30-60s)
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-5 items-center rounded-full bg-[var(--allonce-bg-soft,#f7f4ee)] px-2 text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-900)]">
          ● ledger · :{port}
        </span>
        <select
          value={pathSeg}
          onChange={(e) => setPathSeg(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] px-2 py-1 text-[12px]"
        >
          {LEDGER_PATHS.map((p) => (
            <option key={p.path} value={p.path}>
              {p.label}
            </option>
          ))}
        </select>
        <a
          href={iframeUrl ?? '#'}
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
      {iframeUrl && (
        <iframe
          src={iframeUrl}
          title={`Ledger · ${businessId}`}
          className="w-full rounded-[var(--radius-md)] border border-[var(--bg-surface-alt)]"
          style={{ height: iframeHeight, background: 'white' }}
        />
      )}
    </div>
  );
}
