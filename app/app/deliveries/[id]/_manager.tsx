"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  setDeliveryPassword,
  clearDeliveryPassword,
  updateDeliveryMeta,
  uploadDeliveryImage,
  deleteDeliveryImage,
} from "@/app/lib/goga/actions-deliveries";

type Delivery = {
  id: string;
  token: string;
  hasPassword: boolean;
  introEn: string | null;
  introKa: string | null;
  expiresAt: string | null;
  downloadsEnabled: boolean;
  viewCount: number;
  lastViewedAt: string | null;
};

type Item = {
  id: string;
  imagePath: string;
  previewUrl: string;
  caption: string;
  favoritedAt: string | null;
  downloadCount: number;
};

type Uploading = {
  tempId: string;
  filename: string;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
};

export function DeliveryManager({
  delivery,
  items,
}: {
  delivery: Delivery;
  items: Item[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [photos, setPhotos] = useState<Item[]>(items);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const galleryUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/gallery/${delivery.token}`
      : `/gallery/${delivery.token}`;

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
          fd.set("deliveryId", delivery.id);
          fd.set("file", file);
          const { id, imagePath } = await uploadDeliveryImage(fd);
          setPhotos((cur) => [
            ...cur,
            {
              id,
              imagePath,
              previewUrl,
              caption: "",
              favoritedAt: null,
              downloadCount: 0,
            },
          ]);
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
    [delivery.id, router],
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

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  async function onSavePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    if (!pw) return;
    start(async () => {
      await setDeliveryPassword(delivery.id, pw);
      router.refresh();
    });
  }
  async function onClearPassword() {
    if (
      !confirm("Remove the password? Anyone with the URL will see the photos.")
    )
      return;
    start(async () => {
      await clearDeliveryPassword(delivery.id);
      router.refresh();
    });
  }
  async function onSaveMeta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await updateDeliveryMeta(delivery.id, {
        intro_en: String(fd.get("intro_en") ?? "") || null,
        intro_ka: String(fd.get("intro_ka") ?? "") || null,
        expires_at: String(fd.get("expires_at") ?? "") || null,
        downloads_enabled: fd.get("downloads_enabled") === "on",
      });
      router.refresh();
    });
  }
  async function onDeleteImage(imageId: string) {
    if (!confirm("Delete this photo from the delivery?")) return;
    await deleteDeliveryImage(imageId);
    setPhotos((cur) => cur.filter((x) => x.id !== imageId));
    router.refresh();
  }

  const inputCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-3 text-[14px] font-medium text-[var(--ink-900)]">
          Photos · {photos.length}
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`mb-4 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-[1.5px] border-dashed bg-white p-7 text-center transition ${
            dragOver ? "border-[var(--ink-900)] bg-slate-50" : "border-black/20"
          }`}
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
            Drop client photos
          </strong>
          <span className="text-[12px] text-[var(--ink-500)]">
            or click to choose files
          </span>
        </div>

        {uploading.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {uploading.map((u) => (
              <li
                key={u.tempId}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.previewUrl}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
                <span className="text-[12px]">{u.filename}</span>
                <span className="ml-auto text-[11px] text-[var(--ink-500)]">
                  {u.status === "uploading"
                    ? "uploading…"
                    : `error: ${u.error}`}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {photos.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--ink-400)]">
            No photos uploaded yet. Drop or pick a folder to start.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((p) => (
              <li
                key={p.id}
                className="group relative overflow-hidden rounded-lg bg-slate-100"
                style={{ aspectRatio: "4 / 3" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {p.favoritedAt ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                    ★
                  </span>
                ) : null}
                {p.downloadCount > 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-white">
                    ↓ {p.downloadCount}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDeleteImage(p.id)}
                  aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-sm text-white opacity-0 transition group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Share
          </h3>
          <div className="mb-3 flex gap-1.5">
            <input
              readOnly
              value={galleryUrl}
              className="block flex-1 rounded-lg border border-black/10 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] outline-none"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-lg bg-[var(--ao-accent)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-[var(--ao-accent-hover)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-[var(--ink-500)]">
            Views: {delivery.viewCount}
            {delivery.lastViewedAt
              ? ` · last ${new Date(delivery.lastViewedAt).toLocaleString()}`
              : ""}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Password
          </h3>
          {delivery.hasPassword ? (
            <>
              <p className="mb-3 text-[13px] text-[var(--ink-700)]">
                Protected. Clients enter the password once; a cookie lasts 30
                days.
              </p>
              <button
                type="button"
                onClick={onClearPassword}
                className="w-full rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 hover:bg-rose-50"
              >
                Remove password
              </button>
            </>
          ) : (
            <form onSubmit={onSavePassword}>
              <input
                type="text"
                name="password"
                minLength={4}
                placeholder="At least 4 characters"
                required
                className={`${inputCls} mb-2`}
              />
              <button
                type="submit"
                className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white hover:bg-[var(--ao-accent-hover)]"
              >
                Set password
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Settings
          </h3>
          <form onSubmit={onSaveMeta} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                Intro (EN)
              </span>
              <textarea
                name="intro_en"
                defaultValue={delivery.introEn ?? ""}
                rows={3}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                Intro (KA)
              </span>
              <textarea
                name="intro_ka"
                defaultValue={delivery.introKa ?? ""}
                rows={3}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
                Expires (optional)
              </span>
              <input
                type="datetime-local"
                name="expires_at"
                defaultValue={
                  delivery.expiresAt ? delivery.expiresAt.slice(0, 16) : ""
                }
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
              <input
                type="checkbox"
                name="downloads_enabled"
                defaultChecked={delivery.downloadsEnabled}
                className="h-4 w-4 rounded border-black/20"
              />
              <span>Allow downloads</span>
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white hover:bg-[var(--ao-accent-hover)]"
            >
              Save
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
