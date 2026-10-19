"use client";

import Script from "next/script";
import { FormEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { customerCheckoutSchema, type CustomerCheckoutValues } from "@/lib/validation/checkout-form";
import { formatINR } from "@/components/catalog/product-card";
import { useCart } from "@/components/cart/cart-provider";

type PaymentOrder = {
  orderNumber: string;
  trackingToken: string;
  razorpayOrderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (value: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (name: string, callback: (response: unknown) => void) => void;
    };
  }
}

export function CheckoutForm({ deliveryEnabled }: { deliveryEnabled: boolean }) {
  const { items, subtotal, clear } = useCart();
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [successOrder, setSuccessOrder] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountMinor: number;
    subtotalMinor: number;
  } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerCheckoutValues>({
    defaultValues: { type: "PICKUP" },
  });

  const type = useWatch({ control, name: "type" }) ?? "PICKUP";
  const currentSubtotalMinor = Math.round(subtotal * 100);
  const usableCoupon = appliedCoupon?.subtotalMinor === currentSubtotalMinor ? appliedCoupon : null;

  async function submit(values: CustomerCheckoutValues) {
    setMessage("");
    if (items.length === 0) {
      setMessage("Your bag is empty.");
      return;
    }
    const validation = customerCheckoutSchema.safeParse(values);
    if (!validation.success) {
      setMessage("Please correct the highlighted details.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setMessage("Payment checkout is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          type: values.type,
          address:
            values.type === "DELIVERY"
              ? {
                  line1: values.line1,
                  line2: values.line2,
                  city: values.city,
                  region: values.region,
                  postalCode: values.postalCode,
                  instructions: values.instructions,
                }
              : undefined,
          couponCode: usableCoupon?.code,
          items: items.map(({ productId, variantId, quantity }) => ({
            productId,
            variantId,
            quantity,
          })),
        }),
      });
      const data = (await response.json()) as PaymentOrder & { error?: { message?: string } };
      if (!response.ok) {
        setMessage(data.error?.message ?? "Checkout is not available right now.");
        setBusy(false);
        return;
      }
      setTrackingToken(data.trackingToken);
      const checkout = new window.Razorpay!({
        key: data.keyId,
        amount: data.amountMinor,
        currency: data.currency,
        name: "Brew & Bloom",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: values.customerName,
          email: values.customerEmail,
          contact: values.customerPhone,
        },
        theme: { color: "#2e1e17" },
        handler: async (payment) => {
          try {
            const verify = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber: data.orderNumber, ...payment }),
            });
            const result = (await verify.json()) as { verified?: boolean; message?: string };
            if (!verify.ok || !result.verified) {
              setMessage(result.message ?? "Payment could not be verified. Contact the café with your order number.");
              setBusy(false);
              return;
            }
            clear();
            setSuccessOrder(data.orderNumber);
          } catch {
            setMessage(
              `Payment was received by the checkout provider but could not be verified here. Keep order ${data.orderNumber} and contact the café.`
            );
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", () => {
        setMessage("Payment was not completed. Your bag is still saved so you can try again.");
        setBusy(false);
      });
      checkout.open();
    } catch {
      setMessage("We couldn't start checkout. Please try again.");
      setBusy(false);
    }
  }

  async function applyCoupon() {
    setCouponBusy(true);
    setCouponMessage("");
    try {
      const response = await fetch("/api/checkout/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, subtotalMinor: currentSubtotalMinor }),
      });
      const result = (await response.json()) as {
        valid?: boolean;
        code?: string;
        discountMinor?: number;
        message?: string;
      };
      if (!response.ok || !result.valid || !result.code || typeof result.discountMinor !== "number") {
        setAppliedCoupon(null);
        setCouponMessage(result.message ?? "That coupon could not be applied.");
        return;
      }
      setAppliedCoupon({
        code: result.code,
        discountMinor: result.discountMinor,
        subtotalMinor: currentSubtotalMinor,
      });
      setCouponInput(result.code);
      setCouponMessage("Coupon applied to the current bag.");
    } catch {
      setCouponMessage("We could not check that coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  if (successOrder) {
    return (
      <div className="admin-panel" style={{ maxWidth: 620, margin: "40px auto", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--sage-soft)",
            color: "var(--sage)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
          }}
        >
          <CheckCircle2 size={32} />
        </div>
        <span className="eyebrow">Order confirmed</span>
        <h2 className="section-title" style={{ fontSize: 38, margin: "10px 0 16px" }}>
          Thank you.
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
          Your payment has been verified and your order is on its way to the café counter.
        </p>
        <div
          style={{
            background: "var(--cream)",
            padding: "16px 20px",
            borderRadius: "var(--radius-sm)",
            margin: "24px 0",
            fontSize: 14,
          }}
        >
          <strong>Order number: {successOrder}</strong>
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            className="button"
            href={`/orders/${successOrder}?token=${encodeURIComponent(trackingToken)}`}
          >
            Track your order <ArrowRight size={14} />
          </Link>
          <Link className="button button-outline" href="/account">
            View your account
          </Link>
        </div>
      </div>
    );
  }

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
        <span className="eyebrow">Checkout</span>
        <h2>Your bag is empty.</h2>
        <p>Add your favourite coffee or bakes to start checkout.</p>
        <Link className="button" href="/menu">
          Explore the menu <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const field = (
    name: keyof CustomerCheckoutValues,
    label: string,
    props: Record<string, unknown> = {}
  ) => (
    <div className="field">
      <label htmlFor={`checkout-${name}`}>{label}</label>
      <input className="input" id={`checkout-${name}`} {...register(name)} {...props} />
      {errors[name]?.message && (
        <span className="error-message" role="alert">
          {String(errors[name]?.message)}
        </span>
      )}
    </div>
  );

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() =>
          setMessage("Razorpay checkout couldn't load. Check your connection and try again.")
        }
      />
      <div className="checkout-grid">
        <form onSubmit={(event: FormEvent<HTMLFormElement>) => void handleSubmit(submit)(event)}>
          <span className="eyebrow">A few details, then you&apos;re all set</span>
          <h1 className="section-title" style={{ marginBottom: 30 }}>
            Checkout.
          </h1>

          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 24,
              marginBottom: 24,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 20,
                margin: "0 0 16px",
                color: "var(--espresso-deep)",
              }}
            >
              Contact details
            </h3>
            {field("customerName", "Your name", {
              autoComplete: "name",
              required: true,
              maxLength: 100,
            })}
            {field("customerEmail", "Email address", {
              type: "email",
              autoComplete: "email",
              required: true,
              maxLength: 254,
            })}
            {field("customerPhone", "Phone number", {
              type: "tel",
              autoComplete: "tel",
              required: true,
              maxLength: 20,
            })}
          </div>

          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 24,
              marginBottom: 24,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 20,
                margin: "0 0 16px",
                color: "var(--espresso-deep)",
              }}
            >
              Fulfillment
            </h3>
            <div className="field">
              <label htmlFor="checkout-type">Order type</label>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  className={`filter-button${type === "PICKUP" ? " active" : ""}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px" }}
                  onClick={() => setValue("type", "PICKUP")}
                >
                  <Store size={15} /> Café pickup
                </button>
                {deliveryEnabled && (
                  <button
                    type="button"
                    className={`filter-button${type === "DELIVERY" ? " active" : ""}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px" }}
                    onClick={() => setValue("type", "DELIVERY")}
                  >
                    <Truck size={15} /> Home delivery
                  </button>
                )}
              </div>
              <input type="hidden" id="checkout-type" {...register("type")} />
            </div>

            {type === "DELIVERY" && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                <h4 style={{ fontSize: 16, fontFamily: "var(--serif)", margin: "0 0 16px" }}>
                  Delivery address
                </h4>
                {field("line1", "Address line 1", {
                  autoComplete: "address-line1",
                  required: true,
                })}
                {field("line2", "Address line 2", { autoComplete: "address-line2" })}
                {field("city", "City", { autoComplete: "address-level2", required: true })}
                {field("region", "State / region", {
                  autoComplete: "address-level1",
                  required: true,
                })}
                {field("postalCode", "Postal code", {
                  autoComplete: "postal-code",
                  required: true,
                })}
                <div className="field">
                  <label htmlFor="checkout-instructions">Delivery instructions (optional)</label>
                  <textarea
                    className="input"
                    id="checkout-instructions"
                    rows={3}
                    {...register("instructions")}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--line-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 24,
              marginBottom: 24,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <section className="field" aria-label="Coupon code" style={{ margin: 0 }}>
              <label htmlFor="checkout-coupon" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Tag size={12} style={{ color: "var(--caramel)" }} /> Coupon or promo code
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  className="input"
                  id="checkout-coupon"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  maxLength={32}
                  autoComplete="off"
                  placeholder="e.g. WELCOME10"
                />
                <button
                  className="button button-small"
                  type="button"
                  onClick={() => void applyCoupon()}
                  disabled={couponBusy || couponInput.trim().length < 3}
                >
                  {couponBusy ? "Checking…" : usableCoupon ? "Recheck" : "Apply"}
                </button>
                {usableCoupon && (
                  <button
                    className="button button-small button-outline"
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponMessage("Coupon removed.");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {couponMessage && (
                <span className={usableCoupon ? "success-message" : "error-message"} role="status">
                  {couponMessage}
                </span>
              )}
              {appliedCoupon && !usableCoupon && (
                <span className="notice" style={{ marginTop: 8 }}>
                  Your bag changed. Apply the coupon again to use it.
                </span>
              )}
            </section>
          </div>

          <div
            className="notice"
            style={{
              margin: "24px 0",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <ShieldCheck size={20} style={{ color: "var(--caramel)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Secure payment via Razorpay.</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Card and UPI details are encrypted and entered only in Razorpay Checkout. Never stored by Brew &amp; Bloom.
              </div>
            </div>
          </div>

          {message && (
            <p className="error-message" role="alert" style={{ marginBottom: 16 }}>
              {message}
            </p>
          )}

          <button
            className="button"
            type="submit"
            disabled={busy || !scriptReady}
            style={{ width: "100%", minHeight: 52, fontSize: 12 }}
          >
            <Lock size={15} />
            {busy ? "Opening secure payment…" : "Continue to secure payment"}
          </button>
        </form>

        <aside className="cart-summary">
          <h2>Your order.</h2>
          {items.map((item) => (
            <div className="summary-line" key={item.key}>
              <span>
                {item.quantity} × {item.name} ({item.variantName})
              </span>
              <span style={{ fontWeight: 600, color: "var(--espresso)" }}>
                {formatINR(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
          {usableCoupon && (
            <div className="summary-line" style={{ color: "var(--sage)" }}>
              <span>Coupon {usableCoupon.code}</span>
              <span>−{formatINR(usableCoupon.discountMinor / 100)}</span>
            </div>
          )}
          <div className="summary-line summary-total">
            <span>Estimated subtotal</span>
            <span>
              {formatINR(
                Math.max(
                  0,
                  (currentSubtotalMinor - (usableCoupon?.discountMinor ?? 0)) / 100
                )
              )}
            </span>
          </div>
          <p style={{ fontSize: 11, lineHeight: 1.7, color: "var(--muted)", margin: "16px 0 0" }}>
            Taxes and applicable charges are calculated by the server from current store settings.
          </p>
        </aside>
      </div>
    </>
  );
}
