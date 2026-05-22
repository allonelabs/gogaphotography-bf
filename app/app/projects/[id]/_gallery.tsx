"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadProjectImage,
  setHeroImage,
  reorderImages,
  updateImageCaption,
  updateImageAlt,
  deleteImage,
} from "@/app/lib/goga/actions-projects";

type Img = {
  id: string;
  imagePath: string;
  url: string;
  caption: string;
  altText: string;
  sortOrder: number;
};

type Uploading = {
  tempId: string;
  filename: string;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
};

export function Gallery({
  projectId,
  heroImagePath,
  initial,
}: {
  projectId: string;
  heroImagePath: string | null;
  initial: Img[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<Img[]>(initial);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [heroPath, setHeroPath] = useState<string | null>(heroImagePath);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragIdRef = useRef<string | null>(null);

  useEffect(() => setHeroPath(heroImagePath), [heroImagePath]);

  const acceptFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      for (const file of list) {
        const tempId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const previewUrl = URL.createObjectURL(file);
        setUploading((u) => [
          ...u,
          { tempId, filename: file.name, previewUrl, status: "uploading" },
        ]);
        try {
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("file", file);
          const { id, imagePath } = await uploadProjectImage(fd);
          setImages((cur) => [
            ...cur,
            {
              id,
              imagePath,
              url: previewUrl,
              caption: "",
              altText: "",
              sortOrder: cur.length,
            },
          ]);
          if (!heroPath) setHeroPath(imagePath);
          setUploading((u) => u.filter((x) => x.tempId !== tempId));
        } catch (e) {
          setUploading((u) =>
            u.map((x) =>
              x.tempId === tempId
                ? {
                    ...x,
                    status: "error",
                    error: e instanceof Error ? e.message : "upload failed",
                  }
                : x,
            ),
          );
        }
      }
      router.refresh();
    },
    [projectId, heroPath, router],
  );

  function onPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      void acceptFiles(e.target.files);
      e.target.value = "";
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) void acceptFiles(e.dataTransfer.files);
  }

  function onRowDragStart(id: string, e: React.DragEvent<HTMLLIElement>) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  }
  function onRowDragOver(e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onRowDrop(targetId: string, e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    setImages((cur) => {
      const next = [...cur];
      const sIdx = next.findIndex((x) => x.id === sourceId);
      const tIdx = next.findIndex((x) => x.id === targetId);
      if (sIdx === -1 || tIdx === -1) return cur;
      const [moved] = next.splice(sIdx, 1);
      next.splice(tIdx, 0, moved!);
      startTransition(async () => {
        await reorderImages(
          projectId,
          next.map((x) => x.id),
        );
        router.refresh();
      });
      return next;
    });
  }

  async function onMakeHero(path: string) {
    await setHeroImage(projectId, path);
    setHeroPath(path);
    router.refresh();
  }

  async function onCaptionBlur(
    imageId: string,
    value: string,
    original: string,
  ) {
    if (value === original) return;
    await updateImageCaption(imageId, value);
  }

  async function onAltBlur(imageId: string, value: string, original: string) {
    if (value === original) return;
    await updateImageAlt(imageId, value);
  }

  async function onDelete(imageId: string, path: string) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    await deleteImage(imageId);
    setImages((cur) => cur.filter((x) => x.id !== imageId));
    if (heroPath === path) setHeroPath(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center gap-1 rounded-2xl border-[1.5px] border-dashed bg-white p-7 text-center transition ${
          dragOver ? "border-[var(--ink-900)] bg-slate-50" : "border-black/20"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onPickerChange}
          className="hidden"
        />
        <strong className="text-[12px] uppercase tracking-[0.18em]">
          Drop photos
        </strong>
        <span className="text-[12px] text-[var(--ink-500)]">
          or click to choose files
        </span>
        <span className="text-[11px] text-[var(--ink-400)]">
          JPEG · PNG · WebP · AVIF · up to 50 MB
        </span>
      </div>

      {uploading.length > 0 ? (
        <ul className="space-y-2">
          {uploading.map((u) => (
            <li
              key={u.tempId}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.previewUrl}
                alt=""
                className="h-12 w-12 rounded object-cover"
              />
              <span className="text-[13px]">{u.filename}</span>
              <span className="ml-auto text-[11px] text-[var(--ink-500)]">
                {u.status === "uploading" ? "uploading…" : `error: ${u.error}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {images.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[var(--ink-400)]">
          No photos yet — drop or pick a few to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {images.map((img) => {
            const isHero = heroPath === img.imagePath;
            return (
              <li
                key={img.id}
                draggable
                onDragStart={(e) => onRowDragStart(img.id, e)}
                onDragOver={onRowDragOver}
                onDrop={(e) => onRowDrop(img.id, e)}
                className={`grid grid-cols-[24px_96px_1fr_auto] items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 transition ${
                  isHero ? "ring-amber-300/60" : "ring-black/5"
                }`}
              >
                <span
                  aria-hidden
                  className="cursor-grab select-none text-[16px] text-[var(--ink-300)] active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-[72px] w-24 rounded-lg bg-slate-100 object-cover"
                />
                <div className="space-y-1.5">
                  <input
                    defaultValue={img.caption}
                    placeholder="Caption (shown on the public site)"
                    onBlur={(e) =>
                      void onCaptionBlur(img.id, e.target.value, img.caption)
                    }
                    className="block w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--ink-900)]"
                  />
                  <input
                    defaultValue={img.altText}
                    placeholder="Alt text (screen readers + image search)"
                    onBlur={(e) =>
                      void onAltBlur(img.id, e.target.value, img.altText)
                    }
                    className="block w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--ink-900)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isHero ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-800">
                      ⭐ Hero
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onMakeHero(img.imagePath)}
                      className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
                    >
                      Make hero
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onDelete(img.id, img.imagePath)}
                    className="rounded-full border border-rose-300 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
