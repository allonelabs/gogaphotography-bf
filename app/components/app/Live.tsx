'use client';

// Live simulation primitives — animate on a timer to feel alive,
// independent of any backend. Deterministic on first paint, animated after mount.

import { useEffect, useRef, useState } from 'react';

// ── LivePulse ────────────────────────────────────────────────────────────
export function LivePulse({
  size = 8,
  color = 'var(--allonce-ok)',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ backgroundColor: color, opacity: 0.4 }}
      />
    </span>
  );
}

// ── LiveCounter ──────────────────────────────────────────────────────────
// Counts up from 0 to `to` over `durationMs` on mount.
// If `tick` is provided, continues incrementing by +tick every `tickMs`.
export function LiveCounter({
  to,
  durationMs = 1200,
  tickMs,
  tick,
  prefix = '',
  suffix = '',
  format = 'int',
  decimals = 1,
  className = '',
}: {
  to: number;
  durationMs?: number;
  tickMs?: number;
  tick?: number;
  prefix?: string;
  suffix?: string;
  format?: 'int' | 'decimal' | 'percent' | 'currency';
  decimals?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function step(t: number) {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else setValue(to);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, durationMs]);

  useEffect(() => {
    if (tickMs === undefined || tick === undefined) return;
    const id = setInterval(() => setValue((v) => v + tick), tickMs);
    return () => clearInterval(id);
  }, [tickMs, tick]);

  let shown: string;
  if (format === 'percent') shown = `${value.toFixed(decimals)}%`;
  else if (format === 'decimal') shown = value.toFixed(decimals);
  else if (format === 'currency') shown = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  else shown = Math.round(value).toLocaleString();
  return <span className={`tnum ${className}`}>{prefix}{shown}{suffix}</span>;
}

// ── LiveUptimeBars ───────────────────────────────────────────────────────
// Scrolling uptime chart. Every `intervalMs`, adds a new bar on the right
// and drops the oldest. Occasional warn/err drops mimic real uptime monitoring.
export function LiveUptimeBars({
  count = 60,
  intervalMs = 1200,
  warnChance = 0.04,
  errChance = 0.005,
  className = '',
}: {
  count?: number;
  intervalMs?: number;
  warnChance?: number;
  errChance?: number;
  className?: string;
}) {
  // Deterministic initial pattern to avoid SSR mismatch
  const initial = Array.from({ length: count }, (_, i) => {
    const seed = (i * 37 + 13) % 100;
    if (seed < 3) return 'warn';
    if (seed < 1) return 'err';
    return 'ok';
  });
  const [bars, setBars] = useState<string[]>(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      const r = Math.random();
      const next = r < errChance ? 'err' : r < warnChance + errChance ? 'warn' : 'ok';
      setBars((prev) => [...prev.slice(1), next]);
    }, intervalMs);
    return () => clearInterval(id);
  }, [mounted, intervalMs, warnChance, errChance]);

  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {bars.map((b, i) => {
        const h = b === 'err' ? '18%' : b === 'warn' ? '38%' : '100%';
        const c =
          b === 'err'
            ? 'var(--allonce-err)'
            : b === 'warn'
            ? 'var(--allonce-warn)'
            : 'var(--allonce-ok)';
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-500"
            style={{
              height: h,
              backgroundColor: c,
              opacity: i === bars.length - 1 ? 1 : 0.85,
              transform: i === bars.length - 1 ? 'scaleY(1.05)' : 'scaleY(1)',
              transformOrigin: 'bottom',
            }}
          />
        );
      })}
    </div>
  );
}

// ── LiveActivityFeed ─────────────────────────────────────────────────────
// Renders items with new ones slide-in on a timer.
export interface LiveFeedItem {
  id: string;
  text: string;
  at: string;
  kind?: string;
}

export function LiveActivityFeed({
  initial,
  more,
  intervalMs = 4500,
  max = 8,
  render,
  className = '',
}: {
  initial: LiveFeedItem[];
  more: LiveFeedItem[];
  intervalMs?: number;
  max?: number;
  render: (item: LiveFeedItem, index: number, isNew: boolean) => React.ReactNode;
  className?: string;
}) {
  const [items, setItems] = useState<LiveFeedItem[]>(initial);
  const [newestId, setNewestId] = useState<string | null>(null);
  const moreRef = useRef(more);
  const iRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const pool = moreRef.current;
      if (pool.length === 0) return;
      const next = pool[iRef.current % pool.length]!;
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newItem: LiveFeedItem = {
        ...next,
        id: `${next.id}-${Date.now()}`,
        at: stamp,
      };
      setItems((prev) => [newItem, ...prev].slice(0, max));
      setNewestId(newItem.id);
      iRef.current++;
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, max]);

  return (
    <div className={className}>
      {items.map((it, i) => (
        <div
          key={it.id}
          className={`transition-all duration-500 ${it.id === newestId ? 'animate-slide-down' : ''}`}
        >
          {render(it, i, it.id === newestId)}
        </div>
      ))}
    </div>
  );
}

// ── LiveRevenueBars ──────────────────────────────────────────────────────
// Static-value bars that animate height from 0 on mount, then gently pulse
// the last bar.
export function LiveRevenueBars({
  values,
  maxHint,
  className = '',
}: {
  values: number[];
  maxHint?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const max = maxHint ?? Math.max(...values);
  return (
    <div className={`flex items-end gap-[3px] ${className}`}>
      {values.map((v, i) => {
        const pct = (v / max) * 90 + 10;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[var(--ink-900)] transition-all duration-[800ms]"
            style={{
              height: mounted ? `${pct}%` : '0%',
              opacity: 0.25 + (i / values.length) * 0.75,
              transitionDelay: `${i * 18}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── LiveSparkline ───────────────────────────────────────────────────────
export function LiveSparkline({
  values,
  color = 'var(--ink-900)',
  width = 100,
  height = 24,
  className = '',
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`).join(' ');

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
