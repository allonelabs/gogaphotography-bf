"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateStudioInfo } from "@/app/lib/goga/actions-studio";
import { useToast } from "@/app/app/_components/Toaster";

export interface StudioRow {
  id: number;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_locality: string | null;
  address_country: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  pinterest_url: string | null;
  tiktok_url: string | null;
  hours: string | null;
  updated_at: string;
}

export function StudioForm({ initial }: { initial: StudioRow | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await updateStudioInfo(fd);
        setSavedAt(Date.now());
        toast.show("Studio info saved", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Save failed", "error");
      }
    });
  }

  const input =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5"
    >
      <h2 className="text-[14px] font-medium text-[var(--ink-900)]">Contact</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            name="email"
            defaultValue={initial?.email ?? ""}
            placeholder="hello@goga.photography"
            className={input}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            placeholder="+995 599 12 34 56"
            className={input}
          />
        </Field>
        <Field label="WhatsApp">
          <input
            type="tel"
            name="whatsapp"
            defaultValue={initial?.whatsapp ?? ""}
            placeholder="+995 599 12 34 56"
            className={input}
          />
        </Field>
        <Field label="Hours">
          <input
            type="text"
            name="hours"
            defaultValue={initial?.hours ?? ""}
            placeholder="Mon–Sat, 10:00–19:00"
            className={input}
          />
        </Field>
      </div>

      <hr className="border-black/5" />

      <h2 className="text-[14px] font-medium text-[var(--ink-900)]">Address</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Locality (city)">
          <input
            type="text"
            name="address_locality"
            defaultValue={initial?.address_locality ?? ""}
            placeholder="Tbilisi"
            className={input}
          />
        </Field>
        <Field label="Country (ISO-3166-1 alpha-2)">
          <input
            type="text"
            name="address_country"
            defaultValue={initial?.address_country ?? ""}
            placeholder="GE"
            maxLength={2}
            className={input}
          />
        </Field>
      </div>

      <hr className="border-black/5" />

      <h2 className="text-[14px] font-medium text-[var(--ink-900)]">Social</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Instagram URL">
          <input
            type="url"
            name="instagram_url"
            defaultValue={initial?.instagram_url ?? ""}
            placeholder="https://instagram.com/goga"
            className={input}
          />
        </Field>
        <Field label="Facebook URL">
          <input
            type="url"
            name="facebook_url"
            defaultValue={initial?.facebook_url ?? ""}
            placeholder="https://facebook.com/goga"
            className={input}
          />
        </Field>
        <Field label="Pinterest URL">
          <input
            type="url"
            name="pinterest_url"
            defaultValue={initial?.pinterest_url ?? ""}
            placeholder="https://pinterest.com/goga"
            className={input}
          />
        </Field>
        <Field label="TikTok URL">
          <input
            type="url"
            name="tiktok_url"
            defaultValue={initial?.tiktok_url ?? ""}
            placeholder="https://tiktok.com/@goga"
            className={input}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {savedAt ? (
          <span className="text-[12px] text-slate-900 font-medium">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}
