import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateCouponDiscount } from "@/lib/coupons";
import { getPrisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/), subtotalMinor: z.number().int().min(1).max(25_000_000) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try { if (!origin || new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ message: "Request origin could not be verified." }, { status: 403 }); }
  catch { return NextResponse.json({ message: "Request origin could not be verified." }, { status: 403 }); }
  if (!process.env.DATABASE_URL) return NextResponse.json({ message: "Coupons need the configured store database." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`coupon:${ip}`, 10, 60_000).allowed) return NextResponse.json({ message: "Please wait before trying another coupon." }, { status: 429 });
  let raw: unknown;
  try { raw = await safeJson(request, 2_000); }
  catch { return NextResponse.json({ message: "Enter a valid coupon code." }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid coupon code." }, { status: 400 });
  const db = getPrisma();
  try {
  const coupon = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (!coupon) return NextResponse.json({ message: "That coupon is not available." }, { status: 404 });
  const calculation = calculateCouponDiscount(parsed.data.subtotalMinor, {
    isActive: coupon.isActive,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue.toString(),
    minimumSubtotal: coupon.minimumSubtotal?.toString() ?? null,
    maxRedemptions: coupon.maxRedemptions,
    redeemedCount: coupon.redeemedCount,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
  });
  if (!calculation.ok) return NextResponse.json({ message: calculation.message }, { status: 400 });
  if (process.env.AUTH_SECRET) {
    const session = await getCurrentSession();
    if (session && await db.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } }, select: { id: true } })) {
      return NextResponse.json({ message: "This account has already used that coupon." }, { status: 409 });
    }
  }
  return NextResponse.json({ valid: true, code: coupon.code, discountMinor: calculation.discountMinor, subtotalAfterDiscountMinor: parsed.data.subtotalMinor - calculation.discountMinor });
  } catch (error) {
    console.error("Coupon validation failed", error);
    return NextResponse.json({ message: "Coupons are unavailable right now." }, { status: 503 });
  }
}
