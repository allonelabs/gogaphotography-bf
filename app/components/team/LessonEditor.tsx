'use client';

// Interactive lesson editor — Qualige-style three-pane:
//   left:   slide thumbnails (clickable selects active slide)
//   center: live canvas (renders selected slide in the brand display font)
//   right:  slide-kind picker + property inputs + AI shortcuts
//
// Edits update local state instantly; "Save slide" PATCHes the course cell
// at /api/team/courses/[cid]/lessons/[lid]/slides. Dirty-flag prevents
// pointless requests.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeamSlide, SlideKind } from '@/app/data/mock-team-academy';

const KINDS: SlideKind[] = ['cover', 'text', 'image', 'video', 'code', 'quiz', 'embed', 'callout'];

const KIND_LABEL: Record<SlideKind, string> = {
  cover: 'Cover', text: 'Text', image: 'Image', video: 'Video',
  code: 'Code', quiz: 'Quiz', embed: 'Embed', callout: 'Callout',
};

interface Props {
  spawnId: string;
  courseId: string;
  lessonId: string;
  initialSlides: TeamSlide[];
  /** Background tint via brand palette — passed straight through to the canvas. */
  themeFontDisplay?: string;
}

export function LessonEditor({ spawnId, courseId, lessonId, initialSlides }: Props) {
  const router = useRouter();
  const [slides, setSlides] = useState<TeamSlide[]>(initialSlides);
  const [selectedId, setSelectedId] = useState<string>(initialSlides[0]?.id ?? '');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftBody, setDraftBody] = useState<string>('');
  const [draftKind, setDraftKind] = useState<SlideKind>('text');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const selected = useMemo(() => slides.find((s) => s.id === selectedId) ?? null, [slides, selectedId]);
  const dirty =
    selected != null &&
    (draftTitle !== (selected.title ?? '') ||
     draftBody !== (selected.body ?? '') ||
     draftKind !== selected.kind);

  async function deleteSelected() {
    if (!selected) return;
    if (slides.length <= 1) {
      setError("A lesson must have at least one slide.");
      return;
    }
    if (!window.confirm('Delete this slide? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/slides/${encodeURIComponent(selected.id)}/delete`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      const idx = slides.findIndex((s) => s.id === selected.id);
      const next = slides.filter((s) => s.id !== selected.id);
      setSlides(next);
      // Pick a sensible neighbour to focus.
      const fallback = next[Math.max(0, Math.min(idx, next.length - 1))]?.id ?? '';
      setSelectedId(fallback);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function addSlide() {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/slides/post`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spawnId, kind: 'text', title: 'Untitled slide' }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; slideId?: string; error?: string };
      if (!res.ok || !data.ok || !data.slideId) throw new Error(data.error ?? `request failed (${res.status})`);
      // Optimistically append; router.refresh re-syncs from disk.
      const next: TeamSlide = {
        id: data.slideId,
        kind: 'text',
        title: 'Untitled slide',
        body: '',
        durationMin: 1,
      };
      setSlides((prev) => [...prev, next]);
      setSelectedId(data.slideId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'add failed');
    } finally {
      setAdding(false);
    }
  }

  // Sync draft state when selection changes.
  useEffect(() => {
    if (!selected) return;
    setDraftTitle(selected.title ?? '');
    setDraftBody(selected.body ?? '');
    setDraftKind(selected.kind);
    setError(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!selected || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/team/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/slides`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            spawnId,
            slideId: selected.id,
            patch: { title: draftTitle, body: draftBody, kind: draftKind },
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; slide?: TeamSlide; error?: string };
      if (!res.ok || !data.ok || !data.slide) throw new Error(data.error ?? `request failed (${res.status})`);
      // Update local state with the saved slide so dirty-flag clears.
      setSlides((prev) => prev.map((s) => (s.id === selected.id ? data.slide! : s)));
      setSavedAt(Date.now());
      // Refresh server data so other tabs of /s/team/* see the new title.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr_280px]">
      {/* Slide thumbnails */}
      <div className="flex flex-col gap-1">
        <ul className="space-y-1 rounded-md border border-[var(--allonce-line)] bg-white p-2">
          {slides.map((s, i) => {
            const active = s.id === selectedId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded border p-2 text-left transition ${
                    active
                      ? 'border-[var(--allonce-ink)] bg-[var(--allonce-bg-soft)]'
                      : 'border-transparent hover:border-[var(--allonce-line)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-[var(--allonce-ink-faint)]">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="truncate text-[11px] text-[var(--allonce-ink)]">{s.title || 'Untitled slide'}</span>
                  </div>
                  <span className="mt-1 block w-fit rounded bg-[var(--allonce-bg-soft)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--allonce-ink-muted)]">
                    {KIND_LABEL[s.kind] ?? s.kind}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => void addSlide()}
          disabled={adding}
          className="rounded-md border border-dashed border-[var(--allonce-line)] bg-white py-2 text-[11px] font-medium text-[var(--allonce-ink-muted)] transition hover:border-[var(--allonce-ink)] hover:text-[var(--allonce-ink)] disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add slide'}
        </button>
      </div>

      {/* Canvas */}
      <div className="rounded-md border border-[var(--allonce-line)] bg-white p-6">
        <div
          className="aspect-[16/9] overflow-hidden rounded-md border border-dashed border-[var(--allonce-line)] bg-gradient-to-br from-[var(--lms-surface,#fff)] to-[var(--allonce-bg-soft)] p-8"
          style={{ fontFamily: 'var(--lms-font-display)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            {KIND_LABEL[draftKind]}
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--lms-ink,var(--allonce-ink))]">
            {draftTitle || 'Untitled slide'}
          </h3>
          <p
            className="mt-3 max-w-prose whitespace-pre-line text-[14px] text-[var(--allonce-ink-muted)]"
            style={{ fontFamily: 'var(--lms-font-body)' }}
          >
            {draftBody || 'Click a slide on the left to edit. Edits preview here live; press Save to persist.'}
          </p>
        </div>

        {/* Footer — save bar */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--allonce-line)] pt-3">
          <p className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">
            {error
              ? <span className="text-rose-700">{error}</span>
              : dirty
              ? 'Unsaved changes'
              : savedAt
              ? `Saved ${secondsAgo(savedAt)}s ago`
              : 'No changes'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void deleteSelected()}
              disabled={deleting || saving || slides.length <= 1}
              className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-white px-3 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              title={slides.length <= 1 ? "A lesson must have at least one slide" : "Delete slide"}
            >
              {deleting ? 'Deleting…' : 'Delete slide'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selected) return;
                setDraftTitle(selected.title ?? '');
                setDraftBody(selected.body ?? '');
                setDraftKind(selected.kind);
              }}
              disabled={!dirty || saving}
              className="inline-flex h-8 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[11px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="inline-flex h-8 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save slide'}
            </button>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="space-y-4">
        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Slide kind
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {KINDS.map((k) => {
              const active = draftKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraftKind(k)}
                  aria-pressed={active}
                  className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                    active
                      ? 'border-[var(--allonce-ink)] bg-[var(--allonce-ink)] text-white'
                      : 'border-[var(--allonce-line)] bg-white hover:border-[var(--allonce-ink-dim)]'
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Properties
          </p>
          <div className="mt-2 space-y-2 text-[12px]">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Title</span>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Slide title"
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Body</span>
              <textarea
                rows={6}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder="What this slide teaches…"
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12px]"
              />
            </label>
          </div>
        </div>

        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            AI shortcuts
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px]">
            <li><button type="button" className="text-left text-[var(--allonce-ink)] transition hover:underline">Rewrite slide more concisely</button></li>
            <li><button type="button" className="text-left text-[var(--allonce-ink)] transition hover:underline">Generate a follow-up quiz question</button></li>
            <li><button type="button" className="text-left text-[var(--allonce-ink)] transition hover:underline">Suggest an image prompt</button></li>
            <li><button type="button" className="text-left text-[var(--allonce-ink)] transition hover:underline">Translate to en, de, ka</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function secondsAgo(then: number): number {
  return Math.max(0, Math.round((Date.now() - then) / 1000));
}
