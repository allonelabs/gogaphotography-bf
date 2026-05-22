'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { toast, comingSoon } from './Toast';

interface BaseProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
  title?: string;
  disabled?: boolean;
}

// Serializable-action button. Server components use this by passing a string
// `action` prop; the client component parses it.
// Supported actions:
//   "toast:Text"              → toast('Text')
//   "toast:Text:ok"           → toast('Text', 'ok')
//   "soon:Thing"              → toast('Thing · ships next round')
//   "download:filename"       → triggers a fake download toast
//   "copy:value"              → copies to clipboard
//   "confirm:Prompt:Toast"    → confirm() then toast
//   ""                        → default comingSoon(children text)
interface ActionButtonProps extends BaseProps {
  action?: string;
  href?: string;
}

export function ActionButton({
  children,
  variant = 'ghost',
  className,
  title,
  disabled,
  action,
  href,
}: ActionButtonProps) {
  const cls = (variant === 'primary' ? 'btn-primary' : 'btn-ghost') + (className ? ' ' + className : '');

  if (href) {
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }

  function run() {
    if (disabled) return;
    const label = typeof children === 'string' ? children : 'Action';
    if (!action) {
      comingSoon(label);
      return;
    }
    const [kind, ...rest] = action.split(':');
    const payload = rest.join(':');
    switch (kind) {
      case 'toast': {
        const [text, tone] = payload.split(':');
        toast(text || label, (tone as 'ok' | 'warn' | 'err' | 'info') || 'info');
        break;
      }
      case 'soon': {
        comingSoon(payload || label);
        break;
      }
      case 'download': {
        toast(`Downloading ${payload || label}…`, 'ok');
        break;
      }
      case 'copy': {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(payload).then(
            () => toast('Copied to clipboard', 'ok'),
            () => toast('Copy failed', 'err')
          );
        }
        break;
      }
      case 'confirm': {
        const [prompt, afterToast] = payload.split(':');
        if (window.confirm(prompt || 'Are you sure?')) {
          toast(afterToast || 'Done', 'ok');
        }
        break;
      }
      default:
        comingSoon(label);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      title={title}
      className={cls + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
    >
      {children}
    </button>
  );
}

// ── TextAction: small inline text button (no pill styling) ──────────
interface TextActionProps extends BaseProps {
  action?: string;
  href?: string;
}

export function TextAction({
  children,
  action,
  href,
  className = '',
  title,
  disabled,
}: TextActionProps) {
  const cls = `text-[12.5px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)] ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }

  function run() {
    if (disabled) return;
    const label = typeof children === 'string' ? children : 'Action';
    if (!action) { comingSoon(label); return; }
    const [kind, ...rest] = action.split(':');
    const payload = rest.join(':');
    if (kind === 'toast') {
      const [text, tone] = payload.split(':');
      toast(text || label, (tone as 'ok' | 'warn' | 'err' | 'info') || 'info');
    } else if (kind === 'soon') {
      comingSoon(payload || label);
    } else {
      comingSoon(label);
    }
  }

  return (
    <button type="button" onClick={run} disabled={disabled} title={title} className={cls}>
      {children}
    </button>
  );
}
