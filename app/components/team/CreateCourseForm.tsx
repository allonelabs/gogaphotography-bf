'use client';

// CreateCourseForm — picks one of 5 channels, collects a small payload, POSTs
// to /api/team/courses/create which dispatches to the academy-forge composer
// matching the channel and writes a TeamCourse-shaped cell file. On success,
// redirects to /s/team/courses/<courseId>.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Channel = 'manual' | 'ai-prompt' | 'ai-pdf' | 'ai-youtube' | 'ai-existing';

interface Props {
  spawnId: string;
  /** Existing courses listed for the ai-existing channel's source picker. */
  existingCourses: Array<{ id: string; title: string }>;
}

interface ChannelDef {
  key: Channel;
  label: string;
  description: string;
  hint: string;
  cost: 'free' | 'paid';
}

const CHANNELS: ChannelDef[] = [
  { key: 'manual',     label: 'Start from scratch', description: 'Open the slide editor with one blank lesson and one cover slide.',                hint: 'best for short SOPs',           cost: 'free' },
  { key: 'ai-prompt',  label: 'From a prompt',      description: 'Describe the topic, target audience, and length. Claude drafts lessons + slides.', hint: 'cell · course-from-prompt',     cost: 'paid' },
  { key: 'ai-pdf',     label: 'From a PDF',         description: 'Paste the full text of a manual, handbook, or playbook. Claude structures it.',    hint: 'cell · course-from-pdf',        cost: 'paid' },
  { key: 'ai-youtube', label: 'From a transcript',  description: 'Paste a YouTube transcript and Claude builds the course around it.',               hint: 'cell · course-from-youtube',    cost: 'paid' },
  { key: 'ai-existing',label: 'Duplicate a course', description: 'Pick a course as the starting point — duplicates lessons and slides as a draft.', hint: 'deterministic',                  cost: 'free' },
];

export function CreateCourseForm({ spawnId, existingCourses }: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState<'all-employees' | 'admins' | 'engineers' | 'sales' | 'support'>('all-employees');
  const [pdfText, setPdfText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sourceCourseId, setSourceCourseId] = useState(existingCourses[0]?.id ?? '');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function submit() {
    if (!channel) return;
    setError(null);
    setSubmitting(true);
    setProgress(channel === 'manual' || channel === 'ai-existing' ? 'creating…' : 'asking Claude…');

    try {
      const res = await fetch('/api/team/courses/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spawnId,
          channel,
          topic,
          audience,
          ...(channel === 'ai-prompt' && additionalInstructions.trim() ? { additionalInstructions } : {}),
          ...(channel === 'ai-pdf' ? { pdfText } : {}),
          ...(channel === 'ai-youtube' ? { transcript } : {}),
          ...(channel === 'ai-existing' ? { sourceCourseId } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; courseId?: string; error?: string; source?: string;
      };
      if (!res.ok || !data.ok || !data.courseId) {
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      setProgress(`created · source=${data.source ?? 'unknown'}`);
      router.push(`/app/business/${spawnId}/s/team/courses/${data.courseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div>
      <p className="mb-5 max-w-2xl text-[13px] leading-snug text-[var(--allonce-ink-muted)]">
        Pick a starting mode. AI modes flow through the academy-forge composers — fingerprint cache,
        cost counter, and voice fingerprint apply automatically. Without an Anthropic key, AI modes
        fall through to a deterministic fallback that still produces a real course.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CHANNELS.map((c) => {
          const active = channel === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannel(c.key)}
              aria-pressed={active}
              className={`group flex flex-col gap-2 rounded-md border bg-white p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--allonce-ink)]/30 ${
                active
                  ? 'border-[var(--allonce-ink)] shadow-[0_0_0_1px_var(--allonce-ink)]'
                  : 'border-[var(--allonce-line)] hover:border-[var(--allonce-ink-dim)]'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3
                  className="text-[14px] font-semibold tracking-tight text-[var(--allonce-ink)]"
                  style={{ fontFamily: 'var(--lms-font-display)' }}
                >
                  {c.label}
                </h3>
                <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ring-1 ring-inset ${
                  c.cost === 'paid'
                    ? 'bg-[var(--allonce-bg-soft)] text-[var(--allonce-ink-muted)] ring-[var(--allonce-line)]'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                }`}>{c.cost}</span>
              </div>
              <p className="text-[12.5px] leading-snug text-[var(--allonce-ink-muted)]">{c.description}</p>
              <p className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">{c.hint}</p>
            </button>
          );
        })}
      </div>

      {channel && (
        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="mt-6 rounded-md border border-[var(--allonce-line)] bg-white p-5"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            {CHANNELS.find((c) => c.key === channel)?.label}
          </p>

          {channel !== 'ai-existing' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Topic / title</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="GDPR essentials for support agents"
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
              />
            </label>
          )}

          {channel !== 'ai-existing' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Audience</span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
              >
                <option value="all-employees">All employees</option>
                <option value="admins">Admins</option>
                <option value="engineers">Engineers</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
              </select>
            </label>
          )}

          {channel === 'ai-prompt' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Extra steering (optional)</span>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
                placeholder="Conversational tone. Cite Art. 12(3) GDPR explicitly."
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[12.5px]"
              />
            </label>
          )}

          {channel === 'ai-pdf' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">PDF text (paste extracted body, ≥100 chars)</span>
              <textarea
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                rows={8}
                placeholder="Paste the full text of the manual / handbook here."
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 font-mono text-[11px]"
              />
            </label>
          )}

          {channel === 'ai-youtube' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Transcript (≥100 chars)</span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                placeholder="Paste a video transcript here."
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 font-mono text-[11px]"
              />
            </label>
          )}

          {channel === 'ai-existing' && (
            <label className="mt-3 block">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Source course</span>
              <select
                value={sourceCourseId}
                onChange={(e) => setSourceCourseId(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
              >
                {existingCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">{error}</p>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">{progress ?? ''}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setChannel(null); setError(null); }}
                disabled={submitting}
                className="inline-flex h-9 items-center rounded-md border border-[var(--allonce-line)] bg-white px-3 text-[12px] font-medium hover:bg-[var(--allonce-bg-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Working…' : 'Create course'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
