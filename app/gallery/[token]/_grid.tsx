"use client";

import { useState } from "react";

type Item = {
  id: string;
  url: string;
  caption: string;
  favorited: boolean;
};

export function GalleryGrid({
  token,
  items,
  downloadsEnabled,
}: {
  token: string;
  items: Item[];
  downloadsEnabled: boolean;
}) {
  const [favs, setFavs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.favorited])),
  );
  const [viewer, setViewer] = useState<number | null>(null);

  async function toggleFavorite(imageId: string, next: boolean) {
    setFavs((m) => ({ ...m, [imageId]: next }));
    try {
      const res = await fetch(`/api/gallery/${token}/favorite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageId, favorite: next }),
      });
      if (!res.ok) setFavs((m) => ({ ...m, [imageId]: !next }));
    } catch {
      setFavs((m) => ({ ...m, [imageId]: !next }));
    }
  }

  const favCount = Object.values(favs).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
        <span>★ {favCount} favorited</span>
        {downloadsEnabled ? (
          <span>Click to view · arrow to download</span>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((img, idx) => (
          <li
            key={img.id}
            className="group relative overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: "4 / 3" }}
          >
            <button
              type="button"
              onClick={() => setViewer(idx)}
              aria-label={`View photo ${idx + 1}`}
              className="absolute inset-0 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption || `Photo ${idx + 1}`}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            </button>
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => toggleFavorite(img.id, !favs[img.id])}
                aria-pressed={!!favs[img.id]}
                aria-label="Mark as favorite"
                className={`grid h-8 w-8 place-items-center rounded-full text-[17px] backdrop-blur transition ${
                  favs[img.id]
                    ? "bg-amber-400 text-amber-900 hover:bg-amber-300"
                    : "bg-black/55 text-white hover:bg-black/80"
                }`}
                style={favs[img.id] ? { opacity: 1 } : undefined}
              >
                {favs[img.id] ? "★" : "☆"}
              </button>
              {downloadsEnabled ? (
                <a
                  href={`/api/gallery/${token}/download/${img.id}`}
                  aria-label="Download photo"
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/80"
                >
                  ↓
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {viewer !== null && items[viewer] ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/92 p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[viewer].url}
            alt={items[viewer].caption || ""}
            className="max-h-[90vh] max-w-full object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewer(null);
            }}
            aria-label="Close viewer"
            className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-white/20"
          >
            ×
          </button>
          {viewer > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewer(viewer - 1);
              }}
              aria-label="Previous"
              className="absolute left-6 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl text-white transition hover:bg-white/20"
            >
              ‹
            </button>
          ) : null}
          {viewer < items.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewer(viewer + 1);
              }}
              aria-label="Next"
              className="absolute right-6 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl text-white transition hover:bg-white/20"
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
