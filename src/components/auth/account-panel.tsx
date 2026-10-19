"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Heart, LogOut, Package, Shield } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AccountPanel({
  signedIn,
  name,
  role,
}: {
  signedIn: boolean;
  name?: string;
  role?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message ?? "That didn't work. Check your details and try again.");
      return;
    }
    window.dispatchEvent(new Event("brew-bloom-session-changed"));
    router.refresh();
  }

  if (signedIn) {
    return (
      <div className="admin-panel" style={{ borderRadius: "var(--radius-md)" }}>
        <span className="eyebrow">Your account</span>
        <h2 className="section-title" style={{ fontSize: 36, margin: "10px 0" }}>
          Welcome, {name}.
        </h2>
        <p className="section-copy" style={{ margin: "6px 0 24px" }}>
          Signed in as {role === "ADMIN" ? "store administrator" : "customer"}.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button button-small" href="/orders">
            <Package size={14} /> View your orders
          </Link>
          <Link className="button button-small button-outline" href="/wishlist">
            <Heart size={14} /> Your wishlist
          </Link>
          {role === "ADMIN" && (
            <Link className="button button-small button-outline" href="/admin">
              <Shield size={14} /> Open admin
            </Link>
          )}
          <button
            type="button"
            className="button button-small button-outline"
            onClick={async () => {
              await authClient.signOut();
              window.dispatchEvent(new Event("brew-bloom-session-changed"));
              window.location.reload();
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel" style={{ borderRadius: "var(--radius-md)" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={`filter-button${mode === "signin" ? " active" : ""}`}
          onClick={() => {
            setMode("signin");
            setMessage("");
          }}
          style={{ padding: "8px 18px" }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`filter-button${mode === "signup" ? " active" : ""}`}
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          style={{ padding: "8px 18px" }}
        >
          Create account
        </button>
      </div>

      <span className="eyebrow">A table with your name on it</span>
      <h2 className="section-title" style={{ fontSize: 36, margin: "10px 0" }}>
        {mode === "signin" ? "Welcome back." : "Join us."}
      </h2>
      <p className="section-copy">
        {mode === "signin"
          ? "Sign in to see your order history and saved favourites."
          : "Create an account for a smoother next visit and saved wishlist."}
      </p>

      <form onSubmit={submit} style={{ marginTop: 24 }}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="account-name">Your name</label>
            <input
              className="input"
              id="account-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. Maya Lin"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="account-email">Email address</label>
          <input
            className="input"
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="account-password">Password</label>
          <input
            className="input"
            id="account-password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            maxLength={128}
            placeholder="At least 8 characters"
          />
        </div>

        {mode === "signin" && (
          <p style={{ fontSize: 12, margin: "12px 0 20px" }}>
            <Link href="/account/forgot-password" className="text-link">
              Forgot your password?
            </Link>
          </p>
        )}

        <button
          className="button"
          type="submit"
          disabled={busy}
          style={{ width: "100%", marginTop: 8 }}
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          <ArrowRight size={14} />
        </button>

        {message && (
          <p className="error-message" role="alert" style={{ marginTop: 14 }}>
            {message}
          </p>
        )}
      </form>

      <div className="rule" style={{ margin: "28px 0 20px" }} />

      <button
        type="button"
        className="text-link"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage("");
        }}
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
