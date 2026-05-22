'use client';

// Inline lesson-row actions: Edit (link) + Delete. Used by the course
// editor's lesson list. Refuses delete when only one lesson remains.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  spawnId: string;
  courseId: string;
  lessonId: string;
  /** Total lesson count — used to disable the delete button when ≤ 1. */
  total: number;
}

export function LessonRowActions({ spawnId, courseId, lessonId, total }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteLesson() {
    if (total <= 1) {
      setError('A course must have at least one lesson.');
      return;
    }
    if (!window.confirm('Delete this lesson? All slides + quiz items inside it are removed.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/delete`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed');
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
      <Link
        href={`/app/business/${spawnId}/s/team/courses/${courseId}/lessons/${lessonId}`}
        className="inline-flex h-8 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[11px] font-medium hover:bg-[var(--allonce-bg-soft)]"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => void deleteLesson()}
        disabled={busy || total <= 1}
        title={total <= 1 ? 'A course must have at least one lesson' : 'Delete lesson'}
        className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-white px-3 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {busy ? '…' : 'Delete'}
      </button>
    </span>
  );
}
