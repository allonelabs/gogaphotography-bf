'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  href?: string;
  kind: 'proposal' | 'deploy' | 'firing' | 'billing' | 'team' | 'system';
}

// Notifications come from a real ledger eventually. Until then: start empty
// so the bell doesn't lie about an unread count and the panel doesn't show
// invented volans/Studio-MG/Kote-Japaridze rows. When /api/notifications
// lands we'll fetch on mount; for now the empty array is the honest default.
const INITIAL: NotificationItem[] = [];

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(INITIAL);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => i.unread).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-900)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--allonce-err)] px-1 text-[9px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[380px] overflow-hidden rounded-[var(--radius-lg)] border border-black/8 bg-[var(--bg-surface)] shadow-[0_24px_56px_-12px_rgba(0,0,0,0.18),0_4px_12px_-2px_rgba(0,0,0,0.08)] ring-1 ring-black/5 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-[var(--allonce-line-soft)] px-4 py-3">
            <p className="text-[14px] font-semibold text-[var(--ink-900)]">Notifications</p>
            <button
              type="button"
              onClick={() => setItems((it) => it.map((x) => ({ ...x, unread: false })))}
              className="text-[12px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] text-[var(--ink-900)]">No notifications yet</p>
                <p className="mt-1 text-[11.5px] text-[var(--ink-500)]">
                  We'll surface deploys, proposals, and billing alerts here when they happen.
                </p>
              </div>
            ) : (
              items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onClick={() => {
                    setItems((it) => it.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>

          <div className="border-t border-[var(--allonce-line-soft)] bg-[var(--bg-surface-alt)] px-4 py-2 text-[11.5px] text-[var(--ink-500)]">
            {items.length} total · {unread} unread
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onClick }: { n: NotificationItem; onClick: () => void }) {
  const dot =
    n.kind === 'proposal'
      ? 'bg-[var(--ink-900)]'
      : n.kind === 'deploy'
      ? 'bg-[var(--allonce-ok)]'
      : n.kind === 'firing'
      ? 'bg-[var(--allonce-warn)]'
      : n.kind === 'billing'
      ? 'bg-[var(--allonce-err)]'
      : 'bg-[var(--ink-400)]';

  const content = (
    <div className={`group flex gap-3 px-4 py-3 transition hover:bg-[var(--bg-surface-alt)] ${n.unread ? '' : 'opacity-60'}`}>
      <div className="mt-1 flex-shrink-0">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-[var(--ink-900)]">
          {n.title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-[var(--ink-500)]">
          {n.body}
        </p>
        <p className="mt-1 text-[11px] text-[var(--ink-400)]">{n.at}</p>
      </div>
    </div>
  );

  return n.href ? (
    <Link href={n.href} onClick={onClick} className="block border-b border-[var(--allonce-line-soft)] last:border-b-0">
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="block w-full border-b border-[var(--allonce-line-soft)] last:border-b-0 text-left">
      {content}
    </button>
  );
}
