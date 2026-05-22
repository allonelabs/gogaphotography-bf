'use client';

// Course-detail action toolbar. Wires the Publish / Unpublish / Archive /
// Duplicate / Delete buttons to /api/team/courses/[cid]/action and refreshes
// the page on success so the UI reflects the new status + version.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action = 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'duplicate';

interface Props {
  spawnId: string;
  courseId: string;
  status: 'draft' | 'published' | 'archived';
}

export function CourseActions({ spawnId, courseId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fire(action: Action, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    setBusy(action);
    try {
      const res = await fetch(`/api/team/courses/${encodeURIComponent(courseId)}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; courseId?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      if (action === 'delete') {
        router.push(`/app/business/${spawnId}/s/team/courses`);
        return;
      }
      if (action === 'duplicate' && data.courseId) {
        router.push(`/app/business/${spawnId}/s/team/courses/${data.courseId}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[10px] text-rose-700">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => fire('duplicate')}
        disabled={busy !== null}
        className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
      >
        {busy === 'duplicate' ? 'Duplicating…' : 'Duplicate'}
      </button>
      {status !== 'archived' && (
        <button
          type="button"
          onClick={() => fire('archive', 'Archive this course? Enrollments stay; the course hides from listings.')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
        >
          {busy === 'archive' ? 'Archiving…' : 'Archive'}
        </button>
      )}
      {status === 'archived' && (
        <button
          type="button"
          onClick={() => fire('restore')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
        >
          {busy === 'restore' ? 'Restoring…' : 'Restore'}
        </button>
      )}
      <button
        type="button"
        onClick={() => fire('delete', 'Delete this course permanently? This cannot be undone.')}
        disabled={busy !== null}
        className="inline-flex h-9 items-center rounded-md border border-rose-200 bg-white px-3 text-[12px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        {busy === 'delete' ? 'Deleting…' : 'Delete'}
      </button>
      {status === 'published' ? (
        <button
          type="button"
          onClick={() => fire('unpublish')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
        >
          {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => fire('publish')}
        disabled={busy !== null}
        className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
      >
        {busy === 'publish'
          ? 'Publishing…'
          : status === 'published'
          ? 'Re-publish'
          : 'Publish'}
      </button>
    </div>
  );
}
