"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setBookingStatus,
  deleteBooking,
} from "@/app/lib/goga/actions-bookings";

type Booking = {
  id: string;
  leadId: string | null;
  shootDate: string;
  shootTime: string | null;
  durationHours: number | null;
  location: string | null;
  subtotalCents: number;
  depositCents: number;
  totalCents: number;
  currency: string;
  status:
    | "inquiry"
    | "reserved"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show";
  depositStatus: string;
  contractStatus: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  createdAt: string | null;
  packageName: string | null;
};

const STATUSES: Booking["status"][] = [
  "inquiry",
  "reserved",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];
const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  reserved: "Reserved",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function BookingDetail({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [status, setStatus] = useState<Booking["status"]>(booking.status);
  const [, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Booking["status"];
    const prev = status;
    setStatus(next);
    start(async () => {
      try {
        await setBookingStatus(booking.id, next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        router.refresh();
      } catch (e) {
        setStatus(prev);
        alert(e instanceof Error ? e.message : "Status update failed");
      }
    });
  }

  function onDelete() {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    start(async () => {
      await deleteBooking(booking.id);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Shoot
          </h3>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
            <dt className="text-[var(--ink-400)]">Package</dt>
            <dd className="text-[var(--ink-900)]">
              {booking.packageName ?? "(deleted)"}
            </dd>
            <dt className="text-[var(--ink-400)]">Date</dt>
            <dd className="text-[var(--ink-900)]">
              {new Date(booking.shootDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
            {booking.shootTime ? (
              <>
                <dt className="text-[var(--ink-400)]">Start time</dt>
                <dd className="text-[var(--ink-900)]">{booking.shootTime}</dd>
              </>
            ) : null}
            {booking.durationHours ? (
              <>
                <dt className="text-[var(--ink-400)]">Duration</dt>
                <dd className="text-[var(--ink-900)]">
                  {booking.durationHours}h
                </dd>
              </>
            ) : null}
            {booking.location ? (
              <>
                <dt className="text-[var(--ink-400)]">Location</dt>
                <dd className="text-[var(--ink-900)]">{booking.location}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Money
          </h3>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
            <dt className="text-[var(--ink-400)]">Subtotal</dt>
            <dd>{fmtMoney(booking.subtotalCents, booking.currency)}</dd>
            <dt className="text-[var(--ink-400)]">Deposit</dt>
            <dd>
              {fmtMoney(booking.depositCents, booking.currency)}{" "}
              <span className="text-[var(--ink-500)]">
                · {booking.depositStatus}
              </span>
            </dd>
            <dt className="text-[var(--ink-400)]">Total due</dt>
            <dd>
              <strong>{fmtMoney(booking.totalCents, booking.currency)}</strong>
            </dd>
          </dl>
        </section>

        {booking.notes ? (
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
              Notes
            </h3>
            <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.55] text-[var(--ink-800)]">
              {booking.notes}
            </p>
          </section>
        ) : null}
      </div>

      <aside className="space-y-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Status
          </label>
          <select
            value={status}
            onChange={onStatusChange}
            className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[var(--ink-900)]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {saved ? (
            <p className="mt-1.5 text-[11px] text-emerald-700">Saved.</p>
          ) : null}

          <dl className="mt-4 space-y-2 text-[13px]">
            {booking.clientEmail ? (
              <DetailRow
                label="Email"
                value={
                  <a
                    href={`mailto:${booking.clientEmail}`}
                    className="text-[var(--ao-accent)] hover:underline"
                  >
                    {booking.clientEmail}
                  </a>
                }
              />
            ) : null}
            {booking.clientPhone ? (
              <DetailRow
                label="Phone"
                value={
                  <a
                    href={`tel:${booking.clientPhone}`}
                    className="text-[var(--ao-accent)] hover:underline"
                  >
                    {booking.clientPhone}
                  </a>
                }
              />
            ) : null}
            <DetailRow label="Contract" value={booking.contractStatus} />
            {booking.createdAt ? (
              <DetailRow
                label="Created"
                value={new Date(booking.createdAt).toLocaleString()}
              />
            ) : null}
          </dl>
        </section>

        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-full border border-rose-300 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50"
        >
          Delete booking
        </button>
      </aside>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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
