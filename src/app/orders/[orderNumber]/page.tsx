import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { verifyOrderTrackingToken } from "@/lib/orders/tracking-token";
import { canCustomerCancelOrder } from "@/lib/orders";
import { CancelOrderForm } from "@/components/orders/cancel-order-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false } };

const stages = ["PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"];

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ orderNumber }, { token }] = await Promise.all([params, searchParams]);
  const trackingAccess = verifyOrderTrackingToken(orderNumber, token);
  const session = trackingAccess ? null : await getCurrentSession();

  if (!trackingAccess && !session) redirect("/account");

  let order = null;
  try {
    order = await getPrisma().order.findFirst({
      where: trackingAccess ? { orderNumber } : { orderNumber, userId: session!.user.id },
      include: { items: true, payment: true },
    });
  } catch {
    return (
      <div className="shell content-page">
        <span className="eyebrow">Order status</span>
        <h1 className="section-title">Order tracking</h1>
        <div className="notice" role="status" style={{ margin: "24px 0" }}>
          Order history and tracking require a configured PostgreSQL database. Connect your database to review live orders.
        </div>
        <Link className="button" href="/menu">
          Explore the menu
        </Link>
      </div>
    );
  }

  if (!order) notFound();

  const current = stages.indexOf(order.status);

  return (
    <div className="shell content-page page-wrap">
      <span className="eyebrow">
        <Sparkles size={12} style={{ color: "var(--caramel)" }} />
        Your order
      </span>
      <h1 className="section-title">On its way to a good moment.</h1>

      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--line-subtle)",
          borderRadius: "var(--radius-md)",
          padding: 24,
          margin: "24px 0",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Order number
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--espresso-deep)", fontFamily: "monospace" }}>
              {order.orderNumber}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Current status
            </span>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--coffee)", textTransform: "capitalize" }}>
              {order.status.replaceAll("_", " ").toLowerCase()}
            </div>
          </div>
        </div>

        {order.paymentStatus !== "PAID" && (
          <div className="notice" style={{ marginBottom: 16 }}>
            Payment status: <strong>{order.paymentStatus.toLowerCase()}</strong>. The café will prepare orders once payment is verified.
          </div>
        )}

        {order.status === "CANCELLED" && order.cancellationReason && (
          <div className="notice" style={{ marginBottom: 16 }}>
            Cancellation note: {order.cancellationReason}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 16 }}>
            Preparation timeline
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {stages.map((stage, index) => {
              const isPastOrCurrent = index <= current;
              return (
                <div
                  key={stage}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    opacity: isPastOrCurrent ? 1 : 0.4,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isPastOrCurrent ? "var(--caramel)" : "var(--line)",
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isPastOrCurrent ? <Check size={12} strokeWidth={3} /> : index + 1}
                  </span>
                  <span style={{ fontSize: 13, textTransform: "capitalize", fontWeight: isPastOrCurrent ? 600 : 400 }}>
                    {stage.toLowerCase().replaceAll("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, margin: "32px 0 16px" }}>
        In this order
      </h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
        {order.items.map((item) => (
          <li key={item.id} style={{ fontSize: 14, color: "var(--espresso)" }}>
            <strong>{item.quantity} ×</strong> {item.productName}
            {item.variantName ? ` (${item.variantName})` : ""}
          </li>
        ))}
      </ul>

      {canCustomerCancelOrder(order.status, order.paymentStatus) && (
        <section style={{ marginTop: 36, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, margin: "0 0 8px" }}>
            Need to cancel?
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Unpaid orders can be cancelled before preparation begins. Paid orders need café assistance.
          </p>
          <CancelOrderForm orderNumber={order.orderNumber} trackingToken={trackingAccess ? token : undefined} />
        </section>
      )}
    </div>
  );
}
