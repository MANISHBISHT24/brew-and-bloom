import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { applyProviderRefundStatus, type ProviderRefundStatus } from "@/lib/payments/refunds";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ action: z.enum(["issue", "reconcile"]).default("issue"), reason: z.string().trim().max(500).optional() }).strict();

function sameOrigin(request: Request) {
  try {
    return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function providerStatus(status: string): ProviderRefundStatus | null {
  if (status === "pending" || status === "processed" || status === "failed") return status;
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: { message: "Administrator access is required." } }, { status: session ? 403 : 401 });
  if (!process.env.DATABASE_URL || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: { message: "Razorpay refunds are not configured." } }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await safeJson(request, 2000);
  } catch {
    return NextResponse.json({ error: { message: "Invalid refund request." } }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid refund request." } }, { status: 400 });

  const { id: orderId } = await params;
  const db = getPrisma();
  const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

  if (parsed.data.action === "reconcile") {
    try {
      const pending = await db.refund.findFirst({ where: { orderId, status: "PENDING" }, include: { payment: true }, orderBy: { createdAt: "desc" } });
      if (!pending?.payment.providerPaymentId) return NextResponse.json({ error: { message: "There is no pending provider refund to reconcile." } }, { status: 409 });
      const providerRefunds = await razorpay.payments.fetchMultipleRefund(pending.payment.providerPaymentId, { count: 100 });
      const providerRefund = providerRefunds.items.find((item) => Boolean((pending.providerReceipt && item.receipt === pending.providerReceipt) || (pending.providerRefundId && item.id === pending.providerRefundId)));
      if (!providerRefund) return NextResponse.json({ error: { message: "No matching refund appears in Razorpay yet. The request remains pending; do not submit another refund." } }, { status: 409 });
      const status = providerStatus(providerRefund.status);
      const expectedAmount = Math.round(Number(pending.amount.toString()) * 100);
      if (!status || providerRefund.payment_id !== pending.payment.providerPaymentId || providerRefund.amount !== expectedAmount || providerRefund.currency !== pending.payment.currency) {
        return NextResponse.json({ error: { message: "Razorpay returned an unexpected refund record. Check the provider dashboard before taking action." } }, { status: 502 });
      }
      const state = await db.$transaction(async (tx) => {
        const nextState = await applyProviderRefundStatus(tx, { refundId: pending.id, providerRefundId: providerRefund.id, status });
        await tx.auditLog.create({ data: { actorId: session.user.id, action: "REFUND_RECONCILED", entityType: "Refund", entityId: pending.id, details: { providerRefundId: providerRefund.id, status: nextState } } });
        return nextState;
      });
      const responseStatus = state?.toLowerCase() ?? "pending";
      return NextResponse.json({ refundId: pending.id, status: responseStatus, reconciled: true }, { status: responseStatus === "pending" ? 202 : 200 });
    } catch (error) {
      console.error("Razorpay refund reconciliation failed", error);
      return NextResponse.json({ error: { message: "Refund status could not be checked. The current request remains pending." } }, { status: 502 });
    }
  }

  const providerReceipt = `bb_${randomUUID().replaceAll("-", "")}`;
  let claim: { refundId: string; providerPaymentId: string; amountMinor: number; currency: string; orderNumber: string; reason: string | null };

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { payment: true } });
      if (!order) return { kind: "not-found" as const };
      const payment = order.payment;
      if (!payment || !payment.providerPaymentId) return { kind: "payment-missing" as const };

      const previous = await tx.refund.findMany({ where: { paymentId: payment.id }, orderBy: { createdAt: "desc" }, take: 1 });
      if (previous[0]?.status === "PENDING") return { kind: "pending" as const };
      if (previous[0]?.status === "PROCESSED" || payment.status === "REFUNDED") return { kind: "already-refunded" as const };
      if (payment.status !== "PAID" || order.paymentStatus !== "PAID") return { kind: "not-paid" as const };

      // This conditional claim makes concurrent admin clicks create at most one provider request.
      const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: "PAID" }, data: { status: "REFUND_PENDING" } });
      if (claimed.count !== 1) return { kind: "pending" as const };

      const refund = await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          providerReceipt,
          amount: payment.amount,
          reason: parsed.data.reason || null,
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" } });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "REFUND_INITIATED",
          entityType: "Refund",
          entityId: refund.id,
          details: { orderNumber: order.orderNumber, amount: payment.amount.toString(), reason: parsed.data.reason ?? null },
        },
      });

      return {
        kind: "created" as const,
        claim: {
          refundId: refund.id,
          providerPaymentId: payment.providerPaymentId,
          amountMinor: Math.round(Number(payment.amount.toString()) * 100),
          currency: payment.currency,
          orderNumber: order.orderNumber,
          reason: parsed.data.reason || null,
        },
      };
    });

    if (result.kind === "not-found") return NextResponse.json({ error: { message: "Order not found." } }, { status: 404 });
    if (result.kind === "payment-missing") return NextResponse.json({ error: { message: "No verified provider payment is available for this order." } }, { status: 409 });
    if (result.kind === "pending") return NextResponse.json({ error: { message: "A refund request is already in progress. Check its status before retrying." } }, { status: 409 });
    if (result.kind === "already-refunded") return NextResponse.json({ error: { message: "This order has already been refunded." } }, { status: 409 });
    if (result.kind === "not-paid") return NextResponse.json({ error: { message: "Only a verified paid order can be refunded." } }, { status: 409 });
    claim = result.claim;
  } catch (error) {
    console.error("Refund reservation failed", error);
    return NextResponse.json({ error: { message: "The refund request could not be reserved." } }, { status: 503 });
  }

  try {
    const refund = await razorpay.payments.refund(claim.providerPaymentId, {
      amount: claim.amountMinor,
      receipt: providerReceipt,
      notes: { orderNumber: claim.orderNumber, reason: claim.reason ?? "" },
    });
    const status = providerStatus(refund.status);
    if (!refund.id || refund.payment_id !== claim.providerPaymentId || refund.amount !== claim.amountMinor || refund.currency !== claim.currency || !status) {
      console.error("Razorpay returned an unexpected refund response", { orderNumber: claim.orderNumber, refundId: refund.id });
      return NextResponse.json({ error: { message: "Razorpay returned an unconfirmed refund result. Check the provider dashboard before retrying." } }, { status: 502 });
    }

    await db.$transaction(async (tx) => {
      const state = await applyProviderRefundStatus(tx, { refundId: claim.refundId, providerRefundId: refund.id, status });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: state === "PROCESSED" ? "REFUND_PROCESSED" : state === "FAILED" ? "REFUND_FAILED" : "REFUND_SUBMITTED",
          entityType: "Refund",
          entityId: claim.refundId,
          details: { providerRefundId: refund.id, status: state },
        },
      });
    });

    return NextResponse.json({ refundId: claim.refundId, status }, { status: status === "pending" ? 202 : 200 });
  } catch (error) {
    const statusCode = Number((error as { statusCode?: string | number } | null)?.statusCode);
    if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 500) {
      try {
        const state = await db.$transaction(async (tx) => {
          const nextState = await applyProviderRefundStatus(tx, { refundId: claim.refundId, status: "failed" });
          await tx.auditLog.create({ data: { actorId: session.user.id, action: "REFUND_REJECTED", entityType: "Refund", entityId: claim.refundId, details: { providerStatusCode: statusCode } } });
          return nextState;
        });
        if (state === "PROCESSED") return NextResponse.json({ refundId: claim.refundId, status: "processed" });
        return NextResponse.json({ error: { message: "Razorpay rejected the refund request. Review the order and try again if appropriate." } }, { status: 502 });
      } catch (databaseError) {
        console.error("Could not record Razorpay refund rejection", databaseError);
      }
    }
    console.error("Razorpay refund result is uncertain", error);
    try {
      const latest = await db.refund.findUnique({ where: { id: claim.refundId } });
      if (latest?.status === "PROCESSED") return NextResponse.json({ refundId: claim.refundId, status: "processed" });
      if (latest?.status === "FAILED") return NextResponse.json({ error: { message: "Razorpay rejected this refund. Review the order before trying again." } }, { status: 502 });
    } catch (lookupError) {
      console.error("Could not check the latest refund state", lookupError);
    }
    return NextResponse.json({ error: { message: "Razorpay could not confirm whether the refund was initiated. Check its dashboard before retrying." } }, { status: 502 });
  }
}
