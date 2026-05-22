'use client';

// QuizBuilder — per-lesson quiz authoring. One <details> per lesson; inside,
// a list of questions (each editable inline) + Add-question affordance.
// All edits are PATCHes to /api/team/courses/[cid]/lessons/[lid]/quiz/[qid].
// Save fires only on dirty + with optimistic local state so the rail stays
// responsive even on slow disks.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  QuizQuestionKind,
  TeamLesson,
  TeamQuizQuestion,
} from '@/app/data/mock-team-academy';

interface Props {
  spawnId: string;
  courseId: string;
  initialLessons: TeamLesson[];
}

const KIND_LABEL: Record<QuizQuestionKind, string> = {
  'multi-choice': 'Multi-choice',
  'short-answer': 'Short answer',
  'code': 'Code',
  'true-false': 'True / false',
};

export function QuizBuilder({ spawnId, courseId, initialLessons }: Props) {
  const [lessons, setLessons] = useState<TeamLesson[]>(initialLessons);

  function updateLesson(lid: string, mut: (l: TeamLesson) => TeamLesson) {
    setLessons((prev) => prev.map((l) => (l.id === lid ? mut(l) : l)));
  }

  return (
    <div className="grid gap-3">
      {lessons.map((l, idx) => (
        <LessonBlock
          key={l.id}
          lesson={l}
          openByDefault={idx < 2}
          spawnId={spawnId}
          courseId={courseId}
          onLessonChange={(mut) => updateLesson(l.id, mut)}
        />
      ))}
    </div>
  );
}

function LessonBlock({
  lesson, openByDefault, spawnId, courseId, onLessonChange,
}: {
  lesson: TeamLesson;
  openByDefault: boolean;
  spawnId: string;
  courseId: string;
  onLessonChange: (mut: (l: TeamLesson) => TeamLesson) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quiz = lesson.quiz ?? [];

  async function addQuestion() {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lesson.id)}/quiz`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId, kind: 'multi-choice' }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; questionId?: string; error?: string };
      if (!res.ok || !data.ok || !data.questionId) throw new Error(data.error ?? 'add failed');
      // Optimistic append
      onLessonChange((l) => ({
        ...l,
        quiz: [
          ...(l.quiz ?? []),
          {
            id: data.questionId!,
            kind: 'multi-choice',
            prompt: 'Untitled question',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
          },
        ],
        quizCount: (l.quiz?.length ?? 0) + 1,
      }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'add failed');
    } finally {
      setAdding(false);
    }
  }

  return (
    <details open={openByDefault} className="group rounded-md border border-[var(--allonce-line)] bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] tabular-nums text-[var(--allonce-ink-faint)]">L{lesson.id.replace(/[^0-9]/g, '').padStart(2, '0') || '01'}</span>
          <p className="text-[13px] font-medium text-[var(--allonce-ink)]">{lesson.title}</p>
          {lesson.draft && (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-700">draft</span>
          )}
        </div>
        <span className="font-mono text-[10px] tabular-nums text-[var(--allonce-ink-muted)]">
          {quiz.length} Q{quiz.length === 1 ? '' : 's'}
        </span>
      </summary>
      <div className="space-y-3 border-t border-[var(--allonce-line)] p-4">
        {quiz.length === 0 && (
          <p className="rounded border border-dashed border-[var(--allonce-line)] bg-[var(--allonce-bg-soft)]/40 p-3 text-center font-mono text-[11px] text-[var(--allonce-ink-faint)]">
            No questions yet. Add one to get started.
          </p>
        )}
        {quiz.map((q, i) => (
          <QuestionRow
            key={q.id}
            idx={i + 1}
            spawnId={spawnId}
            courseId={courseId}
            lessonId={lesson.id}
            question={q}
            onChange={(updated) => onLessonChange((l) => ({
              ...l,
              quiz: (l.quiz ?? []).map((x) => (x.id === updated.id ? updated : x)),
            }))}
            onDelete={() => onLessonChange((l) => ({
              ...l,
              quiz: (l.quiz ?? []).filter((x) => x.id !== q.id),
              quizCount: (l.quiz?.length ?? 1) - 1,
            }))}
          />
        ))}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => void addQuestion()}
            disabled={adding}
            className="text-[12px] font-medium text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)] disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add question'}
          </button>
          {error && (
            <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
              {error}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}

function QuestionRow({
  idx, spawnId, courseId, lessonId, question, onChange, onDelete,
}: {
  idx: number;
  spawnId: string;
  courseId: string;
  lessonId: string;
  question: TeamQuizQuestion;
  onChange: (q: TeamQuizQuestion) => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<TeamQuizQuestion>(question);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    draft.prompt !== question.prompt ||
    draft.kind !== question.kind ||
    draft.correctIndex !== question.correctIndex ||
    JSON.stringify(draft.options ?? null) !== JSON.stringify(question.options ?? null) ||
    draft.explanation !== question.explanation;

  async function save() {
    setBusy('save');
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/quiz/${encodeURIComponent(question.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            spawnId,
            patch: {
              prompt: draft.prompt,
              kind: draft.kind,
              options: draft.options,
              correctIndex: draft.correctIndex,
              explanation: draft.explanation,
            },
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; question?: TeamQuizQuestion; error?: string };
      if (!res.ok || !data.ok || !data.question) throw new Error(data.error ?? 'save failed');
      onChange(data.question);
      setDraft(data.question);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setBusy(null);
    }
  }

  async function deleteQ() {
    if (!window.confirm('Delete this question?')) return;
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/quiz/${encodeURIComponent(question.id)}/delete`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
      onDelete();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed');
      setBusy(null);
    }
  }

  return (
    <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
          Q{idx}
        </p>
        <select
          value={draft.kind}
          onChange={(e) => {
            const k = e.target.value as QuizQuestionKind;
            setDraft((d) => ({
              ...d,
              kind: k,
              options:
                k === 'true-false' ? ['True', 'False']
              : k === 'multi-choice' ? (d.options && d.options.length >= 2 ? d.options : ['Option A', 'Option B'])
              : undefined,
              correctIndex:
                k === 'short-answer' || k === 'code' ? undefined
              : (d.correctIndex ?? 0),
            }));
          }}
          className="rounded border border-[var(--allonce-line)] bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
        >
          {(Object.keys(KIND_LABEL) as QuizQuestionKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>

      <input
        value={draft.prompt}
        onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
        placeholder="What does the learner need to answer?"
        className="mt-2 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12.5px]"
      />

      {(draft.kind === 'multi-choice' || draft.kind === 'true-false') && draft.options && (
        <ul className="mt-2 space-y-1.5">
          {draft.options.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={draft.correctIndex === i}
                onChange={() => setDraft((d) => ({ ...d, correctIndex: i }))}
                className="accent-[var(--lms-primary,var(--allonce-ink))]"
              />
              <input
                value={opt}
                onChange={(e) => setDraft((d) => ({
                  ...d,
                  options: d.options?.map((x, j) => (j === i ? e.target.value : x)),
                }))}
                disabled={draft.kind === 'true-false'}
                className="w-full rounded border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px] disabled:bg-[var(--allonce-bg-soft)]"
              />
              {draft.kind === 'multi-choice' && draft.options!.length > 2 && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({
                    ...d,
                    options: d.options?.filter((_, j) => j !== i),
                    correctIndex: d.correctIndex !== undefined && d.correctIndex >= i && d.correctIndex > 0
                      ? d.correctIndex - 1
                      : d.correctIndex,
                  }))}
                  className="text-[11px] font-mono text-[var(--allonce-ink-faint)] transition hover:text-rose-700"
                  title="Remove option"
                >
                  ×
                </button>
              )}
            </li>
          ))}
          {draft.kind === 'multi-choice' && (draft.options?.length ?? 0) < 6 && (
            <li>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, options: [...(d.options ?? []), `Option ${String.fromCharCode(65 + (d.options?.length ?? 0))}`] }))}
                className="text-[11px] font-mono text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)]"
              >
                Add option
              </button>
            </li>
          )}
        </ul>
      )}

      {(draft.kind === 'short-answer' || draft.kind === 'code') && (
        <p className="mt-2 font-mono text-[10px] text-[var(--allonce-ink-faint)]">
          {draft.kind === 'short-answer' ? 'Free-text grading is operator-reviewed (essay-grader cell coming).' : 'Code questions show a monaco-style editor in preview; auto-grading is on the roadmap.'}
        </p>
      )}

      <details className="mt-2 text-[11px]">
        <summary className="cursor-pointer text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)]">
          Explanation
        </summary>
        <textarea
          value={draft.explanation ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value || undefined }))}
          rows={2}
          placeholder="Shown after the learner answers."
          className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1 text-[11.5px]"
        />
      </details>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => void deleteQ()}
          disabled={busy !== null}
          className="text-[11px] font-mono text-rose-700 transition hover:underline disabled:opacity-50"
        >
          {busy === 'delete' ? 'Deleting…' : 'Delete'}
        </button>
        <div className="flex items-center gap-2">
          {error && (
            <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDraft(question)}
            disabled={!dirty || busy !== null}
            className="inline-flex h-7 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[11px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || busy !== null}
            className="inline-flex h-7 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-3 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
