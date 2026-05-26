"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setLeadStage } from "@/app/lib/goga/actions";
import { STAGE_TONE, type LeadStage } from "@/app/lib/goga/leads";
import { useToast } from "@/app/app/_components/Toaster";

export type CardData = {
  id: string;
  name: string;
  email: string;
  snippet: string;
  source: string;
  stage: LeadStage;
  createdAt: string | null;
  shootDate: string | null;
};

interface Props {
  stages: LeadStage[];
  labels: Record<LeadStage, string>;
  initial: CardData[];
}

export function Kanban({ stages, labels, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [cards, setCards] = useState<CardData[]>(initial);
  const [, start] = useTransition();
  const dragRef = useRef<{ id: string; fromStage: LeadStage } | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);

  const columns = useMemo(() => {
    const m = new Map<LeadStage, CardData[]>(stages.map((s) => [s, []]));
    for (const c of cards) m.get(c.stage)?.push(c);
    return m;
  }, [stages, cards]);

  function onDragStart(card: CardData, e: React.DragEvent) {
    dragRef.current = { id: card.id, fromStage: card.stage };
    e.dataTransfer.effectAllowed = "move";
  }
  function onColOver(stage: LeadStage, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overStage !== stage) setOverStage(stage);
  }
  function onColDrop(stage: LeadStage, e: React.DragEvent) {
    e.preventDefault();
    setOverStage(null);
    const cur = dragRef.current;
    dragRef.current = null;
    if (!cur || cur.fromStage === stage) return;
    setCards((c) => c.map((x) => (x.id === cur.id ? { ...x, stage } : x)));
    start(async () => {
      try {
        await setLeadStage(cur.id, stage);
        router.refresh();
      } catch (err) {
        toast.show(
          `Move failed: ${err instanceof Error ? err.message : err}`,
          "error",
        );
        setCards((c) =>
          c.map((x) => (x.id === cur.id ? { ...x, stage: cur.fromStage } : x)),
        );
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 overflow-x-auto pb-4 lg:grid-cols-4 xl:grid-cols-8">
      {stages.map((stage) => {
        const list = columns.get(stage) ?? [];
        const isLost = stage === "lost";
        return (
          <div
            key={stage}
            className={`min-h-[320px] rounded-2xl border bg-white p-2 transition ${
              overStage === stage
                ? "border-[var(--ink-900)] bg-slate-50"
                : "border-black/5"
            } ${isLost ? "border-rose-200/50" : ""}`}
            onDragOver={(e) => onColOver(stage, e)}
            onDragLeave={() => setOverStage(null)}
            onDrop={(e) => onColDrop(stage, e)}
          >
            <header className="flex items-baseline justify-between px-2 pb-2 pt-1">
              <span
                className={`text-[10px] font-medium uppercase tracking-[0.22em] ${
                  isLost ? "text-rose-700/70" : "text-[var(--ink-900)]"
                }`}
              >
                {labels[stage]}
              </span>
              <span className="text-[10px] tabular-nums text-[var(--ink-500)]">
                {list.length}
              </span>
            </header>
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <div className="px-2 py-6 text-center text-[11px] text-[var(--ink-300)]">
                  —
                </div>
              ) : (
                list.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/leads/${c.id}`}
                    draggable
                    onDragStart={(e) => onDragStart(c, e)}
                    className="block cursor-grab rounded-xl bg-slate-50 px-3 py-2.5 transition hover:-translate-y-px hover:bg-white hover:shadow-[var(--shadow-sm,0_2px_4px_rgba(0,0,0,0.04))] active:cursor-grabbing"
                  >
                    <div className="text-[13px] font-medium text-[var(--ink-900)]">
                      {c.name}
                    </div>
                    {c.email ? (
                      <div className="truncate text-[11px] text-[var(--ink-500)]">
                        {c.email}
                      </div>
                    ) : null}
                    {c.snippet ? (
                      <p className="mt-1.5 line-clamp-3 text-[12px] leading-snug text-[var(--ink-700)]">
                        {c.snippet}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${STAGE_TONE[c.stage]}`}
                      >
                        {c.source}
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--ink-500)]">
                        {c.shootDate
                          ? new Date(c.shootDate).toLocaleDateString()
                          : c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString()
                            : ""}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
