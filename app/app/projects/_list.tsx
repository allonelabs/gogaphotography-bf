"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/app/_components/Toaster";
import Link from "next/link";
import {
  reorderProjects,
  togglePublish,
  deleteProject,
} from "@/app/lib/goga/actions-projects";

export type ProjectRow = {
  id: string;
  slug: string;
  title_en: string;
  location_en: string | null;
  thumbUrl: string | null;
  published: boolean;
};

export function ProjectsList({ initial }: { initial: ProjectRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>(initial);
  const [, start] = useTransition();
  const dragIdRef = useRef<string | null>(null);

  function onDragStart(id: string, e: React.DragEvent<HTMLLIElement>) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(targetId: string, e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    setRows((cur) => {
      const next = [...cur];
      const sIdx = next.findIndex((x) => x.id === sourceId);
      const tIdx = next.findIndex((x) => x.id === targetId);
      if (sIdx === -1 || tIdx === -1) return cur;
      const [moved] = next.splice(sIdx, 1);
      if (moved) next.splice(tIdx, 0, moved);
      start(async () => {
        await reorderProjects(next.map((x) => x.id));
        router.refresh();
      });
      return next;
    });
  }

  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <li
          key={p.id}
          className="rounded-2xl bg-white ring-1 ring-black/5 transition hover:ring-black/10"
          draggable
          onDragStart={(e) => onDragStart(p.id, e)}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(p.id, e)}
        >
          <div className="grid grid-cols-[64px_1fr] items-center gap-y-2 gap-x-3 px-4 py-3 sm:grid-cols-[24px_64px_1fr_70px_auto_auto_auto]">
            <span
              aria-hidden="true"
              title="Drag to reorder"
              className="hidden select-none text-[16px] text-[var(--ink-300)] cursor-grab active:cursor-grabbing sm:inline"
            >
              ⋮⋮
            </span>

            {p.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbUrl}
                alt=""
                className="h-14 w-14 rounded-lg bg-slate-100 object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                —
              </div>
            )}

            <Link
              href={`/app/projects/${p.id}`}
              className="min-w-0 hover:underline"
            >
              <div className="truncate text-[14px] font-medium text-[var(--ink-900)]">
                {p.title_en}
              </div>
              <div className="truncate text-[12px] text-[var(--ink-500)]">
                {p.location_en ? `${p.location_en} · ` : ""}/{p.slug}
              </div>
            </Link>

            <span
              className={`justify-self-center rounded-full px-2.5 py-0.5 text-center text-[10px] uppercase tracking-[0.14em] ${
                p.published
                  ? "bg-slate-900 text-slate-900 font-medium"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {p.published ? "Live" : "Draft"}
            </span>

            <TogglePublishButton
              id={p.id}
              published={p.published}
              onChange={(published) =>
                setRows((cur) =>
                  cur.map((r) => (r.id === p.id ? { ...r, published } : r)),
                )
              }
            />

            <Link
              href={`/app/projects/${p.id}`}
              className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50"
            >
              Edit
            </Link>

            <DeleteButton
              id={p.id}
              title={p.title_en}
              onDeleted={() =>
                setRows((cur) => cur.filter((r) => r.id !== p.id))
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TogglePublishButton({
  id,
  published,
  onChange,
}: {
  id: string;
  published: boolean;
  onChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50 disabled:opacity-50"
      onClick={() =>
        start(async () => {
          onChange(!published);
          try {
            await togglePublish(id);
            router.refresh();
          } catch {
            onChange(published);
          }
        })
      }
    >
      {pending ? "…" : published ? "Unpublish" : "Publish"}
    </button>
  );
}

function DeleteButton({
  id,
  title,
  onDeleted,
}: {
  id: string;
  title: string;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      onClick={() => {
        if (
          !confirm(
            `Delete "${title}" and all its photos? This cannot be undone.`,
          )
        )
          return;
        start(async () => {
          try {
            await deleteProject(id);
            onDeleted();
            router.refresh();
          } catch (e) {
            toast.show(
              `Delete failed: ${e instanceof Error ? e.message : e}`,
              "error",
            );
          }
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
