import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { verifyHmacSha256 } from "@/lib/payments/signature";
import { rateLimit } from "@/lib/rate-limit";
import { safeJson } from "@/lib/validation/common";

const bodySchema = z.object({
  orderNumber: z.string().min(8).max(40),
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try {
    return !!origin && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Request origin could not be verified." }, { status: 403 });
  if (!process.env.DATABASE_URL || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ message: "Payment verification is not configured." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`payment-verify:${ip}`, 8, 60_000).allowed) return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });

  let raw: unknown;
  try {
    raw = await safeJson(request, 5000);
  } catch {
    return NextResponse.json({ message: "Invalid payment verification request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ message: "Payment details could not be verified." }, { status: 400 });

  const input = parsed.data;
  const db = getPrisma();
  try {
    const payment = await db.payment.findFirst({ where: { providerOrderId: input.razorpay_order_id, order: { orderNumber: input.orderNumber } }, include: { order: true } });
    if (!payment) return NextResponse.json({ message: "Payment does not match a current order." }, { status: 404 });
    if (["PAID", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status) && payment.providerPaymentId === input.razorpay_payment_id) {
      return NextResponse.json({ verified: true, orderNumber: payment.order.orderNumber });
    }
    if (!verifyHmacSha256(`${input.razorpay_order_id}|${input.razorpay_payment_id}`, input.razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
      return NextResponse.json({ message: "Payment signature is invalid." }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const providerPayment = await razorpay.payments.fetch(input.razorpay_payment_id);
    const expectedAmount = Math.round(Number(payment.amount.toString()) * 100);
    if (providerPayment.order_id !== input.razorpay_order_id || providerPayment.amount !== expectedAmount || providerPayment.currency !== payment.currency || providerPayment.status !== "captured") {
      return NextResponse.json({ message: "Payment is not captured for the expected amount and order." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["PENDING", "AUTHORIZED", "FAILED"] } },
        data: { status: "PAID", providerPaymentId: input.razorpay_payment_id, failureCode: null, failureDescription: null },
      });
      if (claimed.count !== 1) {
        const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        if (current.providerPaymentId === input.razorpay_payment_id && ["PAID", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].includes(current.status)) return;
        throw new Error("Payment state changed before verification could be saved.");
      }

      const placed = await tx.order.updateMany({ where: { id: payment.orderId, status: "PENDING_PAYMENT" }, data: { status: "PLACED", paymentStatus: "PAID" } });
      if (placed.count === 0) {
        const refundRequired = await tx.order.updateMany({ where: { id: payment.orderId, status: { in: ["CANCELLED", "PAYMENT_FAILED"] } }, data: { status: "REFUND_PENDING", paymentStatus: "PAID" } });
        if (refundRequired.count === 0) {
          await tx.order.updateMany({ where: { id: payment.orderId, status: { notIn: ["REFUND_PENDING", "REFUNDED"] } }, data: { paymentStatus: "PAID" } });
        }
      }
    });
    return NextResponse.json({ verified: true, orderNumber: payment.order.orderNumber });
  } catch (error) {
    console.error("Payment verification failed", error);
    return NextResponse.json({ message: "Payment status could not be confirmed. Keep the order number and contact the café." }, { status: 503 });
  }
}
