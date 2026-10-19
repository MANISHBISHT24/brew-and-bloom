"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function NewsletterSignup() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("");
    setBusy(true);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          consent: form.get("consent") === "on",
        }),
      });
      const data = await response.json() as { message?: string };
      setStatus(data.message ?? (response.ok ? "You're on the list." : "We couldn't save that just now."));
      if (response.ok) formElement.reset();
    } catch {
      setStatus("We couldn't save that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="newsletter">
      <div className="shell newsletter-inner">
        <div>
          <span className="eyebrow">A little note from us</span>
          <h2>Good things, occasionally.</h2>
          <p>Seasonal sips, fresh bakes, and the occasional café note.</p>
        </div>
        <form className="newsletter-form" onSubmit={submit}>
          <div className="newsletter-input-group">
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              className="input"
              id="newsletter-email"
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="Your email address"
            />
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Sign me up"}
              <ArrowRight size={14} />
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" name="consent" required style={{ accentColor: "var(--espresso)" }} />
            <span>I agree to receive occasional marketing emails.</span>
          </label>
          {status && (
            <span className="success-message" role="status">
              <CheckCircle2 size={14} /> {status}
            </span>
          )}
        </form>
      </div>
    </section>
  );
}
