import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { applyProviderRefundStatus, type ProviderRefundStatus } from "@/lib/payments/refunds";
import { verifyHmacSha256 } from "@/lib/payments/signature";
import { releaseInventory } from "@/lib/payments/inventory";
import { releaseCouponReservation } from "@/lib/coupons";

type RazorpayEvent = {
  event?: unknown;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; receipt?: string | null; amount?: number; currency?: string; status?: string } };
  };
};

function refundStatus(eventName: string, status: string | undefined): ProviderRefundStatus | null {
  if (eventName === "refund.processed" || status === "processed") return "processed";
  if (eventName === "refund.failed" || status === "failed") return "failed";
  if (eventName === "refund.created" || status === "pending") return "pending";
  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!process.env.DATABASE_URL || !webhookSecret) return NextResponse.json({ error: "Webhook processing is not configured." }, { status: 503 });

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 128_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyHmacSha256(raw, signature, webhookSecret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  const eventName = typeof event.event === "string" ? event.event : "";
  const db = getPrisma();

  if (eventName.startsWith("refund.")) {
    const entity = event.payload?.refund?.entity;
    if (!entity?.id || !entity.payment_id) return NextResponse.json({ received: true });
    const status = refundStatus(eventName, entity.status);
    if (!status) return NextResponse.json({ received: true });
    const providerEventId = request.headers.get("x-razorpay-event-id") ?? `${eventName}:${entity.id}`;

    try {
      await db.$transaction(async (tx) => {
        await tx.webhookEvent.create({ data: { providerEventId, eventType: eventName } });
        const payment = await tx.payment.findUnique({ where: { providerPaymentId: entity.payment_id } });
        if (!payment) return;
        const refund = await tx.refund.findFirst({
          where: {
            paymentId: payment.id,
            OR: [
              { providerRefundId: entity.id },
              ...(entity.receipt ? [{ providerReceipt: entity.receipt }] : []),
            ],
          },
        });
        if (!refund) return;
        const expectedAmount = Math.round(Number(refund.amount.toString()) * 100);
        if ((entity.amount !== undefined && entity.amount !== expectedAmount) || (entity.currency && entity.currency !== payment.currency)) return;
        await applyProviderRefundStatus(tx, { refundId: refund.id, providerRefundId: entity.id, status });
      });
      return NextResponse.json({ received: true });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return NextResponse.json({ received: true });
      console.error("Razorpay refund webhook processing failed", error);
      return NextResponse.json({ error: "Webhook processing failed; provider may retry." }, { status: 500 });
    }
  }

  const entity = event.payload?.payment?.entity;
  if (!entity?.id || !entity.order_id) return NextResponse.json({ received: true });
  const providerEventId = request.headers.get("x-razorpay-event-id") ?? `${eventName}:${entity.id}`;
  try {
    await db.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { providerEventId, eventType: eventName } });
      const payment = await tx.payment.findUnique({ where: { providerOrderId: entity.order_id } });
      if (!payment) return;

      if ((eventName === "payment.captured" || eventName === "order.paid") && ["PENDING", "AUTHORIZED", "FAILED"].includes(payment.status)) {
        const amountMinor = Math.round(Number(payment.amount.toString()) * 100);
        if (entity.amount !== undefined && entity.amount !== amountMinor) return;
        if (entity.currency && entity.currency !== payment.currency) return;

        const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: { in: ["PENDING", "AUTHORIZED", "FAILED"] } }, data: { status: "PAID", providerPaymentId: entity.id } });
        if (claimed.count !== 1) return;
        const placed = await tx.order.updateMany({ where: { id: payment.orderId, status: "PENDING_PAYMENT" }, data: { status: "PLACED", paymentStatus: "PAID" } });
        if (placed.count === 0) {
          const needsRefund = await tx.order.updateMany({ where: { id: payment.orderId, status: { in: ["CANCELLED", "PAYMENT_FAILED"] } }, data: { status: "REFUND_PENDING", paymentStatus: "PAID" } });
          if (needsRefund.count === 0) {
            await tx.order.updateMany({ where: { id: payment.orderId, status: { notIn: ["REFUND_PENDING", "REFUNDED"] } }, data: { paymentStatus: "PAID" } });
          }
        }
      } else if (eventName === "payment.failed" && ["PENDING", "AUTHORIZED"].includes(payment.status)) {
        const failedPayment = await tx.payment.updateMany({ where: { id: payment.id, status: { in: ["PENDING", "AUTHORIZED"] } }, data: { status: "FAILED", providerPaymentId: entity.id } });
        if (failedPayment.count !== 1) return;
        const failed = await tx.order.updateMany({ where: { id: payment.orderId, status: "PENDING_PAYMENT", paymentStatus: { not: "PAID" } }, data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
        if (failed.count === 1) {
          await releaseInventory(tx, payment.orderId);
          await releaseCouponReservation(tx, payment.orderId);
        }
      }
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ received: true });
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed; provider may retry." }, { status: 500 });
  }
}
