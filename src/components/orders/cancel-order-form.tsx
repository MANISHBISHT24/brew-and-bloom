"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CancelOrderForm({ orderNumber, trackingToken }: { orderNumber: string; trackingToken?: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, token: trackingToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message ?? "Order cancellation failed.");
      setMessage("Your unpaid order has been cancelled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order cancellation failed.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="cancel-order-form" onSubmit={submit}><label className="field"><span>Reason (optional)</span><textarea className="input" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="button button-small button-outline" type="submit" disabled={busy}>{busy ? "Cancelling…" : "Cancel unpaid order"}</button>{message && <p className="section-copy" role="status">{message}</p>}</form>;
}
