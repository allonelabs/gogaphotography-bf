"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setBookingStatus,
  deleteBooking,
} from "@/app/lib/goga/actions-bookings";
import { ensureContractForBooking } from "@/app/lib/goga/actions-contracts";
import { ensureDelivery } from "@/app/lib/goga/actions-deliveries";
import { createDepositCheckout } from "@/app/lib/goga/actions-payments";

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

type DeliverySummary = {
  id: string;
  token: string;
  hasPassword: boolean;
  viewCount: number;
  imageCount: number;
};

export function BookingDetail({
  booking,
  delivery,
}: {
  booking: Booking;
  delivery: DeliverySummary | null;
}) {
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

        <DepositActions
          bookingId={booking.id}
          depositCents={booking.depositCents}
          currency={booking.currency}
          depositStatus={booking.depositStatus}
        />

        <ContractButton
          bookingId={booking.id}
          contractStatus={booking.contractStatus}
        />

        <DeliveryButton bookingId={booking.id} delivery={delivery} />

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

function ContractButton({
  bookingId,
  contractStatus,
}: {
  bookingId: string;
  contractStatus: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    setErr(null);
    start(async () => {
      try {
        const { id } = await ensureContractForBooking(bookingId);
        router.push(`/app/contracts/${id}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not create contract");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Contract
      </h3>
      <p className="mb-3 text-[12px] text-[var(--ink-500)]">
        Status:{" "}
        <strong className="text-[var(--ink-900)]">{contractStatus}</strong>
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
      >
        {pending ? "Opening…" : "Create / open contract"}
      </button>
      {err ? <p className="mt-2 text-[12px] text-rose-700">{err}</p> : null}
    </section>
  );
}

function DeliveryButton({
  bookingId,
  delivery,
}: {
  bookingId: string;
  delivery: DeliverySummary | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    setErr(null);
    start(async () => {
      try {
        const { id } = await ensureDelivery(bookingId);
        router.push(`/app/deliveries/${id}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not create delivery");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Delivery
      </h3>
      {delivery ? (
        <>
          <dl className="mb-3 space-y-1.5 text-[12px]">
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">Photos</dt>
              <dd className="text-[var(--ink-900)]">{delivery.imageCount}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">Views</dt>
              <dd className="text-[var(--ink-900)]">{delivery.viewCount}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">Access</dt>
              <dd className="text-[var(--ink-900)]">
                {delivery.hasPassword ? "Protected" : "Open"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className="w-full rounded-full bg-[var(--ink-900)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Opening…" : "Manage gallery"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-[12px] text-[var(--ink-500)]">
            Private gallery for the client.
          </p>
          <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className="w-full rounded-full bg-[var(--ink-900)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Opening…" : "Create delivery gallery"}
          </button>
        </>
      )}
      {err ? <p className="mt-2 text-[12px] text-rose-700">{err}</p> : null}
    </section>
  );
}

function DepositActions({
  bookingId,
  depositCents,
  currency,
  depositStatus,
}: {
  bookingId: string;
  depositCents: number;
  currency: string;
  depositStatus: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const isPaid = depositStatus === "paid";
  const isPending = depositStatus === "pending";

  function onStart() {
    setErr(null);
    setCopied(false);
    start(async () => {
      try {
        const { url } = await createDepositCheckout(bookingId);
        setLink(url);
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {}
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not create checkout");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Deposit
      </h3>
      <p className="mb-3 text-[12px] text-[var(--ink-500)]">
        {isPaid ? (
          <span className="text-emerald-700">
            Paid — booking confirmed, lead advanced to “contract”.
          </span>
        ) : depositCents <= 0 ? (
          "Zero deposit configured — no payment link needed."
        ) : isPending ? (
          "Awaiting payment. Stripe webhook flips this to paid automatically."
        ) : (
          <>
            Charge:{" "}
            <strong className="text-[var(--ink-900)]">
              {fmtMoney(depositCents, currency)}
            </strong>
          </>
        )}
      </p>

      {!isPaid && depositCents > 0 ? (
        <>
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
          >
            {pending
              ? "Creating link…"
              : isPending
                ? "Resend deposit link"
                : `Send deposit link · ${fmtMoney(depositCents, currency)}`}
          </button>
          {link ? (
            <p className="mt-2 text-[11px] text-[var(--ink-500)]">
              {copied
                ? "Copied to clipboard — paste to the client."
                : "Link opened in a new tab."}
            </p>
          ) : null}
        </>
      ) : null}

      {err ? <p className="mt-2 text-[12px] text-rose-700">{err}</p> : null}
    </section>
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
