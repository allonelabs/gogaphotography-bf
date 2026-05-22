'use client';

// GroupCard — read mode (avatar stack + course chips) collapses into edit
// mode (rename + member checkboxes + course checkboxes + delete) on click.
// PATCH/DELETE go to /api/team/groups/[gid]. Fixture-only groups (those
// without on-disk cells) get a 404 on edit; the card surfaces the API's
// hint message inline so the operator knows to recreate via "New group".

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MemberLite { id: string; name: string; avatar: string }
interface CourseLite { id: string; title: string; status: string }

interface Props {
  spawnId: string;
  group: {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
    assignedCourseIds: string[];
  };
  allMembers: MemberLite[];
  allCourses: CourseLite[];
}

export function GroupCard({ spawnId, group, allMembers, allCourses }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [memberIds, setMemberIds] = useState<string[]>(group.memberIds);
  const [courseIds, setCourseIds] = useState<string[]>(group.assignedCourseIds);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = allMembers.filter((m) => group.memberIds.includes(m.id));
  const courses = allCourses.filter((c) => group.assignedCourseIds.includes(c.id));

  function toggle(set: string[], v: string) {
    return set.includes(v) ? set.filter((x) => x !== v) : [...set, v];
  }

  async function save() {
    setBusy('save');
    setError(null);
    try {
      const res = await fetch(`/api/team/groups/${encodeURIComponent(group.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spawnId,
          patch: { name: name.trim() || group.name, description, memberIds, assignedCourseIds: courseIds },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setBusy(null);
    }
  }

  async function deleteGroup() {
    if (!window.confirm(`Delete group "${group.name}"? Member assignments stay; only the group is removed.`)) return;
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(`/api/team/groups/${encodeURIComponent(group.id)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed');
    } finally {
      setBusy(null);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="text-[15px] font-semibold tracking-tight text-[var(--allonce-ink)]"
            style={{ fontFamily: 'var(--lms-font-display)' }}
          >
            {group.name}
          </h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] font-mono text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)]"
          >
            Edit
          </button>
        </div>
        <p className="mt-1 text-[12px] text-[var(--allonce-ink-muted)]">{group.description}</p>
        <div className="mt-3 flex -space-x-1.5">
          {members.slice(0, 6).map((m) => (
            <span key={m.id} className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--lms-primary,var(--allonce-ink))] text-[10px] font-semibold text-white">
              {m.avatar}
            </span>
          ))}
          {members.length > 6 && (
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--allonce-bg-soft)] text-[10px] font-semibold">
              +{members.length - 6}
            </span>
          )}
          {members.length === 0 && (
            <span className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">no members</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {courses.length === 0 ? (
            <span className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">no courses assigned</span>
          ) : courses.map((c) => (
            <span key={c.id} className="rounded-full bg-[var(--allonce-bg-soft)] px-2 py-0.5 font-mono text-[10px] text-[var(--allonce-ink-muted)]">
              {c.title}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--allonce-ink)] bg-white p-4 shadow-[0_0_0_1px_var(--allonce-ink)]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded border border-[var(--allonce-line)] px-2 py-1 text-[14px] font-semibold tracking-tight text-[var(--allonce-ink)]"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Group description"
        className="mt-2 w-full rounded border border-[var(--allonce-line)] px-2 py-1 text-[12px] text-[var(--allonce-ink-muted)]"
      />

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Members</p>
        <div className="mt-1 max-h-28 overflow-y-auto rounded border border-[var(--allonce-line)] p-2">
          {allMembers.length === 0 ? (
            <p className="font-mono text-[11px] text-[var(--allonce-ink-faint)]">No members yet.</p>
          ) : allMembers.map((m) => (
            <label key={m.id} className="flex items-center gap-2 py-0.5 text-[12px]">
              <input
                type="checkbox"
                checked={memberIds.includes(m.id)}
                onChange={() => setMemberIds((prev) => toggle(prev, m.id))}
                className="accent-[var(--lms-primary,var(--allonce-ink))]"
              />
              <span className="truncate">{m.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Assigned courses</p>
        <div className="mt-1 max-h-24 overflow-y-auto rounded border border-[var(--allonce-line)] p-2">
          {allCourses.length === 0 ? (
            <p className="font-mono text-[11px] text-[var(--allonce-ink-faint)]">No courses yet.</p>
          ) : allCourses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-0.5 text-[12px]">
              <input
                type="checkbox"
                checked={courseIds.includes(c.id)}
                onChange={() => setCourseIds((prev) => toggle(prev, c.id))}
                className="accent-[var(--lms-primary,var(--allonce-ink))]"
              />
              <span className="truncate">{c.title}</span>
              {c.status === 'draft' && (
                <span className="ml-auto rounded-full bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-700">
                  draft
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[10px] text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => void deleteGroup()}
          disabled={busy !== null}
          className="text-[11px] font-mono text-rose-700 transition hover:underline disabled:opacity-50"
        >
          {busy === 'delete' ? 'Deleting…' : 'Delete group'}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(group.name);
              setDescription(group.description);
              setMemberIds(group.memberIds);
              setCourseIds(group.assignedCourseIds);
              setError(null);
            }}
            disabled={busy !== null}
            className="inline-flex h-8 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[11px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== null}
            className="inline-flex h-8 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
