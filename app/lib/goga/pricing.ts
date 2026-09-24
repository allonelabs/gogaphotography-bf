/**
 * Pure booking-total math, shared by the admin (contract template context,
 * manual bookings) and mirrored by the public repo's `/api/book`.
 *
 *   subtotal = base + extraHours × extraHourCents + Σ addon prices
 *   total    = subtotal (no taxes/fees layered on top today)
 *   deposit  = round(subtotal × depositPct / 100)
 */
export interface BookingTotalInput {
  basePriceCents: number;
  extraHours?: number;
  extraHourCents?: number;
  addonCents?: number[];
  depositPct: number;
}

export interface BookingTotal {
  subtotalCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}

export function computeBookingTotal(input: BookingTotalInput): BookingTotal {
  const extraHours = Math.max(0, input.extraHours ?? 0);
  const extraHourCents = Math.max(0, input.extraHourCents ?? 0);
  const addonsCents = (input.addonCents ?? []).reduce(
    (sum, c) => sum + Math.max(0, c),
    0,
  );
  const subtotalCents = Math.round(
    Math.max(0, input.basePriceCents) +
      extraHours * extraHourCents +
      addonsCents,
  );
  const totalCents = subtotalCents;
  const depositPct = Math.min(100, Math.max(0, input.depositPct));
  const depositCents = Math.round((subtotalCents * depositPct) / 100);
  const balanceCents = totalCents - depositCents;
  return { subtotalCents, totalCents, depositCents, balanceCents };
}
