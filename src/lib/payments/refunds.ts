import type { Prisma } from "@/generated/prisma/client";

export type ProviderRefundStatus = "pending" | "processed" | "failed";

/** Apply provider-confirmed refund state without allowing late events to undo a terminal result. */
export async function applyProviderRefundStatus(
  tx: Prisma.TransactionClient,
  input: { refundId: string; providerRefundId?: string | null; status: ProviderRefundStatus },
) {
  const refund = await tx.refund.findUnique({ where: { id: input.refundId } });
  if (!refund) return null;
  if (refund.status === "PROCESSED" || refund.status === "FAILED") return refund.status;

  const status = input.status === "processed" ? "PROCESSED" : input.status === "failed" ? "FAILED" : "PENDING";
  await tx.refund.update({
    where: { id: refund.id },
    data: { ...(input.providerRefundId ? { providerRefundId: input.providerRefundId } : {}), status },
  });

  const paymentStatus = status === "PROCESSED" ? "REFUNDED" : status === "FAILED" ? "PAID" : "REFUND_PENDING";
  await tx.payment.update({ where: { id: refund.paymentId }, data: { status: paymentStatus } });
  await tx.order.update({
    where: { id: refund.orderId },
    data: {
      status: status === "PROCESSED" ? "REFUNDED" : "REFUND_PENDING",
      paymentStatus,
    },
  });

  return status;
}
