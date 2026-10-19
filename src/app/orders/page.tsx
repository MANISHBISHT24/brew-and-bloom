import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Package, Sparkles } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { formatINR } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your orders", robots: { index: false, follow: false } };

export default async function OrdersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/account");

  let orders: Array<{
    id: string;
    orderNumber: string;
    total: { toString: () => string };
    createdAt: Date;
    type: string;
    status: string;
    items: Array<{ id: string; quantity: number; productName: string; variantName: string | null }>;
  }> = [];

  if (process.env.DATABASE_URL) {
    try {
      orders = await getPrisma().order.findMany({
        where: { userId: session.user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } catch {
      orders = [];
    }
  }

  return (
    <div className="shell page-wrap" style={{ paddingTop: 50, paddingBottom: 100 }}>
      <span className="eyebrow">
        <Sparkles size={12} style={{ color: "var(--caramel)" }} />
        A record of the good things
      </span>
      <h1 className="section-title" style={{ marginBottom: 30 }}>
        Your orders.
      </h1>

      {orders.length ? (
        orders.map((order) => (
          <article
            key={order.id}
            className="admin-panel"
            style={{ marginBottom: 16, borderRadius: "var(--radius-md)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16, fontFamily: "monospace" }}>{order.orderNumber}</strong>
              <strong style={{ fontSize: 16, color: "var(--coffee)" }}>
                {formatINR(Number(order.total.toString()))}
              </strong>
            </div>
            <p className="section-copy" style={{ fontSize: 13, margin: "8px 0" }}>
              {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              <span style={{ textTransform: "capitalize" }}>{order.type.toLowerCase()}</span> ·{" "}
              <span style={{ textTransform: "capitalize", color: "var(--caramel)" }}>
                {order.status.replaceAll("_", " ").toLowerCase()}
              </span>
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 16px" }}>
              {order.items
                .map(
                  (item) =>
                    `${item.quantity} × ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`
                )
                .join(", ")}
            </p>
            <Link className="text-link" href={`/orders/${order.orderNumber}`}>
              Track this order <ArrowRight size={13} />
            </Link>
          </article>
        ))
      ) : (
        <div className="empty-state">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--cream)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "var(--coffee)",
            }}
          >
            <Package size={26} />
          </div>
          <h2>Your next coffee is waiting.</h2>
          <p>Orders placed while signed in will appear here with live preparation updates.</p>
          <Link className="button" href="/menu">
            Explore the menu <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
