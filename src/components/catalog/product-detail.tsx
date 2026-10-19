"use client";

import { useState } from "react";
import { Check, Info, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import type { StoreProduct } from "@/lib/products";
import { formatINR } from "@/components/catalog/product-card";
import { useCart } from "@/components/cart/cart-provider";

export function ProductDetail({ product }: { product: StoreProduct }) {
  const [selected, setSelected] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];
  const unitPrice = product.price + (variant?.priceAdjustment ?? 0);
  const totalPrice = unitPrice * quantity;

  function addToBag() {
    add(product, selected, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="detail-copy">
      <span className="eyebrow">
        <Sparkles size={13} style={{ color: "var(--caramel)" }} />
        {product.category}
      </span>
      <h1>{product.name}</h1>
      <div className="detail-price">{formatINR(unitPrice)}</div>
      <p>{product.description}</p>

      {product.variants.length > 1 && (
        <div className="detail-options">
          <div className="option-title">Choose your size</div>
          <div className="option-row">
            {product.variants.map((item) => {
              const isSelected = selected === item.id;
              return (
                <button
                  className={`option${isSelected ? " selected" : ""}`}
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(item.id)}
                >
                  <span>{item.name}</span>
                  {item.priceAdjustment > 0 && (
                    <span style={{ opacity: isSelected ? 0.9 : 0.65, marginLeft: 4 }}>
                      · +{formatINR(item.priceAdjustment)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="detail-quantity">
        <div className="qty-control">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            <Minus size={14} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => Math.min(20, value + 1))}
          >
            <Plus size={14} />
          </button>
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          Quantity ({formatINR(totalPrice)})
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 32 }}>
        <button
          className="button"
          type="button"
          disabled={!product.available}
          onClick={addToBag}
          style={{ minWidth: 240 }}
        >
          {added ? <Check size={16} /> : <ShoppingBag size={16} />}
          {added
            ? `Added ${quantity} to your bag`
            : product.available
            ? `Add to bag · ${formatINR(totalPrice)}`
            : "Currently unavailable"}
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 24,
          marginTop: 12,
        }}
      >
        <div className="option-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={13} style={{ color: "var(--caramel)" }} /> Made with care
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, margin: 0 }}>
          Ask our barista team about oat, almond, or dairy alternatives when you visit. Please tell us about any dietary allergies or preferences before we prepare your drink.
        </p>
      </div>
    </div>
  );
}
