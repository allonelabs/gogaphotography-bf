'use client';

// TutorChat — interactive chat over POST /api/team/tutor.
// One message exchange at a time; preserves history for the next call so
// the composer keeps context. Citations render as small chips below each
// reply.

import { useState } from 'react';

interface Citation {
  module: number;
  slide?: number;
  quiz?: number;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  notInCourse?: boolean;
}

interface Props {
  spawnId: string;
  initialCourseId?: string;
  courses: Array<{ id: string; title: string; status: string }>;
}

export function TutorChat({ spawnId, initialCourseId, courses }: Props) {
  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id ?? '');
  const [history, setHistory] = useState<Turn[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || query.trim().length === 0) return;
    const myQuery = query.trim();
    setError(null);
    setBusy(true);

    const nextHistory: Turn[] = [...history, { role: 'user', content: myQuery }];
    setHistory(nextHistory);
    setQuery('');

    try {
      const res = await fetch('/api/team/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spawnId,
          courseId,
          query: myQuery,
          // Composer expects { user, assistant, citations? } turns.
          history: nextHistory.slice(0, -1).map((t) => ({
            user: t.role === 'user' ? t.content : '',
            assistant: t.role === 'assistant' ? t.content : '',
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reply?: string;
        citations?: Citation[];
        notInCourse?: boolean;
        source?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.reply) {
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply!,
          citations: data.citations ?? [],
          notInCourse: data.notInCourse ?? false,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'tutor failed');
      // Roll back the user message we optimistically added so the operator
      // can retry.
      setHistory((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="rounded-md border border-[var(--allonce-line)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--allonce-line)] px-4 py-2.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Tutor
          </p>
          <select
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setHistory([]); }}
            className="rounded border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
            title="Tutor scope (one course at a time)"
          >
            {courses.length === 0 && <option value="">No courses yet</option>}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}{c.status === 'draft' ? ' (draft)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 p-5">
          {history.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--allonce-line)] bg-[var(--allonce-bg-soft)]/40 p-4 text-center font-mono text-[11px] text-[var(--allonce-ink-faint)]">
              Ask anything about the selected course. The tutor only answers from course content;
              questions outside scope return "not covered".
            </p>
          )}
          {history.map((t, i) => (
            <div key={i} className="space-y-2">
              {t.role === 'user' ? (
                <div className="rounded-md bg-[var(--allonce-bg-soft)] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                    You
                  </p>
                  <p className="mt-1 text-[13.5px] text-[var(--allonce-ink)]">{t.content}</p>
                </div>
              ) : (
                <div className="rounded-md border border-[var(--allonce-line)] bg-white px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--lms-accent,var(--allonce-ink-muted))]">
                    Tutor{t.notInCourse && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">out of scope</span>}
                  </p>
                  <p
                    className="mt-1 text-[13.5px] text-[var(--allonce-ink)]"
                    style={{ fontFamily: 'var(--lms-font-body)' }}
                  >
                    {t.content}
                  </p>
                  {t.citations && t.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.citations.map((c, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-[var(--allonce-bg-soft)] px-2 py-0.5 font-mono text-[10px] text-[var(--allonce-ink-muted)]"
                        >
                          M{c.module}
                          {c.slide ? ` · S${c.slide}` : ''}
                          {c.quiz ? ` · Q${c.quiz}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={ask} className="border-t border-[var(--allonce-line)] p-3">
          {error && (
            <p className="mb-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[10px] text-rose-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about this course…"
              disabled={busy || courses.length === 0}
              className="flex-1 rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px] disabled:bg-[var(--allonce-bg-soft)]"
            />
            <button
              type="submit"
              disabled={busy || courses.length === 0 || query.trim().length === 0}
              className="inline-flex items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Thinking…' : 'Ask'}
            </button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[var(--allonce-ink-faint)]">
            cell · academy-forge.tutor-response · sonnet · grounded in course slides + quiz
          </p>
        </form>
      </div>

      <div className="space-y-3">
        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Suggested questions
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px]">
            {[
              'What does this course cover?',
              'Summarize lesson 1 in three bullets.',
              "What's the most important quiz question?",
              'Which lesson should I revisit?',
            ].map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => setQuery(q)}
                  className="text-left text-[var(--allonce-ink)] transition hover:underline"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            How this works
          </p>
          <p className="mt-2 text-[11.5px] leading-snug text-[var(--allonce-ink-muted)]">
            The tutor reads only the selected course's slides + quiz items as context. It refuses
            to answer outside that scope and cites the slide or quiz it pulled from. Each reply
            persists as a cell, so identical questions later are free.
          </p>
        </div>
      </div>
    </div>
  );
}
