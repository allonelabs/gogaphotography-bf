'use client';

// "From AI prompt" mode for the new-workflow page. Two-step form:
//   1. Prose textarea + Preview button → POST phase='preview' →
//      render the proposal card with trigger + actions list + rationale.
//   2. Publish button on the proposal → POST phase='publish' →
//      redirect into the new workflow's detail page.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Proposal {
  name: string;
  description: string;
  trigger: { tool: string; event: string; conditionSummary?: string };
  actions: Array<{ tool: string; action: string }>;
  rationale: string;
  noChange?: boolean;
}

interface Props {
  spawnId: string;
}

export function WorkflowFromPromptForm({ spawnId }: Props) {
  const router = useRouter();
  const [prose, setProse] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState<'preview' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  async function preview(e: React.FormEvent) {
    e.preventDefault();
    if (prose.trim().length === 0) return;
    setBusy('preview');
    setError(null);
    setProposal(null);
    try {
      const res = await fetch('/api/automation/workflow/from-prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phase: 'preview', spawnId, prose }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; proposal?: Proposal; source?: string; error?: string;
      };
      if (!res.ok || !data.ok || !data.proposal) {
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      setProposal(data.proposal);
      setSource(data.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'preview failed');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!proposal || proposal.noChange) return;
    setBusy('publish');
    setError(null);
    try {
      const res = await fetch('/api/automation/workflow/from-prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phase: 'publish', spawnId, proposal }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; workflowId?: string; error?: string;
      };
      if (!res.ok || !data.ok || !data.workflowId) {
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      router.push(`/app/business/${spawnId}/s/automations/workflows/${data.workflowId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'publish failed');
      setBusy(null);
    }
  }

  return (
    <div>
      <form onSubmit={preview} className="rounded-md border border-[var(--allonce-line)] bg-white p-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
          From AI prompt
        </p>
        <p className="mt-1 max-w-2xl text-[12.5px] text-[var(--allonce-ink-muted)]">
          Describe what should happen. The composer maps your request onto the available triggers +
          actions catalog and returns a draft. Without ANTHROPIC_API_KEY it falls back to a "no
          change" rationale.
        </p>
        <textarea
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          rows={4}
          required
          placeholder="When a Stripe payment fails, retry once then post a Slack alert in #refunds and append a note to the customer's CRM contact."
          className="mt-4 w-full rounded border border-[var(--allonce-line)] px-3 py-2 text-[13px]"
        />
        {error && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={busy !== null || prose.trim().length === 0}
            className="inline-flex h-9 items-center rounded-md bg-[var(--allonce-ink)] px-4 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {busy === 'preview' ? 'Drafting…' : 'Draft workflow'}
          </button>
        </div>
      </form>

      {proposal && (
        <div className="mt-5 rounded-md border border-[var(--allonce-ink)] bg-white p-5 shadow-[0_0_0_1px_var(--allonce-ink)]">
          {proposal.noChange ? (
            <>
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
                No proposal
              </p>
              <p className="mt-2 text-[13px] text-[var(--allonce-ink)]">{proposal.rationale}</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
                    Draft proposal{source ? ` · ${source}` : ''}
                  </p>
                  <h3 className="mt-1 text-[15.5px] font-semibold tracking-tight text-[var(--allonce-ink)]">
                    {proposal.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center rounded-md bg-[var(--lms-primary,var(--allonce-ink))] px-4 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {busy === 'publish' ? 'Publishing…' : 'Publish as draft'}
                </button>
              </div>
              <p className="mt-2 text-[13px] text-[var(--allonce-ink-muted)]">{proposal.description}</p>

              <ol className="mt-4 flex flex-wrap items-stretch gap-2">
                <li className="flex flex-col rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700">Trigger</span>
                  <span className="font-mono text-[12px] text-emerald-900">
                    {proposal.trigger.tool}.{proposal.trigger.event}
                  </span>
                  {proposal.trigger.conditionSummary && (
                    <span className="font-mono text-[10px] text-emerald-700">
                      if: {proposal.trigger.conditionSummary}
                    </span>
                  )}
                </li>
                {proposal.actions.map((a, i) => (
                  <li key={i} className="flex flex-col rounded-md border border-[var(--allonce-line)] bg-white px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-faint)]">
                      Step {i + 1}
                    </span>
                    <span className="font-mono text-[12px] text-[var(--allonce-ink)]">
                      {a.tool}.{a.action}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-md bg-[var(--allonce-bg-soft)] px-3 py-2 text-[12px] text-[var(--allonce-ink-muted)]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-faint)]">Why</span>{' '}
                {proposal.rationale}
              </p>

              <p className="mt-3 font-mono text-[10px] text-[var(--allonce-ink-faint)]">
                Publish creates a status='draft' workflow. Review, then enable from the detail page.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
