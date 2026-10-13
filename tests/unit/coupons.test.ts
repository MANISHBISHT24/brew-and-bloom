import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "@/lib/coupons";

const base = { isActive: true, discountType: "PERCENTAGE" as const, discountValue: "10.00", minimumSubtotal: null, maxRedemptions: null, redeemedCount: 0, startsAt: null, expiresAt: null };

describe("coupon eligibility and pricing", () => {
  it("calculates percentage discounts in minor units", () => {
    expect(calculateCouponDiscount(12_345, base)).toEqual({ ok: true, discountMinor: 1_234 });
  });

  it("caps a fixed discount at the subtotal", () => {
    expect(calculateCouponDiscount(1_000, { ...base, discountType: "FIXED", discountValue: "50.00" })).toEqual({ ok: true, discountMinor: 1_000 });
  });

  it("checks minimums, expiry and usage limits", () => {
    expect(calculateCouponDiscount(500, { ...base, minimumSubtotal: "10.00" }).ok).toBe(false);
    expect(calculateCouponDiscount(5_000, { ...base, expiresAt: new Date("2026-01-01T00:00:00Z") }, new Date("2026-02-01T00:00:00Z")).ok).toBe(false);
    expect(calculateCouponDiscount(5_000, { ...base, maxRedemptions: 1, redeemedCount: 1 }).ok).toBe(false);
  });
});
