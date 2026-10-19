import Link from "next/link";
import { Camera } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="wordmark" style={{ color: "#f7f1e9" }}>
              <BrandMark className="wordmark-mark" />
              <span>Brew &amp; Bloom</span>
            </Link>
            <p>Thoughtful coffee for the everyday ritual. Crafted slowly, enjoyed daily.</p>
            <a
              href="https://instagram.com"
              aria-label="Follow Brew and Bloom on Instagram"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#f7f1e9",
                transition: "background 0.2s, transform 0.2s",
              }}
            >
              <Camera size={17} />
            </a>
          </div>
          <div className="footer-col">
            <h3>Explore</h3>
            <Link href="/menu">Coffee &amp; menu</Link>
            <Link href="/about">Our story</Link>
            <Link href="/contact">Find the café</Link>
          </div>
          <div className="footer-col">
            <h3>Good to know</h3>
            <Link href="/faq">Frequently asked questions</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refunds">Cancellations &amp; refunds</Link>
          </div>
          <div className="footer-col">
            <h3>Say hello</h3>
            <p>Have a question about an order?</p>
            <Link href="/contact">Get in touch</Link>
            <Link href="/account">Your account</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Brew &amp; Bloom</span>
          <span>Crafted slowly. Enjoyed daily.</span>
          <span>Made for good mornings.</span>
        </div>
      </div>
    </footer>
  );
}
