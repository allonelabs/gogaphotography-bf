'use client';

// Per-execution Replay button. POSTs to /api/automation/execution/[exid]/replay,
// refreshes the page so the new execution shows up + the original flips to
// 'replayed' status.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  executionId: string;
  /** When false, the button hides itself (keeps the row layout consistent). */
  enabled?: boolean;
}

export function ReplayButton({ spawnId, executionId, enabled = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  async function replay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/automation/execution/${encodeURIComponent(executionId)}/replay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; newExecutionId?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'replay failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'replay failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => void replay()}
        disabled={busy}
        className="rounded-md border border-[var(--allonce-line)] bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
      >
        {busy ? 'Replaying…' : 'Replay'}
      </button>
    </span>
  );
}
