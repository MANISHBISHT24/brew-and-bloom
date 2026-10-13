import Link from "next/link";
import { Camera, Coffee } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer"><div className="shell">
    <div className="footer-grid"><div className="footer-brand"><Link href="/" className="wordmark"><Coffee className="wordmark-mark" strokeWidth={1.4}/><span>Brew &amp; Bloom</span></Link><p>Thoughtful coffee for the everyday ritual. Crafted slowly, enjoyed daily.</p><a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer"><Camera size={17}/></a></div>
      <div className="footer-col"><h3>Explore</h3><Link href="/menu">Coffee &amp; menu</Link><Link href="/about">Our story</Link><Link href="/contact">Find the café</Link></div>
      <div className="footer-col"><h3>Good to know</h3><Link href="/faq">Frequently asked questions</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refunds">Cancellations &amp; refunds</Link></div>
      <div className="footer-col"><h3>Say hello</h3><p>Have a question about an order?</p><Link href="/contact">Get in touch</Link><Link href="/account">Your account</Link></div>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} Brew &amp; Bloom</span><span>Crafted slowly. Enjoyed daily.</span><span>Made for good mornings.</span></div>
  </div></footer>;
}
