import { describe, it, expect } from "vitest";
import { computeBookingTotal } from "@/app/lib/goga/pricing";

describe("computeBookingTotal", () => {
  it("computes subtotal/total/deposit for a plain package with no extras", () => {
    const r = computeBookingTotal({ basePriceCents: 400000, depositPct: 30 });
    expect(r.subtotalCents).toBe(400000);
    expect(r.totalCents).toBe(400000);
    expect(r.depositCents).toBe(120000);
    expect(r.balanceCents).toBe(280000);
  });

  it("adds extra hours × extra-hour price into subtotal and total", () => {
    const r = computeBookingTotal({
      basePriceCents: 400000,
      extraHours: 2,
      extraHourCents: 15000,
      depositPct: 30,
    });
    expect(r.subtotalCents).toBe(430000);
    expect(r.totalCents).toBe(430000);
    expect(r.depositCents).toBe(129000);
  });

  it("adds add-on prices into subtotal", () => {
    const r = computeBookingTotal({
      basePriceCents: 400000,
      addonCents: [20000, 15000],
      depositPct: 25,
    });
    expect(r.subtotalCents).toBe(435000);
    expect(r.depositCents).toBe(108750);
    expect(r.balanceCents).toBe(435000 - 108750);
  });

  it("combines extra hours and add-ons, matching subtotal = total (no separate fees)", () => {
    const r = computeBookingTotal({
      basePriceCents: 400000,
      extraHours: 1,
      extraHourCents: 15000,
      addonCents: [20000],
      depositPct: 30,
    });
    expect(r.subtotalCents).toBe(435000);
    expect(r.totalCents).toBe(r.subtotalCents);
  });

  it("clamps negative inputs and out-of-range deposit percentages", () => {
    const r = computeBookingTotal({
      basePriceCents: -100,
      extraHours: -5,
      extraHourCents: -10,
      addonCents: [-500, 1000],
      depositPct: 150,
    });
    expect(r.subtotalCents).toBe(1000);
    expect(r.depositCents).toBe(1000);
  });
});
