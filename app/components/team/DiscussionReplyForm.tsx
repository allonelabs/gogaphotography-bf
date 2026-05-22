'use client';

// DiscussionReplyForm — POST a reply to a discussion thread. authorId is
// pre-selected from the operator's role list (since real auth ships in
// Phase 40d). Refreshes the page to show the new reply.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  discussionId: string;
  members: Array<{ id: string; name: string; role: string }>;
}

export function DiscussionReplyForm({ spawnId, discussionId, members }: Props) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState(members[0]?.id ?? '');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorId || body.trim().length === 0) {
      setError('Pick an author and write a reply.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/discussions/${encodeURIComponent(discussionId)}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, authorId, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      setBody('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'reply failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Reply as</span>
        <select
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          className="rounded border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
          ))}
        </select>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Reply…"
        className="mt-3 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
      />
      {error && (
        <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[10px] text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  );
}
