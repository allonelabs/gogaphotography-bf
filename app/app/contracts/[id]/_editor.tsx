"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  updateContractBody,
  sendContract,
  voidContract,
} from "@/app/lib/goga/actions-contracts";

type Contract = {
  id: string;
  token: string;
  bodyEn: string;
  bodyKa: string;
  status: "draft" | "sent" | "signed" | "void";
  signerName: string | null;
  signerEmail: string | null;
  signedAt: string | null;
  signedIp: string | null;
  sentAt: string | null;
  signatureUrl: string | null;
};

export function ContractEditor({ contract }: { contract: Contract }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [bodyEn, setBodyEn] = useState(contract.bodyEn);
  const [bodyKa, setBodyKa] = useState(contract.bodyKa);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSigned = contract.status === "signed";
  const isVoid = contract.status === "void";

  const signUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign/${contract.token}`
      : `/sign/${contract.token}`;

  async function onSaveBody(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      try {
        await updateContractBody(contract.id, {
          body_en: bodyEn,
          body_ka: bodyKa || null,
        });
        setSavedAt(Date.now());
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function onSend() {
    if (
      !confirm(
        `Send this contract to ${contract.signerEmail ?? "(no email on file)"}?`,
      )
    )
      return;
    setErr(null);
    start(async () => {
      try {
        await sendContract(contract.id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Send failed");
      }
    });
  }

  function onVoid() {
    if (
      !confirm(
        "Void this contract? The sign link stops working. Create a fresh contract afterwards if needed.",
      )
    )
      return;
    start(async () => {
      await voidContract(contract.id);
      router.refresh();
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(signUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const monoCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] font-mono leading-[1.6] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <form
        onSubmit={onSaveBody}
        className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5"
      >
        <Field label="Contract body (English)">
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            rows={18}
            disabled={isSigned || isVoid}
            className={monoCls}
            style={{ minHeight: 380 }}
          />
        </Field>

        <Field label="Contract body (Georgian) — optional">
          <textarea
            value={bodyKa}
            onChange={(e) => setBodyKa(e.target.value)}
            rows={10}
            disabled={isSigned || isVoid}
            className={monoCls}
          />
        </Field>

        {!isSigned && !isVoid ? (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save body"}
            </button>
            {savedAt ? (
              <span className="text-[12px] text-emerald-700">Saved.</span>
            ) : null}
            {err ? (
              <span className="text-[12px] text-rose-700">{err}</span>
            ) : null}
          </div>
        ) : null}
      </form>

      <aside className="space-y-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Status
          </h3>
          <dl className="space-y-2 text-[13px]">
            <Row
              label="State"
              value={
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                    isSigned
                      ? "bg-emerald-50 text-emerald-700"
                      : isVoid
                        ? "bg-rose-50 text-rose-700"
                        : contract.status === "sent"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {contract.status}
                </span>
              }
            />
            {contract.signerEmail ? (
              <Row
                label="Signer"
                value={
                  <a
                    href={`mailto:${contract.signerEmail}`}
                    className="text-[var(--ao-accent)] hover:underline"
                  >
                    {contract.signerName ?? contract.signerEmail}
                  </a>
                }
              />
            ) : null}
            {contract.sentAt ? (
              <Row
                label="Sent"
                value={new Date(contract.sentAt).toLocaleString()}
              />
            ) : null}
            {contract.signedAt ? (
              <>
                <Row
                  label="Signed"
                  value={new Date(contract.signedAt).toLocaleString()}
                />
                <Row label="IP" value={contract.signedIp ?? "—"} />
              </>
            ) : null}
          </dl>
          {contract.signatureUrl ? (
            <>
              <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
                Signature
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contract.signatureUrl}
                alt="Signature"
                className="mt-2 w-full rounded-lg border border-black/5 bg-white"
              />
            </>
          ) : null}
        </section>

        {!isSigned && !isVoid ? (
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
              Sign link
            </h3>
            <div className="mb-3 flex gap-1.5">
              <input
                readOnly
                value={signUrl}
                className="block flex-1 rounded-lg border border-black/10 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-[var(--ink-900)] outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-black/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={onSend}
              disabled={pending}
              className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
            >
              {contract.status === "sent" ? "Resend email" : "Email to signer"}
            </button>
            <p className="mt-2 text-[11px] text-[var(--ink-500)]">
              Sends the link to <strong>{contract.signerEmail}</strong>.
            </p>
          </section>
        ) : null}

        {!isVoid ? (
          <button
            type="button"
            onClick={onVoid}
            className="w-full rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50"
          >
            Void contract
          </button>
        ) : null}
      </aside>
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
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-400)]">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[var(--ink-900)]">
        {value}
      </dd>
    </div>
  );
}
