'use client';

// InviteForm — POSTs to /api/team/members/invite, surfaces invalid-email
// list, redirects to /s/team/members on success.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  spawnId: string;
  publishedCourses: Array<{ id: string; title: string }>;
}

type Role = 'Operator' | 'Admin' | 'Viewer';

export function InviteForm({ spawnId, publishedCourses }: Props) {
  const router = useRouter();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('Operator');
  const [enrollCourseId, setEnrollCourseId] = useState<string>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ invited: number; invalid: string[] } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emails
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parsed.length === 0) {
      setError('Add at least one email.');
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/team/members/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spawnId,
          emails: parsed,
          defaultRole: role,
          ...(enrollCourseId && { enrollCourseId }),
          ...(note && { note }),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        invited?: number;
        invalid?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      setReport({ invited: data.invited ?? 0, invalid: data.invalid ?? [] });
      setEmails('');
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-2xl rounded-md border border-[var(--allonce-line)] bg-white p-6"
    >
      <p className="text-[12.5px] leading-snug text-[var(--allonce-ink-muted)]">
        Paste a list of emails — one per line, comma, or semicolon. Each invitee gets a
        magic-link to a brand-themed Qualige instance. Auto-enroll into a starter course if you
        pick one below.
      </p>

      <label className="mt-5 block">
        <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
          Emails
        </span>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={6}
          required
          placeholder={'kote@allonelabs.com\nnika@allonelabs.com'}
          className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 font-mono text-[12px]"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
            Default role
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
          >
            <option value="Operator">Operator</option>
            <option value="Admin">Admin</option>
            <option value="Viewer">Viewer</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
            Auto-enroll into
          </span>
          <select
            value={enrollCourseId}
            onChange={(e) => setEnrollCourseId(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
          >
            <option value="">— None —</option>
            {publishedCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
          Personal note (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Welcome — your first course is Getting Started…"
          className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
        />
      </label>

      {error && (
        <p className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-800">
          <p className="font-medium">
            Sent {report.invited} invitation{report.invited === 1 ? '' : 's'}.
          </p>
          {report.invalid.length > 0 && (
            <p className="mt-1 font-mono text-[10px] text-rose-700">
              Skipped invalid: {report.invalid.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">
          Magic-link delivery via email-forge bridge ships in a follow-up slice.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send invitations'}
        </button>
      </div>
    </form>
  );
}
