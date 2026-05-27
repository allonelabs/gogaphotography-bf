"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadSurfaceImage,
  clearSurfaceImage,
} from "@/app/lib/goga/actions-media";
import { useToast } from "./Toaster";

type SurfaceKey =
  | "hero.hero_image"
  | "hero.portrait_image"
  | "package.hero_image"
  | "service.hero_image"
  | "page.og_image";

interface ImageUploaderProps {
  surface: SurfaceKey;
  rowId?: string;
  label: string;
  hint?: string;
  currentPath: string | null;
  /** Aspect ratio for the preview frame. "16/9" by default. */
  aspect?: string;
}

function publicUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!base) return null;
  return `${base}/storage/v1/object/public/projects/${path.replace(/^\/+/, "")}`;
}

export function ImageUploader({
  surface,
  rowId,
  label,
  hint,
  currentPath,
  aspect = "16/9",
}: ImageUploaderProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [path, setPath] = useState<string | null>(currentPath);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const url = publicUrl(path);

  function trigger() {
    fileRef.current?.click();
  }

  async function uploadOne(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.show("That's not an image", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.show("Max 8MB per image", "error");
      return;
    }
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("surface", surface);
        if (rowId) fd.set("rowId", rowId);
        fd.set("file", file);
        const { path: stored } = await uploadSurfaceImage(fd);
        setPath(stored);
        toast.show("Image saved", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Upload failed", "error");
      }
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadOne(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadOne(f);
  }

  function onClear() {
    if (!confirm("Remove this image?")) return;
    start(async () => {
      try {
        await clearSurfaceImage(surface, rowId ?? "");
        setPath(null);
        toast.show("Image removed", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Remove failed", "error");
      }
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
          {label}
        </span>
        {path ? (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="text-[10px] uppercase tracking-[0.18em] text-slate-700 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={onPick}
        className="hidden"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={trigger}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && trigger()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{ aspectRatio: aspect }}
        className={`relative w-full cursor-pointer overflow-hidden rounded-xl border-[1.5px] border-dashed bg-slate-50 text-[var(--ink-500)] transition ${
          dragOver
            ? "border-[var(--ink-900)] bg-slate-100"
            : "border-black/15 hover:border-black/30"
        } ${pending ? "opacity-60" : ""}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[12px] uppercase tracking-[0.22em]">
                {pending ? "Uploading…" : "Drop image"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-400)]">
                or click to choose · JPG/PNG/WebP up to 8MB
              </p>
            </div>
          </div>
        )}
        {url && pending ? (
          <div className="absolute inset-0 grid place-items-center bg-black/30 text-white">
            <span className="rounded-full bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              Uploading…
            </span>
          </div>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-[var(--ink-400)]">{hint}</p>
      ) : null}
    </div>
  );
}
