'use client';

// ════════════════════════════════════════════════════════════════════════════
// InlineEditor — click-to-edit any text element. The Wave 3 primitive that
// makes surgical editing universal: every visible text run is its own edit
// target. Click → inline editor. Save → POST to /api/edit/apply (the universal
// edit endpoint, ADR-016/041c).
//
// Operator-felt pattern: the click target IS the value. No "open editor"
// modal step. Click → type → press Enter or blur → saved. Esc to cancel.
//
// Permissions/cost-confirm: ADR-102 hooks (cost preview before regenerate)
// land via the optional `onRegenerate` prop. When the operator types a new
// literal value (manual edit) cost is zero. When they press Cmd-R or click
// the regenerate icon, AI cost preview surfaces.
// ════════════════════════════════════════════════════════════════════════════

import {
  type ReactElement,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Props {
  /** Current value. */
  value: string;
  /** Called on save (Enter/blur if value changed). Operator-typed text only. */
  onSave: (next: string) => Promise<void> | void;
  /** Optional: called when operator presses Cmd-R or clicks the regen icon.
   *  When omitted the regen affordance is hidden. */
  onRegenerate?: () => Promise<void> | void;
  /** Visual style: 'text' (default) renders inline as a span; 'block' takes
   *  full width and renders as a paragraph. */
  variant?: 'text' | 'block';
  /** Placeholder when empty. */
  placeholder?: string;
  /** Read-only: shows value but disables editing. */
  readOnly?: boolean;
  /** Multiline: textarea instead of input. */
  multiline?: boolean;
  /** Pin state — when locked, hovering shows a lock icon. */
  locked?: boolean;
  /** Click the lock icon to unlock; null when not editable. */
  onUnlock?: () => void;
  className?: string;
}

export function InlineEditor({
  value,
  onSave,
  onRegenerate,
  variant = 'text',
  placeholder,
  readOnly,
  multiline,
  locked,
  onUnlock,
  className,
}: Props): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function startEditing() {
    if (readOnly || locked) return;
    setDraft(value);
    setEditing(true);
  }

  async function commit() {
    if (saving) return;
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r' && onRegenerate) {
      e.preventDefault();
      onRegenerate();
    }
  }

  const baseInline = 'rounded-[var(--radius-sm,4px)] -mx-1 -my-0.5 px-1 py-0.5';
  const baseBlock = 'block w-full rounded-[var(--radius-md,8px)] px-3 py-2';
  const wrapperBase = variant === 'block' ? baseBlock : baseInline;
  const editingBg = 'bg-white ring-1 ring-[var(--ao-accent,#0047FF)]/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]';
  const idleHover = !readOnly && !locked && hover ? 'bg-white' : '';

  if (editing) {
    if (multiline) {
      return (
        <div className={`${wrapperBase} ${editingBg} ${className ?? ''}`}>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
            placeholder={placeholder}
            rows={3}
            className="block w-full resize-none bg-transparent text-inherit outline-none"
          />
        </div>
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={placeholder}
        className={`${wrapperBase} ${editingBg} bg-transparent text-inherit outline-none ${className ?? ''}`}
      />
    );
  }

  // Idle state — hover surfaces the affordance without shifting layout
  return (
    <span
      className={`group relative inline-block cursor-text transition ${wrapperBase} ${idleHover} ${className ?? ''}`}
      onClick={startEditing}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={readOnly ? undefined : locked ? 'Pinned — click lock to unlock' : 'Click to edit'}
    >
      {value || (
        <span className="text-[var(--ink-300)] italic">{placeholder ?? '(empty)'}</span>
      )}

      {locked && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnlock?.(); }}
          aria-label="Unlock element"
          className="ml-1 inline-block align-baseline opacity-50 hover:opacity-100 transition"
        >
          <LockGlyph />
        </button>
      )}

      {!readOnly && !locked && hover && onRegenerate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          aria-label="Regenerate with AI (Cmd-R)"
          title="Regenerate with AI · ⌘R"
          className="ml-1 inline-block align-baseline text-[var(--ao-accent,#0047FF)] opacity-60 hover:opacity-100 transition"
        >
          <RegenGlyph />
        </button>
      )}

      {saving && (
        <span className="ml-1 inline-block align-baseline text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-500)]">
          saving…
        </span>
      )}
    </span>
  );
}

function LockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'baseline' }}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function RegenGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'baseline' }}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
