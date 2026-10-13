import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@/generated/prisma/client";
import { canTransitionOrder } from "@/lib/orders";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { releaseInventory } from "@/lib/payments/inventory";
import { releaseCouponReservation } from "@/lib/coupons";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ status: z.enum(OrderStatus), reason: z.string().trim().max(500).optional() });

function sameOrigin(request: Request) {
  try {
    return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: { message: "Administrator access is required." } }, { status: session ? 403 : 401 });

  let raw: unknown;
  try {
    raw = await safeJson(request, 2000);
  } catch {
    return NextResponse.json({ error: { message: "Invalid status update." } }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid status update." } }, { status: 400 });
  if (parsed.data.status === "REFUND_PENDING" || parsed.data.status === "REFUNDED") {
    return NextResponse.json({ error: { message: "Refund statuses are controlled by the verified refund workflow." } }, { status: 409 });
  }

  const { id } = await params;
  try {
    const db = getPrisma();
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: { message: "Order not found." } }, { status: 404 });
    if (!canTransitionOrder(order.status, parsed.data.status)) return NextResponse.json({ error: { message: `Order cannot move from ${order.status} to ${parsed.data.status}.` } }, { status: 409 });
    if (parsed.data.status === "CANCELLED" && order.paymentStatus === "PAID") {
      return NextResponse.json({ error: { message: "Paid orders require the refund workflow before cancellation." } }, { status: 409 });
    }

    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.order.update({ where: { id }, data: { status: parsed.data.status, cancellationReason: parsed.data.status === "CANCELLED" ? parsed.data.reason : undefined } });
      if (parsed.data.status === "CANCELLED") {
        await releaseInventory(tx, id);
        await releaseCouponReservation(tx, id);
      }
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: id, details: { from: order.status, to: parsed.data.status, reason: parsed.data.reason } } });
      return saved;
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error("Admin order status update failed", error);
    return NextResponse.json({ error: { message: "Order status could not be updated." } }, { status: 503 });
  }
}
