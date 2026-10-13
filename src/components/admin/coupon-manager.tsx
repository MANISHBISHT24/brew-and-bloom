"use client";

import { FormEvent, useState } from "react";
import { formatINR } from "@/components/catalog/product-card";

export type AdminCoupon = { id: string; code: string; description: string | null; discountType: "PERCENTAGE" | "FIXED"; discountValue: number; minimumSubtotal: number | null; maxRedemptions: number | null; redeemedCount: number; isActive: boolean; expiresAt: string | null };

export function CouponManager({ initialCoupons }: { initialCoupons: AdminCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const expiry = String(form.get("expiresAt") ?? "");
    try {
      const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        code: form.get("code"), description: form.get("description"), discountType: form.get("discountType"), discountValue: Number(form.get("discountValue")),
        minimumSubtotal: form.get("minimumSubtotal") ? Number(form.get("minimumSubtotal")) : undefined,
        maxRedemptions: form.get("maxRedemptions") ? Number(form.get("maxRedemptions")) : undefined,
        expiresAt: expiry ? `${expiry}T23:59:59.000Z` : undefined,
      }) });
      const result = await response.json() as { coupon?: AdminCoupon; error?: { message?: string } };
      if (!response.ok || !result.coupon) { setMessage(result.error?.message ?? "Coupon could not be created."); return; }
      setCoupons((current) => [result.coupon!, ...current]);
      formElement.reset();
      setMessage(`Coupon ${result.coupon.code} is ready to use.`);
    } catch { setMessage("We could not create that coupon. Please try again."); }
    finally { setBusy(false); }
  }

  async function toggle(coupon: AdminCoupon) {
    setMessage("");
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !coupon.isActive }) });
      const result = await response.json() as { isActive?: boolean; error?: { message?: string } };
      if (!response.ok || typeof result.isActive !== "boolean") { setMessage(result.error?.message ?? "Coupon could not be updated."); return; }
      setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, isActive: result.isActive! } : item));
    } catch { setMessage("We could not update that coupon. Please try again."); }
  }

  return <section className="admin-panel" aria-labelledby="coupon-heading">
    <span className="eyebrow">Promotions</span><h2 className="section-title" id="coupon-heading" style={{ fontSize: 30 }}>Coupon codes.</h2>
    <form onSubmit={(event) => void create(event)} className="admin-form-grid">
      <div className="field"><label htmlFor="coupon-code">Code</label><input className="input" id="coupon-code" name="code" autoComplete="off" minLength={3} maxLength={32} pattern="[A-Za-z0-9-]+" required placeholder="BLOOM10"/></div>
      <div className="field"><label htmlFor="coupon-description">Description</label><input className="input" id="coupon-description" name="description" maxLength={200} placeholder="New customer offer"/></div>
      <div className="field"><label htmlFor="coupon-type">Discount type</label><select className="input" id="coupon-type" name="discountType"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></div>
      <div className="field"><label htmlFor="coupon-value">Discount value</label><input className="input" id="coupon-value" name="discountValue" type="number" min="0.01" max="100000" step="0.01" required/></div>
      <div className="field"><label htmlFor="coupon-minimum">Minimum subtotal (optional)</label><input className="input" id="coupon-minimum" name="minimumSubtotal" type="number" min="0.01" max="250000" step="0.01"/></div>
      <div className="field"><label htmlFor="coupon-limit">Total uses (optional)</label><input className="input" id="coupon-limit" name="maxRedemptions" type="number" min="1" step="1"/></div>
      <div className="field"><label htmlFor="coupon-expiry">Expires on (optional)</label><input className="input" id="coupon-expiry" name="expiresAt" type="date"/></div>
      <button className="button" type="submit" disabled={busy}>{busy ? "Creating…" : "Create coupon"}</button>
    </form>
    {message && <p className="section-copy" role="status">{message}</p>}
    <div style={{ marginTop: 26 }}>
      {coupons.length ? coupons.map((coupon) => <article key={coupon.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div><strong>{coupon.code}</strong><span style={{ marginLeft: 10, color: "var(--muted)", fontSize: 12 }}>{coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : formatINR(coupon.discountValue)}{coupon.minimumSubtotal ? ` · min ${formatINR(coupon.minimumSubtotal)}` : ""} · {coupon.redeemedCount}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : " used"}</span>{coupon.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--muted)" }}>{coupon.description}</p>}</div>
        <button className="button button-small button-outline" type="button" onClick={() => void toggle(coupon)}>{coupon.isActive ? "Deactivate" : "Reactivate"}</button>
      </article>) : <p className="section-copy">No coupons yet. Create one to make a code available at checkout.</p>}
    </div>
  </section>;
}
