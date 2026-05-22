// ════════════════════════════════════════════════════════════════════════════
// RunRails — the morning triage surface for /app/business/[id].
//
// Three rails: Today (what happened) · Attention (what needs you) · Approve
// (agent proposals — currently empty until U5.b ships proposal source).
//
// Wave 1 Day 3-5 of operator-ui-ia.md. Reads from existing loaders:
// SpawnDetail.cells + autonomy snapshot + outbox state. Pure-server.
// Operator-vocabulary throughout (no cellRef / fingerprint / source jargon
// in the surface text — those are translated).
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Card, Eyebrow } from '../ui';
import { cellRefToOperatorSentence } from '@/app/lib/operator-vocabulary';
import type { SpawnDetail } from '@/app/lib/spawn-loader';

interface TodayItem {
  /** Operator-language summary, e.g. "Stripe payment received from Acme Corp" */
  text: string;
  /** Where to drill in. Either a deep-link or null. */
  href: string | null;
  /** Display time, already formatted (e.g. "12m ago", "Today 14:32") */
  when: string;
  /** Small icon hint by category. */
  kind: 'fired' | 'shipped' | 'received' | 'edited' | 'composed';
}

interface AttentionItem {
  text: string;
  href: string | null;
  /** Severity: 'urgent' (red dot), 'review' (amber dot), 'info' (no dot) */
  severity: 'urgent' | 'review' | 'info';
  hint?: string;
}

interface ApproveItem {
  text: string;
  href: string | null;
  /** Confidence the agent is in its proposal (0..1). */
  confidence?: number;
}

interface Props {
  businessId: string;
  detail: SpawnDetail | null;
}

export function RunRails({ businessId, detail }: Props) {
  const today = buildTodayItems(detail);
  const attention = buildAttentionItems(businessId, detail);
  const approve = buildApproveItems();

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Rail
        title="Today"
        sub="What happened in the last 24 hours"
        emptyText="Nothing yet today."
        emptyHint="Bridges fire as activity comes in. New cells, payments, and sends will land here."
        emptyVariant="today"
        items={today}
        renderItem={renderTodayItem}
      />
      <Rail
        title="Attention"
        sub="Things that need a look from you"
        emptyText="All clear."
        emptyHint="Validation failures, placeholder content, or low matrix health will surface here."
        emptyVariant="attention"
        items={attention}
        renderItem={renderAttentionItem}
      />
      <Rail
        title="Approve"
        sub="Agent proposals waiting on your call"
        emptyText="No proposals waiting."
        emptyHint="The agent will surface ideas as patterns emerge — copy tweaks, ad starts, price tests."
        emptyVariant="approve"
        items={approve}
        renderItem={renderApproveItem}
      />
    </div>
  );
}

// ── Rail shell ──────────────────────────────────────────────────────────

type EmptyVariant = 'today' | 'attention' | 'approve';

interface RailProps<T> {
  title: string;
  sub: string;
  emptyText: string;
  emptyHint?: string;
  emptyVariant?: EmptyVariant;
  items: ReadonlyArray<T>;
  renderItem: (item: T, idx: number) => React.ReactNode;
}

function Rail<T>({ title, sub, emptyText, emptyHint, emptyVariant, items, renderItem }: RailProps<T>) {
  return (
    <Card className="!p-0">
      <div className="border-b border-[var(--bg-surface-alt)] px-5 py-4">
        <Eyebrow>{title}</Eyebrow>
        <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">{sub}</p>
      </div>
      {items.length === 0 ? (
        <EmptyRail variant={emptyVariant ?? 'today'} text={emptyText} hint={emptyHint} />
      ) : (
        <ul className="divide-y divide-[var(--bg-surface-alt)]">
          {items.map((item, idx) => (
            <li key={idx} className="px-5 py-3.5">
              {renderItem(item, idx)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Empty state — soft illustration + ghost rows that hint at the row shape
// the rail will fill once data exists.  Replaces the bare centered text
// reported 2026-05-14 ("these cards are bad they are just text").
function EmptyRail({ variant, text, hint }: { variant: EmptyVariant; text: string; hint?: string }) {
  const palette = variant === 'today'
    ? { ring: 'border-[var(--ao-accent,#0047FF)]/35', icon: 'text-[var(--ao-accent,#0047FF)]', tint: 'bg-[var(--ao-accent,#0047FF)]/8' }
    : variant === 'attention'
    ? { ring: 'border-[var(--allonce-ok)]/40', icon: 'text-[var(--allonce-ok)]', tint: 'bg-[var(--allonce-ok)]/8' }
    : { ring: 'border-amber-400/50', icon: 'text-amber-500', tint: 'bg-amber-100/40' };

  return (
    <div className="px-5 pb-6 pt-8 text-center">
      <div className={`relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${palette.ring} ${palette.tint}`}>
        <span className={`absolute inset-0 rounded-full ${palette.tint} opacity-60 [animation:rail-pulse_3s_ease-in-out_infinite]`} />
        <span className={`relative ${palette.icon}`}>{variantIcon(variant)}</span>
      </div>
      <p className="text-[14px] font-medium text-[var(--ink-900)]">{text}</p>
      {hint && (
        <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-snug text-[var(--ink-500)]">{hint}</p>
      )}
      <ul className="mt-5 space-y-2 px-3 text-left" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border border-dashed border-[var(--allonce-line)] bg-[var(--bg-surface-alt)]/40 px-3 py-2">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ink-300)]" style={{ opacity: 0.5 - i * 0.12 }} />
            <span
              className="h-1.5 rounded-full bg-[var(--ink-300)]"
              style={{ width: ['72%', '58%', '44%'][i], opacity: 0.45 - i * 0.1 }}
            />
          </li>
        ))}
      </ul>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rail-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          span[class*="rail-pulse"] { animation: none; }
        }
      ` }} />
    </div>
  );
}

function variantIcon(variant: EmptyVariant) {
  if (variant === 'today') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (variant === 'attention') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.6 5 5 1.6-5 1.6L12 16l-1.6-4.8-5-1.6 5-1.6z" />
    </svg>
  );
}

// ── Today rail ──────────────────────────────────────────────────────────

function buildTodayItems(detail: SpawnDetail | null): TodayItem[] {
  if (!detail?.cells) return [];

  // Use cells.recent — already capped at 6, sorted newest-first by loader.
  // Translate cellRef + source into operator-language sentences.
  return detail.cells.recent.slice(0, 8).map((c) => ({
    text: cellRefToOperatorSentence(c.cellRef, c.source),
    href: c.cellRef
      ? `/app/business/${detail.id}/cells/${encodeURIComponent(c.cellRef)}`
      : null,
    when: formatRelativeTime(c.composedAt),
    kind:
      c.source === 'manual'
        ? 'edited'
        : c.source === 'fallback'
        ? 'composed'
        : 'composed',
  }));
}

function renderTodayItem(item: TodayItem) {
  const inner = (
    <div className="flex items-start gap-3">
      <KindDot kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-[var(--ink-900)]">{item.text}</p>
        <p className="mt-0.5 text-[11px] text-[var(--ink-500)]">{item.when}</p>
      </div>
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block transition hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ── Attention rail ──────────────────────────────────────────────────────

function buildAttentionItems(businessId: string, detail: SpawnDetail | null): AttentionItem[] {
  const out: AttentionItem[] = [];
  if (!detail) return out;

  // 1. Validate-failed cells (urgent — output failed schema check)
  const validateFailed = detail.cells?.bySource['validate-failed'] ?? 0;
  if (validateFailed > 0) {
    out.push({
      text: `${validateFailed} ${validateFailed === 1 ? 'item' : 'items'} need review — generation didn't pass validation`,
      href: `/app/business/${businessId}/cells?filter=validate-failed`,
      severity: 'urgent',
      hint: 'Open the affected items and either pin the previous version or regenerate',
    });
  }

  // 2. Fallback cells above 5% (placeholder content shipped)
  const total = detail.cells?.total ?? 0;
  const fallback = detail.cells?.bySource['fallback'] ?? 0;
  const fallbackPct = total > 0 ? (fallback / total) * 100 : 0;
  if (fallbackPct > 5) {
    out.push({
      text: `${Math.round(fallbackPct)}% of content is placeholder — likely missing API key or the brief was thin`,
      href: `/app/business/${businessId}/cells?filter=fallback`,
      severity: 'review',
      hint: 'Check the spawn brief and re-run with the API key set',
    });
  }

  // 3. Improvement proposals waiting
  const proposalCount = detail.improvements?.proposals?.length ?? 0;
  if (proposalCount > 0) {
    out.push({
      text: `${proposalCount} improvement ${proposalCount === 1 ? 'suggestion is' : 'suggestions are'} waiting`,
      href: `/app/business/${businessId}/proposals`,
      severity: 'review',
    });
  }

  // 4. Matrix-health below 80
  const matrixHealth = detail.operatorView?.summary?.matrixHealth;
  if (typeof matrixHealth === 'number' && matrixHealth < 80) {
    out.push({
      text: `Matrix health is ${matrixHealth}/100 — some connections aren't firing as expected`,
      href: `/app/business/${businessId}/matrix`,
      severity: matrixHealth < 60 ? 'urgent' : 'review',
    });
  }

  return out;
}

function renderAttentionItem(item: AttentionItem) {
  const inner = (
    <div className="flex items-start gap-3">
      <SeverityDot severity={item.severity} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-[var(--ink-900)]">{item.text}</p>
        {item.hint && <p className="mt-0.5 text-[11.5px] text-[var(--ink-500)]">{item.hint}</p>}
      </div>
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block transition hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ── Approve rail ────────────────────────────────────────────────────────

function buildApproveItems(): ApproveItem[] {
  // Empty until U5.b ships the agent-proposal generator. Zero-state copy
  // explains what will appear here.
  return [];
}

function renderApproveItem(item: ApproveItem) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--allonce-ok)]" />
      <p className="text-[13.5px] leading-snug text-[var(--ink-900)]">{item.text}</p>
    </div>
  );
}

// ── Operator-vocabulary translation ─────────────────────────────────────
// (cellRefToOperatorSentence lives in app/lib/operator-vocabulary.ts now —
// shared with Timeline + Bridges + Proposals).

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  try {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const diff = Date.now() - t;
    if (diff < 0) return 'just now';
    const m = Math.round(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  } catch {
    return '';
  }
}

// ── Decoration ──────────────────────────────────────────────────────────

function KindDot({ kind }: { kind: TodayItem['kind'] }) {
  const cls =
    kind === 'edited' ? 'bg-[var(--ink-900)]' :
    kind === 'shipped' ? 'bg-[var(--allonce-ok)]' :
    kind === 'received' ? 'bg-[var(--allonce-ok)]' :
    kind === 'fired' ? 'bg-[var(--ao-accent,#0047FF)]' :
    'bg-[var(--ink-300)]';
  return <span className={`mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}

function SeverityDot({ severity }: { severity: AttentionItem['severity'] }) {
  const cls =
    severity === 'urgent' ? 'bg-[var(--allonce-err)]' :
    severity === 'review' ? 'bg-[var(--allonce-warn)]' :
    'bg-[var(--ink-300)]';
  return <span className={`mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}
