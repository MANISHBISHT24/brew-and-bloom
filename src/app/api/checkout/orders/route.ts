import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { Prisma } from "@/generated/prisma/client";
import { releaseInventory } from "@/lib/payments/inventory";
import { getPrisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation/checkout";
import { safeJson } from "@/lib/validation/common";
import { calculateOrderTotals, fromMinorUnits, percentToBasisPoints, toMinorUnits } from "@/lib/money";
import { createOrderTrackingToken } from "@/lib/orders/tracking-token";
import { calculateCouponDiscount, releaseCouponReservation } from "@/lib/coupons";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try { return !!origin && new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

function paymentResponse(orderNumber: string, razorpayOrderId: string, amount: string | number, currency: string) {
  return NextResponse.json({ orderNumber, trackingToken: createOrderTrackingToken(orderNumber), razorpayOrderId, amountMinor: Number(amount), currency, keyId: process.env.RAZORPAY_KEY_ID });
}

async function createProviderOrder(orderNumber: string, amount: Prisma.Decimal) {
  const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  return client.orders.create({ amount: amount.mul(100).toNumber(), currency: "INR", receipt: orderNumber, notes: { orderNumber } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`checkout:${ip}`, 4, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: { message: "Please wait a moment before trying again." } }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "Checkout needs a PostgreSQL database. See the local setup guide." } }, { status: 503 });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: { code: "PAYMENTS_NOT_CONFIGURED", message: "Online payment is disabled until the café configures Razorpay test credentials." } }, { status: 503 });
  if (!process.env.AUTH_SECRET) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Secure order tracking is unavailable until AUTH_SECRET is configured." } }, { status: 503 });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ error: { message: "A valid idempotency key is required." } }, { status: 400 });
  let raw: unknown;
  try { raw = await safeJson(request, 16_000); }
  catch { return NextResponse.json({ error: { message: "Please check the checkout details and try again." } }, { status: 400 }); }
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Please check your contact and delivery details." } }, { status: 400 });
  const input = parsed.data;
  const db = getPrisma();

  try {
    const existing = await db.order.findUnique({ where: { idempotencyKey }, include: { payment: true } });
    if (existing?.payment?.providerOrderId) return paymentResponse(existing.orderNumber, existing.payment.providerOrderId, Number(existing.total.mul(100).toString()), existing.currency);
    if (existing && existing.status !== "PENDING_PAYMENT") return NextResponse.json({ error: { message: "This checkout attempt has expired. Start a new one from your bag." } }, { status: 409 });
    if (existing) {
      const providerOrder = await createProviderOrder(existing.orderNumber, new Prisma.Decimal(existing.total));
      await db.payment.update({ where: { orderId: existing.id }, data: { providerOrderId: providerOrder.id } });
      return paymentResponse(existing.orderNumber, providerOrder.id, providerOrder.amount, providerOrder.currency);
    }

    const session = process.env.AUTH_SECRET ? await getCurrentSession() : null;
    const settings = await db.storeSettings.findUnique({ where: { key: "default" } });
    if (input.type === "DELIVERY" && (!settings?.deliveryEnabled || !input.address)) return NextResponse.json({ error: { message: "Delivery is not available for this café yet." } }, { status: 400 });
    if (input.type === "PICKUP" && settings?.pickupEnabled === false) return NextResponse.json({ error: { message: "Pickup is not available right now." } }, { status: 400 });

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await db.product.findMany({ where: { id: { in: productIds }, archivedAt: null, isAvailable: true }, include: { variants: { where: { isAvailable: true } } } });
    if (products.length !== productIds.length) return NextResponse.json({ error: { message: "One or more items are no longer available. Refresh your bag and try again." } }, { status: 409 });
    const productById = new Map(products.map((product) => [product.id, product]));
    const lines = input.items.map((item) => {
      const product = productById.get(item.productId);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      if (!product || !variant) throw new Error("UNAVAILABLE_ITEM");
      const unitPrice = new Prisma.Decimal(product.basePrice).add(variant.priceAdjustment);
      return { product, variant, quantity: item.quantity, unitPrice, unitPriceMinor: toMinorUnits(unitPrice.toFixed(2)), lineTotal: unitPrice.mul(item.quantity) };
    });
    const deliveryFeeMinor = input.type === "DELIVERY" ? toMinorUnits(settings?.deliveryFee.toString() ?? "0") : 0;
    const subtotalMinor = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
    const coupon = input.couponCode ? await db.coupon.findUnique({ where: { code: input.couponCode } }) : null;
    if (input.couponCode && !coupon) return NextResponse.json({ error: { message: "That coupon is not available." } }, { status: 400 });
    let discountMinor = 0;
    if (coupon) {
      const calculation = calculateCouponDiscount(subtotalMinor, { isActive: coupon.isActive, discountType: coupon.discountType, discountValue: coupon.discountValue.toString(), minimumSubtotal: coupon.minimumSubtotal?.toString() ?? null, maxRedemptions: coupon.maxRedemptions, redeemedCount: coupon.redeemedCount, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt });
      if (!calculation.ok) return NextResponse.json({ error: { message: calculation.message } }, { status: 400 });
      if (session && await db.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } }, select: { id: true } })) return NextResponse.json({ error: { message: "This account has already used that coupon." } }, { status: 409 });
      discountMinor = calculation.discountMinor;
    }
    const totals = calculateOrderTotals(lines, { taxableMinor: subtotalMinor - discountMinor, deliveryFeeMinor, taxRateBasisPoints: percentToBasisPoints(settings?.taxRatePercent.toString() ?? "0") });
    const minimumMinor = toMinorUnits(settings?.minimumOrder.toString() ?? "0");
    if (input.type === "DELIVERY" && totals.subtotalMinor < minimumMinor) return NextResponse.json({ error: { message: `Delivery requires a minimum subtotal of ₹${fromMinorUnits(minimumMinor)}.` } }, { status: 400 });
    if (totals.totalMinor <= 0 || totals.totalMinor > 25_000_000) return NextResponse.json({ error: { message: "This order total is outside the supported range." } }, { status: 400 });
    const subtotal = new Prisma.Decimal(fromMinorUnits(totals.subtotalMinor));
    const discountAmount = new Prisma.Decimal(fromMinorUnits(discountMinor));
    const deliveryFee = new Prisma.Decimal(fromMinorUnits(totals.deliveryFeeMinor));
    const taxAmount = new Prisma.Decimal(fromMinorUnits(totals.taxMinor));
    const total = new Prisma.Decimal(fromMinorUnits(totals.totalMinor));
    const orderNumber = `BB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({ data: {
        orderNumber, idempotencyKey, userId: session?.user.id,
        customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone,
        type: input.type, status: "PENDING_PAYMENT", paymentStatus: "PENDING", currency: "INR",
        subtotal, discountAmount, couponCode: coupon?.code, taxAmount, deliveryFee, total,
        deliveryAddress: input.address ? { line1: input.address.line1, line2: input.address.line2 ?? "", city: input.address.city, region: input.address.region, postalCode: input.address.postalCode } : undefined,
        deliveryInstructions: input.address?.instructions,
        items: { create: lines.map((line) => ({ productId: line.product.id, productName: line.product.name, productSlug: line.product.slug, variantName: line.variant.name, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal })) },
        payment: { create: { amount: total, currency: "INR", status: "PENDING" } },
      } });
      for (const line of lines) {
        if (line.variant.stockQuantity === null) continue;
        const reserved = await tx.productVariant.updateMany({ where: { id: line.variant.id, isAvailable: true, stockQuantity: { gte: line.quantity } }, data: { stockQuantity: { decrement: line.quantity } } });
        if (reserved.count !== 1) throw new Error("OUT_OF_STOCK");
        await tx.inventoryMovement.create({ data: { productId: line.product.id, variantId: line.variant.id, quantity: -line.quantity, reason: "ORDER_RESERVATION", orderId: created.id } });
      }
      if (coupon) {
        const now = new Date();
        const currentCoupon = await tx.coupon.findUnique({ where: { id: coupon.id } });
        if (!currentCoupon) throw new Error("COUPON_UNAVAILABLE");
        const currentCalculation = calculateCouponDiscount(subtotalMinor, { isActive: currentCoupon.isActive, discountType: currentCoupon.discountType, discountValue: currentCoupon.discountValue.toString(), minimumSubtotal: currentCoupon.minimumSubtotal?.toString() ?? null, maxRedemptions: currentCoupon.maxRedemptions, redeemedCount: currentCoupon.redeemedCount, startsAt: currentCoupon.startsAt, expiresAt: currentCoupon.expiresAt }, now);
        if (!currentCalculation.ok || currentCalculation.discountMinor !== discountMinor) throw new Error("COUPON_UNAVAILABLE");
        if (session && await tx.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } }, select: { id: true } })) throw new Error("COUPON_ALREADY_USED");
        const reservedCoupon = await tx.coupon.updateMany({ where: { id: coupon.id, isActive: true, ...(currentCoupon.maxRedemptions === null ? {} : { redeemedCount: { lt: currentCoupon.maxRedemptions } }), AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] }, data: { redeemedCount: { increment: 1 } } });
        if (reservedCoupon.count !== 1) throw new Error("COUPON_UNAVAILABLE");
        await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: session?.user.id, orderId: created.id } });
      }
      return created;
    });

    try {
      const providerOrder = await createProviderOrder(order.orderNumber, total);
      await db.payment.update({ where: { orderId: order.id }, data: { providerOrderId: providerOrder.id } });
      return paymentResponse(orderNumber, providerOrder.id, providerOrder.amount, providerOrder.currency);
    } catch (providerError) {
      await db.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED" } });
        await tx.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
        await releaseInventory(tx, order.id);
        await releaseCouponReservation(tx, order.id);
      });
      throw providerError;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAVAILABLE_ITEM") return NextResponse.json({ error: { message: "An item or size in your bag is no longer available." } }, { status: 409 });
    if (error instanceof Error && error.message === "OUT_OF_STOCK") return NextResponse.json({ error: { message: "A selected size just sold out. Refresh your bag and try again." } }, { status: 409 });
    if (error instanceof Error && error.message === "COUPON_ALREADY_USED") return NextResponse.json({ error: { message: "This account has already used that coupon." } }, { status: 409 });
    if (error instanceof Error && error.message === "COUPON_UNAVAILABLE") return NextResponse.json({ error: { message: "That coupon is no longer available. Remove it and try checkout again." } }, { status: 409 });
    if ((error as { code?: string }).code === "P2002") {
      const existing = await db.order.findUnique({ where: { idempotencyKey }, include: { payment: true } });
      if (existing?.payment?.providerOrderId) return paymentResponse(existing.orderNumber, existing.payment.providerOrderId, Number(existing.total.mul(100).toString()), existing.currency);
      if (input.couponCode) return NextResponse.json({ error: { message: "That coupon cannot be applied to this order." } }, { status: 409 });
    }
    console.error("Order creation failed", error);
    return NextResponse.json({ error: { message: "We couldn't start checkout. Please try again." } }, { status: 503 });
  }
}
