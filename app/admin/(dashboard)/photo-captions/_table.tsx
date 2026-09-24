"use client";

import { useState, useTransition } from "react";
import { updateImageCaption } from "@/app/lib/goga/actions-photo-captions";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

type Item = {
  id: string;
  projectId: string;
  projectTitle: string;
  thumbUrl: string;
  caption: string;
  captionKa: string;
  captionRu: string;
  altText: string;
};

export function CaptionsTable({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
        <p className="text-[14px] text-[var(--ink-500)]">
          No photos match this filter.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </ul>
  );
}

function Row({ item }: { item: Item }) {
  const toast = useToast();
  const [caption, setCaption] = useState(item.caption);
  const [captionKa, setCaptionKa] = useState(item.captionKa);
  const [captionRu, setCaptionRu] = useState(item.captionRu);
  const [altText, setAltText] = useState(item.altText);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    caption !== item.caption ||
    captionKa !== item.captionKa ||
    captionRu !== item.captionRu ||
    altText !== item.altText;

  function onSave() {
    start(async () => {
      try {
        await updateImageCaption(item.id, {
          caption: caption || null,
          caption_ka: captionKa || null,
          caption_ru: captionRu || null,
          alt_text: altText || null,
        });
        setSavedAt(Date.now());
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Save failed", "error");
      }
    });
  }

  const inputCls =
    "block w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[13px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded-lg bg-slate-100 object-cover"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-400)]">
            {item.projectTitle}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Caption (EN)
              </span>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Alt text
              </span>
              <input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Caption (KA)
              </span>
              <input
                value={captionKa}
                onChange={(e) => setCaptionKa(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Caption (RU)
              </span>
              <input
                value={captionRu}
                onChange={(e) => setCaptionRu(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !dirty}
              className="rounded-full bg-[var(--ao-accent)] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {savedAt && !dirty ? (
              <span className="text-[11px] text-slate-900 font-medium">
                Saved.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
