"use client";

import Link from "next/link";
import { useState } from "react";
import { Coffee, Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  return <>
    <div className="announcement">A new season is brewing · Come find your next favourite</div>
    <header className="site-header"><nav className="shell nav" aria-label="Main navigation">
      <div className={`nav-links${open ? " open" : ""}`}>
        <Link href="/menu" onClick={() => setOpen(false)}>Menu</Link><Link href="/about" onClick={() => setOpen(false)}>Our story</Link><Link href="/contact" onClick={() => setOpen(false)}>Visit us</Link>
      </div>
      <Link href="/" className="wordmark" aria-label="Brew and Bloom home"><Coffee className="wordmark-mark" strokeWidth={1.4}/><span>Brew &amp; Bloom</span></Link>
      <div className="nav-actions"><Link className="account-link" href="/account">Account</Link><Link className="cart-nav" href="/cart" aria-label={`Shopping bag, ${count} item${count===1?"":"s"}`}><ShoppingBag size={17} strokeWidth={1.5}/>Bag <span className="cart-count">{count}</span></Link><button className="mobile-menu" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21}/> : <Menu size={21}/>}</button></div>
    </nav></header>
  </>;
}
