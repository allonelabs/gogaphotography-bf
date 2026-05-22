'use client';

// CreateGroupModal — opens via the Groups page CTA. Form fields:
// name + description + members (multi-select) + assigned courses
// (multi-select). POSTs to /api/team/groups.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  members: Array<{ id: string; name: string; email: string }>;
  courses: Array<{ id: string; title: string; status: string }>;
}

export function CreateGroupModal({ spawnId, members, courses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(set: string[], v: string): string[] {
    return set.includes(v) ? set.filter((x) => x !== v) : [...set, v];
  }

  function reset() {
    setName('');
    setDescription('');
    setMemberIds([]);
    setAssignedCourseIds([]);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/team/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, name: name.trim(), description: description.trim(), memberIds, assignedCourseIds }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; groupId?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      reset();
      setOpen(false);
      router.refresh();
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
        onClick={() => { setOpen(true); reset(); }}
        className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white"
      >
        New group
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-xl rounded-md border border-[var(--allonce-line)] bg-white p-5 shadow-lg"
          >
            <header className="flex items-baseline justify-between">
              <h3 className="text-[14px] font-semibold tracking-tight text-[var(--allonce-ink)]">
                Create a group
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
              Cohorts and squads. Assign one or more courses; new members added to the group later
              inherit those assignments.
            </p>

            <label className="mt-4 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Engineering · Q2 onboarding"
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Description
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hires from April–June 2026"
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
              />
            </label>

            <fieldset className="mt-4">
              <legend className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Members
              </legend>
              <div className="mt-1 max-h-32 overflow-y-auto rounded border border-[var(--allonce-line)] p-2">
                {members.length === 0 ? (
                  <p className="font-mono text-[11px] text-[var(--allonce-ink-faint)]">No members yet — invite first.</p>
                ) : members.map((m) => {
                  const checked = memberIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 py-1 text-[12px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setMemberIds((prev) => toggle(prev, m.id))}
                        className="accent-[var(--lms-primary,var(--allonce-ink))]"
                      />
                      <span className="truncate">{m.name}</span>
                      <span className="ml-auto truncate font-mono text-[10px] text-[var(--allonce-ink-faint)]">{m.email}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                Assigned courses
              </legend>
              <div className="mt-1 max-h-28 overflow-y-auto rounded border border-[var(--allonce-line)] p-2">
                {courses.length === 0 ? (
                  <p className="font-mono text-[11px] text-[var(--allonce-ink-faint)]">No courses yet.</p>
                ) : courses.map((c) => {
                  const checked = assignedCourseIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-[12px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setAssignedCourseIds((prev) => toggle(prev, c.id))}
                        className="accent-[var(--lms-primary,var(--allonce-ink))]"
                      />
                      <span className="truncate">{c.title}</span>
                      {c.status === 'draft' && (
                        <span className="ml-auto rounded-full bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-700">draft</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
                {error}
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
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
