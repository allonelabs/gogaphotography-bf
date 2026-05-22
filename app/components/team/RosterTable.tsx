'use client';

// RosterTable — selectable members table with a bulk action bar.
//   - Multi-select rows (ranges via shift, all-visible via header checkbox)
//   - Bulk-enroll into a course (POSTs the same enrollment endpoint per id)
//   - Per-row Link into member detail
// Real auth + bulk role/group changes wait on Phase 40d; bulk-enroll is the
// most useful action available without it.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MockMember } from '@/app/data/mock-members';

interface CourseLite { id: string; title: string; status: string }

interface MemberRow extends MockMember {
  enrolled: number;
  avg: number;
  certs: number;
}

interface Props {
  spawnId: string;
  members: MemberRow[];
  courses: CourseLite[];
}

export function RosterTable({ spawnId, members, courses }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCourseId, setBulkCourseId] = useState(courses[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ enrolled: number; alreadyIn: number } | null>(null);

  const allIds = useMemo(() => members.map((m) => m.id), [members]);
  const allSelected = selected.length === allIds.length && allIds.length > 0;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : allIds);
  }

  async function bulkEnroll() {
    if (!bulkCourseId || selected.length === 0) return;
    setBusy(true);
    setError(null);
    setReport(null);
    let enrolled = 0;
    let alreadyIn = 0;
    try {
      for (const memberId of selected) {
        const res = await fetch(
          `/api/team/courses/${encodeURIComponent(bulkCourseId)}/enrollments/${encodeURIComponent(memberId)}`,
          { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ spawnId }) },
        );
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (data.ok) enrolled += 1;
        else if (data.error === 'already enrolled') alreadyIn += 1;
        else throw new Error(data.error ?? `request failed (${res.status})`);
      }
      setReport({ enrolled, alreadyIn });
      setSelected([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'bulk-enroll failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Bulk-action bar — hidden when nothing is selected */}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--allonce-ink)] bg-[var(--allonce-bg-soft)] px-4 py-2.5">
          <p className="text-[12px] font-medium text-[var(--allonce-ink)]">
            {selected.length} selected
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
              Enroll into
            </span>
            <select
              value={bulkCourseId}
              onChange={(e) => setBulkCourseId(e.target.value)}
              disabled={busy}
              className="rounded border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
            >
              {courses.length === 0 && <option value="">No courses yet</option>}
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.status === 'draft' ? ' (draft)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={bulkEnroll}
              disabled={busy || !bulkCourseId}
              className="inline-flex h-8 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-3 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Enrolling…' : 'Enroll'}
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={busy}
              className="text-[11px] font-mono text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)] disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
          {error}
        </p>
      )}

      {report && (
        <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          Enrolled {report.enrolled} learner{report.enrolled === 1 ? '' : 's'}
          {report.alreadyIn > 0 && ` · ${report.alreadyIn} already enrolled`}.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-[var(--allonce-line)] bg-white">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-[var(--allonce-line)]">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-mono [&>th]:text-[10px] [&>th]:font-normal [&>th]:uppercase [&>th]:tracking-[0.08em] [&>th]:text-[var(--allonce-ink-faint)]">
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-[var(--lms-primary,var(--allonce-ink))]"
                  aria-label="Select all"
                />
              </th>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-right">Enrolled</th>
              <th className="text-right">Avg progress</th>
              <th className="text-right">Certs</th>
              <th className="text-right">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--allonce-line)]">
            {members.map((m) => {
              const isSel = selected.includes(m.id);
              return (
                <tr
                  key={m.id}
                  className={`transition [&>td]:px-4 [&>td]:py-2.5 ${
                    isSel ? 'bg-[var(--allonce-bg-soft)]' : 'hover:bg-[var(--allonce-bg-soft)]/50'
                  }`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(m.id)}
                      className="accent-[var(--lms-primary,var(--allonce-ink))]"
                      aria-label={`Select ${m.name}`}
                    />
                  </td>
                  <td>
                    <Link
                      href={`/app/business/${spawnId}/s/team/members/${m.id}`}
                      className="flex items-center gap-2.5 transition hover:underline"
                    >
                      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[var(--lms-primary,var(--allonce-ink))] text-[10px] font-semibold text-white">
                        {m.avatar}
                      </span>
                      <div>
                        <p className="font-medium text-[var(--allonce-ink)]">{m.name}</p>
                        <p className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">{m.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td>{m.role}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        m.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : m.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="tabular-nums text-right">{m.enrolled}</td>
                  <td className="text-right">
                    <div className="ml-auto inline-flex items-center gap-2">
                      <span className="tabular-nums">{m.avg}%</span>
                      <span className="block h-1 w-16 overflow-hidden rounded-full bg-[var(--allonce-bg-soft)]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(2, m.avg)}%`,
                            background: 'var(--lms-primary, var(--allonce-ink))',
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="tabular-nums text-right">
                    {m.certs > 0 ? m.certs : <span className="text-[var(--allonce-ink-faint)]">—</span>}
                  </td>
                  <td className="text-right font-mono text-[11px] text-[var(--allonce-ink-muted)]">
                    {m.lastActive}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
