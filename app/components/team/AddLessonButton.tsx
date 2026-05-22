'use client';

// Tiny client component for the course-detail page's "Add lesson" CTA.
// POSTs to /api/team/courses/[cid]/lessons, then redirects straight into
// the new lesson's editor.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  courseId: string;
}

export function AddLessonButton({ spawnId, courseId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/courses/${encodeURIComponent(courseId)}/lessons`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, title: 'Untitled lesson' }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; lessonId?: string; error?: string };
      if (!res.ok || !data.ok || !data.lessonId) throw new Error(data.error ?? `request failed (${res.status})`);
      router.push(`/app/business/${spawnId}/s/team/courses/${courseId}/lessons/${data.lessonId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'add failed');
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
        onClick={() => void add()}
        disabled={busy}
        className="text-[11px] font-mono text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)] disabled:opacity-50"
      >
        {busy ? 'Adding…' : 'Add lesson'}
      </button>
    </span>
  );
}
