'use client';

// Pause / Resume / Test fire toolbar on the workflow detail page.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkflowStatus } from '@/app/lib/automation-loader';

interface Props {
  spawnId: string;
  workflowId: string;
  status: WorkflowStatus;
}

export function WorkflowActions({ spawnId, workflowId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function call(action: 'pause' | 'resume' | 'dispatch', payload?: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/automation/workflow/${encodeURIComponent(workflowId)}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, ...(payload && { payload }) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; executionId?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'request failed');
      if (action === 'dispatch' && data.executionId) {
        setInfo(`Test fire started — execution ${data.executionId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {info && (
        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[10px] text-emerald-800">
          {info}
        </span>
      )}
      {error && (
        <span className="rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[10px] text-rose-700">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => call('dispatch')}
        disabled={busy !== null || status !== 'enabled'}
        title={status !== 'enabled' ? 'Enable the workflow before test-firing' : 'Run synchronously with a synthetic payload'}
        className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
      >
        {busy === 'dispatch' ? 'Firing…' : 'Test fire'}
      </button>
      <button
        type="button"
        onClick={() => call('dispatch', { forceFail: true })}
        disabled={busy !== null || status !== 'enabled'}
        title="Force-fail to verify the failure path"
        className="inline-flex h-9 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {busy === 'dispatch' ? 'Failing…' : 'Force-fail'}
      </button>
      {status === 'paused' ? (
        <button
          type="button"
          onClick={() => call('resume')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {busy === 'resume' ? 'Resuming…' : 'Resume'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => call('pause')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
        >
          {busy === 'pause' ? 'Pausing…' : 'Pause'}
        </button>
      )}
    </div>
  );
}
