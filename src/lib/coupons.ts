import { Prisma } from "@/generated/prisma/client";
import { fromMinorUnits, percentToBasisPoints, toMinorUnits } from "@/lib/money";

export type CouponPolicy = {
  isActive: boolean;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string | number;
  minimumSubtotal: string | number | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
};

export type CouponCalculation = { ok: true; discountMinor: number } | { ok: false; message: string };

export function calculateCouponDiscount(subtotalMinor: number, coupon: CouponPolicy, now = new Date()): CouponCalculation {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor <= 0) return { ok: false, message: "Add an available item before applying a coupon." };
  if (!coupon.isActive) return { ok: false, message: "That coupon is not available." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, message: "That coupon is not active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, message: "That coupon has expired." };
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) return { ok: false, message: "That coupon has reached its use limit." };
  if (coupon.minimumSubtotal !== null && subtotalMinor < toMinorUnits(coupon.minimumSubtotal)) return { ok: false, message: `This coupon needs a subtotal of ₹${fromMinorUnits(toMinorUnits(coupon.minimumSubtotal))} or more.` };

  let discountMinor: number;
  try {
    if (coupon.discountType === "PERCENTAGE") {
      const basisPoints = percentToBasisPoints(coupon.discountValue);
      if (basisPoints <= 0 || basisPoints > 10_000) return { ok: false, message: "That coupon has an invalid discount." };
      discountMinor = Math.floor((subtotalMinor * basisPoints) / 10_000);
    } else {
      discountMinor = toMinorUnits(coupon.discountValue);
    }
  } catch {
    return { ok: false, message: "That coupon has an invalid discount." };
  }
  if (discountMinor <= 0) return { ok: false, message: "That coupon does not apply to this order." };
  return { ok: true, discountMinor: Math.min(discountMinor, subtotalMinor) };
}

export async function releaseCouponReservation(tx: Prisma.TransactionClient, orderId: string) {
  const redemption = await tx.couponRedemption.findUnique({ where: { orderId }, select: { couponId: true } });
  if (!redemption) return;
  await tx.couponRedemption.delete({ where: { orderId } });
  await tx.coupon.updateMany({ where: { id: redemption.couponId, redeemedCount: { gt: 0 } }, data: { redeemedCount: { decrement: 1 } } });
}
