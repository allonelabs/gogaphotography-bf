'use client';

// Per-row actions on the member-detail learning history.
// PATCHes the enrollment cell directly via /api/team/courses/[cid]/enrollments/[mid].

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  courseId: string;
  memberId: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'overdue';
}

export function EnrollmentRowActions({ spawnId, courseId, memberId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(patch: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/enrollments/${encodeURIComponent(memberId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId, patch }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'request failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  async function unenroll() {
    if (!window.confirm('Unenroll this learner from the course? Progress is removed.')) return;
    setBusy('unenroll');
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/enrollments/${encodeURIComponent(memberId)}`,
        { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ spawnId }) },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'request failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
          {error}
        </span>
      )}
      {status !== 'complete' && (
        <button
          type="button"
          onClick={() => patch({ status: 'complete' }, 'complete')}
          disabled={busy !== null}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          {busy === 'complete' ? '…' : 'Mark complete'}
        </button>
      )}
      {status !== 'not-started' && (
        <button
          type="button"
          onClick={() => patch({ status: 'not-started' }, 'reset')}
          disabled={busy !== null}
          className="rounded-md border border-[var(--allonce-line)] bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)] transition hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
        >
          {busy === 'reset' ? '…' : 'Reset'}
        </button>
      )}
      <button
        type="button"
        onClick={unenroll}
        disabled={busy !== null}
        className="rounded-md border border-rose-200 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {busy === 'unenroll' ? '…' : 'Unenroll'}
      </button>
    </div>
  );
}
