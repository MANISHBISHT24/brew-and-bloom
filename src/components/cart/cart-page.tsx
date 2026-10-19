"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatINR } from "@/components/catalog/product-card";
import { useCart } from "@/components/cart/cart-provider";

export function CartPage() {
  const { items, subtotal, change, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="empty-state page-wrap">
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--cream)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
            color: "var(--coffee)",
          }}
        >
          <ShoppingBag size={28} />
        </div>
        <span className="eyebrow">Your bag</span>
        <h2>A little room for something good.</h2>
        <p>Your bag is empty for now. Find a coffee or fresh morning pastry to get started.</p>
        <Link href="/menu" className="button">
          Explore the menu <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="shell cart-layout">
      <div>
        <span className="eyebrow">Your selection</span>
        <h1 className="section-title" style={{ marginBottom: 28 }}>
          In your bag.
        </h1>

        <div style={{ borderTop: "1px solid var(--line)" }}>
          {items.map((item) => (
            <article className="cart-row" key={item.key}>
              <div className="cart-thumb">
                <Image src={item.image} alt={item.name} fill sizes="108px" />
              </div>
              <div>
                <Link className="product-name" href={`/menu/${item.slug}`}>
                  {item.name}
                </Link>
                <p className="product-desc" style={{ minHeight: 0, margin: "4px 0 12px" }}>
                  {item.variantName}
                </p>
                <div className="qty-control">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name} quantity`}
                    onClick={() => change(item.key, item.quantity - 1)}
                  >
                    <Minus size={13} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.name} quantity`}
                    onClick={() => change(item.key, item.quantity + 1)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: 14, color: "var(--espresso-deep)" }}>
                  {formatINR(item.unitPrice * item.quantity)}
                </strong>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: 0,
                    background: "none",
                    cursor: "pointer",
                    padding: "10px",
                    marginLeft: "auto",
                    color: "var(--muted)",
                    borderRadius: "var(--radius-xs)",
                    transition: "color 0.2s, background 0.2s",
                  }}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="cart-summary">
        <h2>Your order.</h2>
        <div className="summary-line">
          <span>Subtotal estimate</span>
          <span style={{ fontWeight: 600, color: "var(--espresso)" }}>
            {formatINR(subtotal)}
          </span>
        </div>
        <div className="summary-line">
          <span>Café pickup</span>
          <span style={{ color: "var(--sage)", fontWeight: 600 }}>Included free</span>
        </div>

        <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--muted)", margin: "16px 0" }}>
          We’ll check current menu availability and calculate the final total when you continue to checkout.
        </p>

        <div className="summary-line summary-total">
          <span>Estimated total</span>
          <span>{formatINR(subtotal)}</span>
        </div>

        <Link
          href="/checkout"
          className="button"
          style={{ width: "100%", marginTop: 18 }}
        >
          Continue to checkout <ArrowRight size={14} />
        </Link>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/menu" className="text-link">
            Keep browsing the menu
          </Link>
        </div>
      </aside>
    </div>
  );
}
