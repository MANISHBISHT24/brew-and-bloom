"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          message: form.get("message"),
          website: form.get("website"),
        }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? "We couldn't send that just now.");
      if (response.ok) formElement.reset();
    } catch {
      setMessage("We couldn't send that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isSuccess = message.startsWith("Thanks") || message.toLowerCase().includes("received") || message.toLowerCase().includes("sent");

  return (
    <form onSubmit={submit} style={{ marginTop: 24 }}>
      <div className="field">
        <label htmlFor="contact-name">Your name</label>
        <input
          className="input"
          id="contact-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Elena Rostova"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email address</label>
        <input
          className="input"
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-subject">Subject</label>
        <input
          className="input"
          id="contact-subject"
          name="subject"
          required
          minLength={3}
          maxLength={120}
          placeholder="Catering, order inquiry, or special request"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">How can we help?</label>
        <textarea
          className="input"
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          placeholder="Tell us a little about your request or question..."
        />
      </div>

      <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        Leave this field empty
        <input tabIndex={-1} autoComplete="off" name="website" maxLength={0} />
      </label>

      <button className="button" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Sending…" : "Send your note"}
        <ArrowRight size={14} />
      </button>

      {message && (
        <p className={isSuccess ? "success-message" : "error-message"} role="status" style={{ marginTop: 14 }}>
          {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message}</span>
        </p>
      )}
    </form>
  );
}
