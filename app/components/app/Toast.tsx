'use client';

import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  kind?: 'info' | 'ok' | 'warn' | 'err';
  action?: { label: string; onClick: () => void };
}

const EVENT = 'allonce.toast';

export function toast(
  text: string,
  kind: ToastMessage['kind'] = 'info',
  action?: ToastMessage['action']
) {
  if (typeof window === 'undefined') return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { id, text, kind, action } })
  );
}

export function comingSoon(what: string) {
  toast(`${what} · ships next round`, 'info');
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<ToastMessage>;
      const msg = ce.detail;
      setItems((prev) => [...prev, msg]);
      setTimeout(() => {
        setItems((prev) => prev.filter((m) => m.id !== msg.id));
      }, 4000);
    }
    window.addEventListener(EVENT, onToast as EventListener);
    return () => window.removeEventListener(EVENT, onToast as EventListener);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
      {items.map((m) => (
        <div
          key={m.id}
          className="pointer-events-auto flex items-center gap-3 rounded-full bg-[var(--ink-900)] px-4 py-2.5 text-[13px] text-white shadow-[var(--shadow-lg)] animate-slide-down"
        >
          <KindDot kind={m.kind} />
          <span>{m.text}</span>
          {m.action && (
            <button
              type="button"
              onClick={m.action.onClick}
              className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[11.5px] font-medium transition hover:bg-white"
            >
              {m.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function KindDot({ kind = 'info' }: { kind?: ToastMessage['kind'] }) {
  const color =
    kind === 'ok'
      ? 'var(--allonce-ok)'
      : kind === 'warn'
      ? 'var(--allonce-warn)'
      : kind === 'err'
      ? 'var(--allonce-err)'
      : '#ffffff99';
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
