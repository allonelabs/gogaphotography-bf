"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setBookingStatus,
  deleteBooking,
  updateBookingNotes,
} from "@/app/lib/goga/actions-bookings";
import { ensureContractForBooking } from "@/app/lib/goga/actions-contracts";
import { ensureDelivery } from "@/app/lib/goga/actions-deliveries";
import { createDepositCheckout } from "@/app/lib/goga/actions-payments";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { rethrowIfRedirect } from "@/app/lib/goga/redirect-error";
import { formatMoney } from "@/app/lib/goga/money";
import { useLocale } from "@/app/lib/i18n/useLocale";

type BookingAddon = { id: string; name: string; priceCents: number };

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
  extraHours: number;
  extraHourCents: number;
  addons: BookingAddon[];
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
function statusLabels(
  tr: (en: string, ka: string) => string,
): Record<string, string> {
  return {
    inquiry: tr("Inquiry", "მოთხოვნა"),
    reserved: tr("Reserved", "დაჯავშნილი"),
    confirmed: tr("Confirmed", "დადასტურებული"),
    completed: tr("Completed", "დასრულებული"),
    cancelled: tr("Cancelled", "გაუქმებული"),
    no_show: tr("No-show", "არ გამოცხადდა"),
  };
}
function depositStatusLabel(
  tr: (en: string, ka: string) => string,
  status: string,
): string {
  const map: Record<string, string> = {
    none: tr("no deposit", "ავანსის გარეშე"),
    pending: tr("pending", "მოლოდინში"),
    paid: tr("paid", "გადახდილი"),
    refunded: tr("refunded", "დაბრუნებული"),
    failed: tr("failed", "ვერ შესრულდა"),
  };
  return map[status] ?? status;
}
function contractStatusLabel(
  tr: (en: string, ka: string) => string,
  status: string,
): string {
  const map: Record<string, string> = {
    draft: tr("draft", "მონახაზი"),
    sent: tr("sent", "გაგზავნილი"),
    signed: tr("signed", "ხელმოწერილი"),
    void: tr("void", "გაუქმებული"),
  };
  return map[status] ?? status;
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
  paymentsReady,
}: {
  booking: Booking;
  delivery: DeliverySummary | null;
  paymentsReady: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { tr, locale } = useLocale();
  const intlLocale = locale === "ka" ? "ka-GE" : "en-US";
  const STATUS_LABELS = statusLabels(tr);
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
        rethrowIfRedirect(e);
        setStatus(prev);
        toast.show(
          e instanceof Error
            ? e.message
            : tr("Status update failed", "სტატუსის განახლება ვერ მოხერხდა"),
          "error",
        );
      }
    });
  }

  function onDelete() {
    if (
      !confirm(
        tr(
          "Delete this booking? This cannot be undone.",
          "წაიშალოს ეს ჯავშანი? ეს ქმედება შეუქცევადია.",
        ),
      )
    )
      return;
    start(async () => {
      await deleteBooking(booking.id);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr("Shoot", "გადაღება")}
          </h3>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
            <dt className="text-[var(--ink-400)]">{tr("Package", "პაკეტი")}</dt>
            <dd className="text-[var(--ink-900)]">
              {booking.packageName ?? tr("(deleted)", "(წაშლილი)")}
            </dd>
            <dt className="text-[var(--ink-400)]">{tr("Date", "თარიღი")}</dt>
            <dd className="text-[var(--ink-900)]">
              {new Date(booking.shootDate).toLocaleDateString(intlLocale, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
            {booking.shootTime ? (
              <>
                <dt className="text-[var(--ink-400)]">
                  {tr("Start time", "დაწყების დრო")}
                </dt>
                <dd className="text-[var(--ink-900)]">{booking.shootTime}</dd>
              </>
            ) : null}
            {booking.durationHours ? (
              <>
                <dt className="text-[var(--ink-400)]">
                  {tr("Duration", "ხანგრძლივობა")}
                </dt>
                <dd className="text-[var(--ink-900)]">
                  {booking.durationHours}
                  {tr("h", "სთ")}
                </dd>
              </>
            ) : null}
            {booking.location ? (
              <>
                <dt className="text-[var(--ink-400)]">
                  {tr("Location", "ლოკაცია")}
                </dt>
                <dd className="text-[var(--ink-900)]">{booking.location}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr("Money", "თანხა")}
          </h3>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
            <dt className="text-[var(--ink-400)]">
              {tr("Subtotal", "ქვეჯამი")}
            </dt>
            <dd>{formatMoney(booking.subtotalCents, booking.currency)}</dd>
            {booking.extraHours > 0 ? (
              <>
                <dt className="text-[var(--ink-400)]">
                  {tr("Extra hours", "დამატებითი საათები")}
                </dt>
                <dd>
                  {booking.extraHours}
                  {tr("h", "სთ")} ×{" "}
                  {formatMoney(booking.extraHourCents, booking.currency)}
                </dd>
              </>
            ) : null}
            {booking.addons.length > 0 ? (
              <>
                <dt className="text-[var(--ink-400)]">
                  {tr("Add-ons", "დამატებები")}
                </dt>
                <dd>
                  <ul className="space-y-0.5">
                    {booking.addons.map((a) => (
                      <li key={a.id}>
                        {a.name} — {formatMoney(a.priceCents, booking.currency)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            ) : null}
            <dt className="text-[var(--ink-400)]">{tr("Deposit", "ავანსი")}</dt>
            <dd>
              {formatMoney(booking.depositCents, booking.currency)}{" "}
              <span className="text-[var(--ink-500)]">
                · {depositStatusLabel(tr, booking.depositStatus)}
              </span>
            </dd>
            <dt className="text-[var(--ink-400)]">
              {tr("Total due", "გადასახდელი ჯამი")}
            </dt>
            <dd>
              <strong>
                {formatMoney(booking.totalCents, booking.currency)}
              </strong>
            </dd>
          </dl>
        </section>

        <NotesEditor bookingId={booking.id} initial={booking.notes ?? ""} />
      </div>

      <aside className="space-y-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {tr("Status", "სტატუსი")}
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
            <p className="mt-1.5 text-[11px] text-slate-900 font-medium">
              {tr("Saved.", "შენახულია.")}
            </p>
          ) : null}

          <dl className="mt-4 space-y-2 text-[13px]">
            {booking.clientEmail ? (
              <DetailRow
                label={tr("Email", "ელფოსტა")}
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
                label={tr("Phone", "ტელეფონი")}
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
            <DetailRow
              label={tr("Contract", "ხელშეკრულება")}
              value={contractStatusLabel(tr, booking.contractStatus)}
            />
            {booking.createdAt ? (
              <DetailRow
                label={tr("Created", "შექმნის თარიღი")}
                value={new Date(booking.createdAt).toLocaleString(intlLocale)}
              />
            ) : null}
          </dl>
        </section>

        <DepositActions
          bookingId={booking.id}
          depositCents={booking.depositCents}
          currency={booking.currency}
          depositStatus={booking.depositStatus}
          paymentsReady={paymentsReady}
        />

        <ContractButton
          bookingId={booking.id}
          contractStatus={booking.contractStatus}
        />

        <DeliveryButton bookingId={booking.id} delivery={delivery} />

        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-full border border-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100"
        >
          {tr("Delete booking", "ჯავშნის წაშლა")}
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
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    setErr(null);
    start(async () => {
      try {
        const { id } = await ensureContractForBooking(bookingId);
        router.push(`/admin/contracts/${id}`);
      } catch (e) {
        rethrowIfRedirect(e);
        setErr(
          e instanceof Error
            ? e.message
            : tr(
                "Could not create contract",
                "ხელშეკრულების შექმნა ვერ მოხერხდა",
              ),
        );
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {tr("Contract", "ხელშეკრულება")}
      </h3>
      <p className="mb-3 text-[12px] text-[var(--ink-500)]">
        {tr("Status", "სტატუსი")}:{" "}
        <strong className="text-[var(--ink-900)]">
          {contractStatusLabel(tr, contractStatus)}
        </strong>
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
      >
        {pending
          ? tr("Opening…", "იხსნება…")
          : tr("Create / open contract", "ხელშეკრულების შექმნა / გახსნა")}
      </button>
      {err ? <p className="mt-2 text-[12px] text-slate-700">{err}</p> : null}
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
  const { tr } = useLocale();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    setErr(null);
    start(async () => {
      try {
        const { id } = await ensureDelivery(bookingId);
        router.push(`/admin/deliveries/${id}`);
      } catch (e) {
        rethrowIfRedirect(e);
        setErr(
          e instanceof Error
            ? e.message
            : tr("Could not create delivery", "მიწოდება ვერ შეიქმნა"),
        );
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {tr("Delivery", "მიწოდება")}
      </h3>
      {delivery ? (
        <>
          <dl className="mb-3 space-y-1.5 text-[12px]">
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">
                {tr("Photos", "ფოტოები")}
              </dt>
              <dd className="text-[var(--ink-900)]">{delivery.imageCount}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">
                {tr("Views", "ნახვები")}
              </dt>
              <dd className="text-[var(--ink-900)]">{delivery.viewCount}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[var(--ink-500)]">
                {tr("Access", "წვდომა")}
              </dt>
              <dd className="text-[var(--ink-900)]">
                {delivery.hasPassword
                  ? tr("Protected", "დაცული")
                  : tr("Open", "ღია")}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className="w-full rounded-full bg-[var(--ink-900)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? tr("Opening…", "იხსნება…")
              : tr("Manage gallery", "გალერეის მართვა")}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-[12px] text-[var(--ink-500)]">
            {tr(
              "Private gallery for the client.",
              "პირადი გალერეა კლიენტისთვის.",
            )}
          </p>
          <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className="w-full rounded-full bg-[var(--ink-900)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? tr("Opening…", "იხსნება…")
              : tr("Create delivery gallery", "მიწოდების გალერეის შექმნა")}
          </button>
        </>
      )}
      {err ? <p className="mt-2 text-[12px] text-slate-700">{err}</p> : null}
    </section>
  );
}

function DepositActions({
  bookingId,
  depositCents,
  currency,
  depositStatus,
  paymentsReady,
}: {
  bookingId: string;
  depositCents: number;
  currency: string;
  depositStatus: string;
  paymentsReady: boolean;
}) {
  const { tr } = useLocale();
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
        rethrowIfRedirect(e);
        setErr(
          e instanceof Error
            ? e.message
            : tr("Could not create checkout", "გადახდის ბმული ვერ შეიქმნა"),
        );
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {tr("Deposit", "ავანსი")}
      </h3>
      <p className="mb-3 text-[12px] text-[var(--ink-500)]">
        {isPaid ? (
          <span className="text-slate-900 font-medium">
            {tr(
              'Paid — booking confirmed, lead advanced to "contract".',
              "გადახდილია — ჯავშანი დადასტურდა, ლიდი გადავიდა „ხელშეკრულების“ სტატუსში.",
            )}
          </span>
        ) : depositCents <= 0 ? (
          tr(
            "Zero deposit configured — no payment link needed.",
            "ავანსი 0-ია — გადახდის ბმული საჭირო არ არის.",
          )
        ) : isPending ? (
          tr(
            "Awaiting payment. The TBC callback flips this to paid automatically.",
            "მოლოდინშია გადახდა. TBC-ის callback ავტომატურად გადაიყვანს „გადახდილში“ სტატუსში.",
          )
        ) : (
          <>
            {tr("Charge", "თანხა")}:{" "}
            <strong className="text-[var(--ink-900)]">
              {formatMoney(depositCents, currency)}
            </strong>
          </>
        )}
      </p>

      {!isPaid && depositCents > 0 ? (
        <>
          <button
            type="button"
            onClick={onStart}
            disabled={pending || !paymentsReady}
            title={
              paymentsReady
                ? undefined
                : tr(
                    "Set TBC_API_KEY + TBC_CLIENT_ID + TBC_CLIENT_SECRET on Vercel to enable deposits.",
                    "ავანსების ჩასართავად დააყენეთ TBC_API_KEY + TBC_CLIENT_ID + TBC_CLIENT_SECRET Vercel-ზე.",
                  )
            }
            className="w-full rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
          >
            {!paymentsReady
              ? tr("TBC not configured", "TBC არ არის კონფიგურირებული")
              : pending
                ? tr("Creating link…", "ბმული იქმნება…")
                : isPending
                  ? tr("Resend deposit link", "ავანსის ბმულის თავიდან გაგზავნა")
                  : `${tr("Send deposit link", "ავანსის ბმულის გაგზავნა")} · ${formatMoney(depositCents, currency)}`}
          </button>
          {link ? (
            <p className="mt-2 text-[11px] text-[var(--ink-500)]">
              {copied
                ? tr(
                    "Copied to clipboard — paste to the client.",
                    "დაკოპირდა — ჩასვით კლიენტისთვის.",
                  )
                : tr("Link opened in a new tab.", "ბმული გაიხსნა ახალ ტაბში.")}
            </p>
          ) : null}
        </>
      ) : null}

      {err ? <p className="mt-2 text-[12px] text-slate-700">{err}</p> : null}
    </section>
  );
}

function NotesEditor({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: string;
}) {
  const { tr } = useLocale();
  const [value, setValue] = useState(initial);
  const [, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function onBlur() {
    if (value === initial) return;
    start(async () => {
      await updateBookingNotes(bookingId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
          {tr("Notes", "შენიშვნები")}
        </h3>
        {saved ? (
          <span className="text-[11px] text-slate-900 font-medium">
            {tr("Saved.", "შენახულია.")}
          </span>
        ) : null}
      </header>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        rows={5}
        placeholder={tr(
          "Pre-shoot prep, shot list, delivery preferences…",
          "გადაღების წინ მოსამზადებელი სია, კადრების ჩამონათვალი, მიწოდების პრეფერენციები…",
        )}
        className="block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
      />
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
