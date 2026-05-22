'use client';

// AssignCourseModal — opens via the Assign-course button, lets the operator
// pick course + audience + due date. POSTs to /api/team/assignments.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Audience = 'all-employees' | 'admins' | 'engineers' | 'sales' | 'support' | 'group';

interface Props {
  spawnId: string;
  courses: Array<{ id: string; title: string; status: string }>;
  groups: Array<{ id: string; name: string; memberCount: number }>;
}

const DEFAULT_DUE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
})();

export function AssignCourseModal({ spawnId, courses, groups }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [audience, setAudience] = useState<Audience>('all-employees');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [dueAt, setDueAt] = useState(DEFAULT_DUE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ enrolled: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) {
      setError('Pick a course.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spawnId,
          courseId,
          audience,
          ...(audience === 'group' && groupId ? { groupId } : {}),
          dueAt,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; enrolled?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      setResult({ enrolled: data.enrolled ?? 0 });
      router.refresh();
      // Auto-close after a moment.
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setResult(null); setError(null); }}
        className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white"
      >
        Assign course
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-md border border-[var(--allonce-line)] bg-white p-5 shadow-lg"
          >
            <header className="flex items-baseline justify-between">
              <h3 className="text-[14px] font-semibold tracking-tight text-[var(--allonce-ink)]">
                Assign a course
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-mono text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)]"
              >
                Close
              </button>
            </header>

            <p className="mt-2 text-[12.5px] text-[var(--allonce-ink-muted)]">
              Pick a course, choose who, set the due date. Reminders fire 3 days before via the
              email-forge bridge.
            </p>

            <label className="mt-4 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Course
              </span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
              >
                {courses.length === 0 && <option value="">No courses yet</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}{c.status === 'draft' ? ' (draft)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Audience
              </span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
              >
                <option value="all-employees">All employees</option>
                <option value="admins">Admins</option>
                <option value="engineers">Engineers</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="group">A specific group</option>
              </select>
            </label>

            {audience === 'group' && (
              <label className="mt-3 block">
                <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                  Group
                </span>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
                >
                  {groups.length === 0 && <option value="">No groups yet</option>}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.memberCount} members
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Due
              </span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
              />
            </label>

            {error && (
              <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
                {error}
              </p>
            )}

            {result && (
              <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                Assigned. Enrolled {result.enrolled} new learner{result.enrolled === 1 ? '' : 's'}.
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || courses.length === 0}
                className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Assigning…' : 'Assign course'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
