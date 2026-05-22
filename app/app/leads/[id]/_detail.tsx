"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setLeadStage,
  updateLeadNotes,
  archiveLead,
} from "@/app/lib/goga/actions";
import { createBookingFromLead } from "@/app/lib/goga/actions-bookings";
import type { LeadStage } from "@/app/lib/goga/leads";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  stage: LeadStage;
  shootDate: string | null;
  notes: string | null;
  createdAt: string | null;
  packageId: string | null;
};

type EventRow = {
  id: string;
  kind: string;
  createdAt: string | null;
};

type Pkg = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
};

export function LeadDetail({
  lead,
  stages,
  labels,
  events,
  packages,
}: {
  lead: Lead;
  stages: LeadStage[];
  labels: Record<LeadStage, string>;
  events: EventRow[];
  packages: Pkg[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [, start] = useTransition();
  const [saved, setSaved] = useState<"stage" | "notes" | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  function onStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LeadStage;
    const prev = stage;
    setStage(next);
    start(async () => {
      try {
        await setLeadStage(lead.id, next);
        setSaved("stage");
        setTimeout(() => setSaved(null), 1200);
        router.refresh();
      } catch (e) {
        setStage(prev);
        alert(e instanceof Error ? e.message : "Stage update failed");
      }
    });
  }

  function onNotesBlur() {
    if (notes === (lead.notes ?? "")) return;
    start(async () => {
      await updateLeadNotes(lead.id, notes);
      setSaved("notes");
      setTimeout(() => setSaved(null), 1200);
      router.refresh();
    });
  }

  function onArchive() {
    if (!confirm("Archive this lead? It hides from the pipeline.")) return;
    start(async () => {
      await archiveLead(lead.id);
      router.push("/app/leads");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Inquiry
          </h3>
          {lead.message ? (
            <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.55] text-[var(--ink-800)]">
              {lead.message}
            </p>
          ) : (
            <p className="m-0 text-[14px] text-[var(--ink-400)]">
              No message provided.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
              Notes
            </h3>
            {saved === "notes" ? (
              <span className="text-[11px] text-emerald-700">Saved.</span>
            ) : null}
          </header>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Conversation summary, follow-up reminders, internal context…"
            rows={6}
            className="block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
          />
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Activity
          </h3>
          {events.length === 0 ? (
            <p className="m-0 text-[14px] text-[var(--ink-400)]">
              No activity yet.
            </p>
          ) : (
            <ol className="m-0 list-none p-0">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between border-b border-black/5 py-2 last:border-b-0"
                >
                  <span className="text-[12px] text-[var(--ink-700)]">
                    {e.kind}
                  </span>
                  <time className="text-[11px] text-[var(--ink-400)]">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="space-y-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Stage
          </label>
          <select
            value={stage}
            onChange={onStageChange}
            className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] text-[var(--ink-900)] outline-none focus:border-[var(--ink-900)]"
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
          {saved === "stage" ? (
            <p className="mt-1.5 text-[11px] text-emerald-700">Saved.</p>
          ) : null}

          <button
            type="button"
            onClick={() => setConvertOpen(true)}
            disabled={packages.length === 0}
            className="mt-4 w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Convert to booking
          </button>
          {packages.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--ink-400)]">
              Add a package first to enable this.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Details
          </h3>
          <dl className="space-y-2 text-[13px]">
            <Detail label="Source" value={lead.source} />
            {lead.email ? (
              <Detail
                label="Email"
                value={
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-[var(--ao-accent)] hover:underline"
                  >
                    {lead.email}
                  </a>
                }
              />
            ) : null}
            {lead.phone ? (
              <Detail
                label="Phone"
                value={
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-[var(--ao-accent)] hover:underline"
                  >
                    {lead.phone}
                  </a>
                }
              />
            ) : null}
            {lead.shootDate ? (
              <Detail
                label="Shoot date"
                value={new Date(lead.shootDate).toLocaleDateString()}
              />
            ) : null}
            {lead.createdAt ? (
              <Detail
                label="Created"
                value={new Date(lead.createdAt).toLocaleString()}
              />
            ) : null}
          </dl>
        </section>

        <button
          type="button"
          onClick={onArchive}
          className="w-full rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50"
        >
          Archive lead
        </button>
      </aside>

      {convertOpen ? (
        <ConvertModal
          lead={lead}
          packages={packages}
          onClose={() => setConvertOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
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

function ConvertModal({
  lead,
  packages,
  onClose,
}: {
  lead: Lead;
  packages: Pkg[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState(
    lead.packageId ?? packages[0]?.id ?? "",
  );
  const [date, setDate] = useState(lead.shootDate ?? "");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onSubmit() {
    if (!packageId || !date) {
      setErr("Pick a package and a date.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        const { id } = await createBookingFromLead({
          leadId: lead.id,
          packageId,
          shootDate: date,
          shootTime: time || null,
          location: location || null,
        });
        router.push(`/app/bookings/${id}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not create booking");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-7 ring-1 ring-black/5">
        <h3 className="text-[16px] font-semibold text-[var(--ink-900)]">
          New booking from lead
        </h3>
        <p className="mb-4 mt-1 text-[12px] text-[var(--ink-500)]">
          Creates a reserved booking + advances the lead to consultation.
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Package
          </span>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[var(--ink-900)]"
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} —{" "}
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: p.currency,
                  maximumFractionDigits: 0,
                }).format(p.priceCents / 100)}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Shoot date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[var(--ink-900)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Start time
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[var(--ink-900)]"
            />
          </label>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Location
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Sighnaghi, Pheasant's Tears"
            className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[var(--ink-900)]"
          />
        </label>

        {err ? <p className="mb-3 text-[12px] text-rose-700">{err}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="rounded-full bg-[var(--ao-accent)] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
