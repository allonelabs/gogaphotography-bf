"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateContractTemplate } from "@/app/lib/goga/actions-contract-template";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

type Initial = { body_en: string; body_ka: string; body_ru: string };

export function ContractTemplateForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const [bodyEn, setBodyEn] = useState(initial.body_en);
  const [bodyKa, setBodyKa] = useState(initial.body_ka);
  const [bodyRu, setBodyRu] = useState(initial.body_ru);
  const [pending, start] = useTransition();

  function onSave() {
    start(async () => {
      try {
        await updateContractTemplate({
          body_en: bodyEn,
          body_ka: bodyKa,
          body_ru: bodyRu,
        });
        toast.show("Template saved", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Save failed", "error");
      }
    });
  }

  const monoCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] font-mono leading-[1.6] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <div className="space-y-4">
      <Field label="Body (English)">
        <textarea
          value={bodyEn}
          onChange={(e) => setBodyEn(e.target.value)}
          rows={16}
          className={monoCls}
        />
      </Field>
      <Field label="Body (Georgian)">
        <textarea
          value={bodyKa}
          onChange={(e) => setBodyKa(e.target.value)}
          rows={16}
          className={monoCls}
        />
      </Field>
      <Field label="Body (Russian)">
        <textarea
          value={bodyRu}
          onChange={(e) => setBodyRu(e.target.value)}
          rows={16}
          className={monoCls}
        />
      </Field>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save template"}
      </button>
    </div>
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
    <label className="block rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}
