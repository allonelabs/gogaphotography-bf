'use client';

// WorkflowCanvas — visual workflow editor (Plan 7). Three panes:
//   Left:   trigger picker (dropdown tool → dropdown event)
//   Center: pipeline canvas with action chain (add / remove / reorder)
//   Right:  properties (name, description, condition, cap)
// + Validate (debounced) + Save as draft.
//
// No new dependencies — uses click-to-add + up/down arrows for ordering
// instead of dnd. Trades visual polish for ship-today.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CatalogShape {
  triggers: Record<string, string[]>;
  actions: Record<string, Array<{ name: string; cost: 'free' | 'paid' }>>;
}

interface Issue { level: 'error' | 'warn'; field: string; message: string }

interface Draft {
  name: string;
  description: string;
  trigger: { tool: string; event: string; conditionSummary?: string };
  actions: Array<{ tool: string; action: string }>;
  capUsd?: number;
}

interface Props {
  spawnId: string;
  catalog: CatalogShape;
  /** Optional pre-fill (from a template). */
  initialDraft?: Partial<Draft>;
  /** When set, save PUTs to /api/automation/workflow/<id>/update instead of POSTing
   *  to /create. Use this for the "edit existing" entry point so stats are preserved. */
  existingWorkflowId?: string;
}

export function WorkflowCanvas({ spawnId, catalog, initialDraft, existingWorkflowId }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: initialDraft?.name ?? '',
    description: initialDraft?.description ?? '',
    trigger: initialDraft?.trigger ?? { tool: '', event: '' },
    actions: initialDraft?.actions ? [...initialDraft.actions] : [],
    capUsd: initialDraft?.capUsd ?? 5,
  }));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState<'validate' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerTools = useMemo(() => Object.keys(catalog.triggers), [catalog]);
  const actionTools = useMemo(() => Object.keys(catalog.actions), [catalog]);
  const currentEvents = catalog.triggers[draft.trigger.tool] ?? [];

  // Debounced background validate so the operator gets live feedback.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/automation/workflow/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ draft }),
        });
        const data = (await res.json()) as { issues?: Issue[] };
        setIssues(data.issues ?? []);
      } catch { /* ignore — server-down is rare */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  const errorIssues = issues.filter((i) => i.level === 'error');
  const warnIssues = issues.filter((i) => i.level === 'warn');
  const publishable = errorIssues.length === 0 && draft.actions.length > 0 && draft.trigger.event !== '';

  function setActions(next: Array<{ tool: string; action: string }>) {
    setDraft((d) => ({ ...d, actions: next }));
  }
  function addAction() { setActions([...draft.actions, { tool: actionTools[0]!, action: '' }]); }
  function removeAction(i: number) { setActions(draft.actions.filter((_, j) => j !== i)); }
  function moveAction(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.actions.length) return;
    const next = draft.actions.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    setActions(next);
  }
  function setActionTool(i: number, tool: string) {
    const next = draft.actions.slice();
    next[i] = { tool, action: '' };
    setActions(next);
  }
  function setActionName(i: number, action: string) {
    const next = draft.actions.slice();
    next[i] = { ...next[i]!, action };
    setActions(next);
  }

  async function save() {
    if (!publishable) return;
    setBusy('save');
    setError(null);
    try {
      const url = existingWorkflowId
        ? `/api/automation/workflow/${existingWorkflowId}/update`
        : '/api/automation/workflow/create';
      const res = await fetch(url, {
        method: existingWorkflowId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spawnId, draft }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; workflowId?: string; error?: string; issues?: Issue[];
      };
      if (!res.ok || !data.ok || !data.workflowId) {
        setIssues(data.issues ?? []);
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      router.push(`/app/business/${spawnId}/s/automations/workflows/${data.workflowId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
      {/* Left — trigger picker */}
      <aside className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">Trigger</p>
        <label className="mt-3 block">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Tool</span>
          <select
            value={draft.trigger.tool}
            onChange={(e) => setDraft((d) => ({ ...d, trigger: { tool: e.target.value, event: '' } }))}
            className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12.5px]"
          >
            <option value="">— Pick a tool —</option>
            {triggerTools.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Event</span>
          <select
            value={draft.trigger.event}
            onChange={(e) => setDraft((d) => ({ ...d, trigger: { ...d.trigger, event: e.target.value } }))}
            disabled={!draft.trigger.tool}
            className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12.5px] disabled:bg-[var(--allonce-bg-soft)]"
          >
            <option value="">{draft.trigger.tool ? '— Pick an event —' : 'Pick a tool first'}</option>
            {currentEvents.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Condition (optional)</span>
          <input
            value={draft.trigger.conditionSummary ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, trigger: { ...d.trigger, conditionSummary: e.target.value } }))}
            placeholder="amount > $100"
            className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12px]"
          />
        </label>
      </aside>

      {/* Center — pipeline canvas */}
      <section className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Pipeline <span className="ml-2 tabular-nums text-[var(--allonce-ink-muted)]">{draft.actions.length}</span>
          </p>
          <button
            type="button"
            onClick={addAction}
            className="rounded-md border border-[var(--allonce-line)] bg-white px-3 py-1 text-[11px] font-medium hover:bg-[var(--allonce-bg-soft)]"
          >
            Add action
          </button>
        </div>

        {/* Trigger pill */}
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-700">Trigger</p>
          {draft.trigger.tool && draft.trigger.event ? (
            <>
              <p className="mt-1 font-mono text-[12.5px] text-emerald-900">
                {draft.trigger.tool}.{draft.trigger.event}
              </p>
              {draft.trigger.conditionSummary && (
                <p className="font-mono text-[10px] text-emerald-700">if: {draft.trigger.conditionSummary}</p>
              )}
            </>
          ) : (
            <p className="mt-1 text-[12px] text-emerald-700/70">Pick a trigger on the left.</p>
          )}
        </div>

        {/* Actions */}
        {draft.actions.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-[var(--allonce-line)] bg-[var(--allonce-bg-soft)]/40 p-6 text-center font-mono text-[11px] text-[var(--allonce-ink-faint)]">
            No actions yet. Click "Add action" to start the chain.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {draft.actions.map((a, i) => {
              const tool = catalog.actions[a.tool] ?? [];
              const action = tool.find((x) => x.name === a.action);
              return (
                <li key={i} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-2 rounded-md border border-[var(--allonce-line)] bg-white px-3 py-2">
                  <span className="font-mono text-[10px] tabular-nums text-[var(--allonce-ink-faint)]">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <select
                    value={a.tool}
                    onChange={(e) => setActionTool(i, e.target.value)}
                    className="rounded border border-[var(--allonce-line)] px-2 py-1 font-mono text-[11px]"
                  >
                    {actionTools.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    value={a.action}
                    onChange={(e) => setActionName(i, e.target.value)}
                    className="rounded border border-[var(--allonce-line)] px-2 py-1 font-mono text-[11px]"
                  >
                    <option value="">— action —</option>
                    {tool.map((x) => (
                      <option key={x.name} value={x.name}>{x.name}{x.cost === 'paid' ? ' · paid' : ''}</option>
                    ))}
                  </select>
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    action?.cost === 'paid'
                      ? 'bg-[var(--allonce-bg-soft)] text-[var(--allonce-ink-muted)]'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {action?.cost ?? '—'}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveAction(i, -1)} disabled={i === 0}
                      className="rounded px-1 font-mono text-[14px] text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)] disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveAction(i, 1)} disabled={i === draft.actions.length - 1}
                      className="rounded px-1 font-mono text-[14px] text-[var(--allonce-ink-muted)] transition hover:text-[var(--allonce-ink)] disabled:opacity-30">↓</button>
                  </span>
                  <button type="button" onClick={() => removeAction(i)}
                    className="rounded px-2 font-mono text-[10px] uppercase tracking-wider text-rose-700 transition hover:underline">
                    remove
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Right — properties + validate + save */}
      <aside className="space-y-4">
        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">Properties</p>
          <label className="mt-3 block">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Refund handler"
              className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12.5px]"
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="One-sentence summary of what this workflow does."
              className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">Cost cap (USD/mo)</span>
            <input
              type="number"
              step={1}
              min={0}
              value={draft.capUsd ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, capUsd: e.target.value === '' ? undefined : Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-[var(--allonce-line)] px-2 py-1.5 text-[12.5px]"
            />
          </label>
        </div>

        <div className="rounded-md border border-[var(--allonce-line)] bg-white p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
            Validation
            <span className="ml-2 tabular-nums text-[var(--allonce-ink-muted)]">
              {errorIssues.length} err · {warnIssues.length} warn
            </span>
          </p>
          {issues.length === 0 ? (
            <p className="mt-2 font-mono text-[11px] text-emerald-700">All checks pass.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {issues.map((i, k) => (
                <li key={k} className={`text-[11.5px] ${i.level === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>
                  <span className="font-mono text-[10px] uppercase">{i.level}</span>{' '}
                  <span className="font-mono text-[10px] text-[var(--allonce-ink-faint)]">{i.field}</span>{' '}
                  {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!publishable || busy !== null}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--allonce-ink)] px-4 text-[12.5px] font-medium text-white disabled:opacity-50"
        >
          {busy === 'save' ? 'Saving…' : existingWorkflowId ? 'Save changes' : 'Save as draft'}
        </button>
      </aside>
    </div>
  );
}
