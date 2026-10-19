import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="shell empty-state page-wrap">
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--cream)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
          color: "var(--caramel)",
        }}
      >
        <Compass size={28} />
      </div>
      <span className="eyebrow">A little detour</span>
      <h1 className="section-title" style={{ margin: "10px 0 14px" }}>
        That page isn’t on the menu.
      </h1>
      <p style={{ maxWidth: 440, margin: "0 auto 24px" }}>
        The link you followed might have moved or the season has changed. Let’s find you something good instead.
      </p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="button" href="/">
          Back to the homepage <ArrowRight size={14} />
        </Link>
        <Link className="button button-outline" href="/menu">
          Explore the menu
        </Link>
      </div>
    </div>
  );
}
