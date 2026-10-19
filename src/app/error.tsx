"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront rendering error", error);
  }, [error]);

  return (
    <div className="shell empty-state page-wrap">
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(168, 53, 40, 0.1)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
          color: "var(--espresso)",
        }}
      >
        <AlertTriangle size={28} style={{ color: "#a83528" }} />
      </div>
      <span className="eyebrow">A small hiccup</span>
      <h1 className="section-title" style={{ margin: "10px 0 14px" }}>
        Something went wrong.
      </h1>
      <p style={{ maxWidth: 460, margin: "0 auto 24px" }}>
        We encountered an unexpected bump while loading this page. Try refreshing, or return to our café counter.
      </p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="button" onClick={() => reset()}>
          <RotateCcw size={14} /> Try again
        </button>
        <Link className="button button-outline" href="/">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
