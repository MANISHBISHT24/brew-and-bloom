import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { canCustomerCancelOrder } from "@/lib/orders";
import { verifyOrderTrackingToken } from "@/lib/orders/tracking-token";
import { releaseInventory } from "@/lib/payments/inventory";
import { releaseCouponReservation } from "@/lib/coupons";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ reason: z.string().trim().max(500).optional(), token: z.string().max(100).optional() });
function sameOrigin(request: Request) { try { return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host; } catch { return false; } }

export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Order cancellation is unavailable until the store database is configured." } }, { status: 503 });
  let raw: unknown;
  try { raw = await safeJson(request, 1_500); } catch { return NextResponse.json({ error: { message: "Invalid cancellation request." } }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid cancellation request." } }, { status: 400 });

  const { orderNumber } = await params;
  const tokenAccess = verifyOrderTrackingToken(orderNumber, parsed.data.token);
  const session = tokenAccess ? null : await getCurrentSession();
  if (!tokenAccess && !session) return NextResponse.json({ error: { message: "Sign in or use the private order tracking link to cancel." } }, { status: 401 });

  const db = getPrisma();
  const order = await db.order.findFirst({ where: tokenAccess ? { orderNumber } : { orderNumber, userId: session!.user.id } });
  if (!order) return NextResponse.json({ error: { message: "Order not found." } }, { status: 404 });
  if (order.paymentStatus === "PAID") return NextResponse.json({ error: { message: "This order has been paid. Contact the café for cancellation and refund assistance." } }, { status: 409 });
  if (!canCustomerCancelOrder(order.status, order.paymentStatus)) return NextResponse.json({ error: { message: "This order can no longer be cancelled online. Contact the café for assistance." } }, { status: 409 });

  try {
    const cancelled = await db.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: { in: ["PENDING_PAYMENT", "PLACED", "CONFIRMED"] }, paymentStatus: { not: "PAID" } },
        data: { status: "CANCELLED", cancellationReason: parsed.data.reason || "Cancellation requested by customer." },
      });
      if (updated.count !== 1) return false;
      await releaseInventory(tx, order.id);
      await releaseCouponReservation(tx, order.id);
      await tx.auditLog.create({ data: { actorId: session?.user.id, action: "CUSTOMER_ORDER_CANCELLED", entityType: "Order", entityId: order.id, details: { reason: parsed.data.reason ?? null } } });
      return true;
    });
    if (!cancelled) return NextResponse.json({ error: { message: "The order changed while we processed the request. Refresh and check its current status." } }, { status: 409 });
    return NextResponse.json({ cancelled: true, orderNumber });
  } catch (error) {
    console.error("Customer order cancellation failed", error);
    return NextResponse.json({ error: { message: "The cancellation could not be completed. Please try again or contact the café." } }, { status: 503 });
  }
}
