"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { BrandMark } from "@/components/layout/brand-mark";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useCart();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="announcement">
        <span>A new season is brewing · Come find your next favourite</span>
      </div>
      <header className="site-header">
        <nav className="shell nav" aria-label="Main navigation">
          <div className={`nav-links${open ? " open" : ""}`}>
            <Link
              href="/menu"
              className={isActive("/menu") ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              Menu
            </Link>
            <Link
              href="/about"
              className={isActive("/about") ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              Our story
            </Link>
            <Link
              href="/contact"
              className={isActive("/contact") ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              Visit us
            </Link>
          </div>
          <Link href="/" className="wordmark" aria-label="Brew and Bloom home">
            <BrandMark className="wordmark-mark" />
            <span>Brew &amp; Bloom</span>
          </Link>
          <div className="nav-actions">
            <Link
              className={`account-link ${isActive("/account") ? "active" : ""}`}
              href="/account"
            >
              Account
            </Link>
            <Link
              className="cart-nav"
              href="/cart"
              aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag size={17} strokeWidth={1.6} />
              <span>Bag</span>
              <span key={count} className="cart-count">{count}</span>
            </Link>
            <button
              className="mobile-menu"
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
