"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { StoreProduct } from "@/lib/products";
import { useCart } from "@/components/cart/cart-provider";

export function formatINR(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }

export function ProductCard({ product, saved = false }: { product: StoreProduct; saved?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(saved);
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const reduceMotion = useReducedMotion();
  async function toggleWishlist() {
    setWishlistBusy(true);
    setWishlistMessage("");
    try {
      const response = await fetch(isSaved ? `/api/wishlist?productId=${encodeURIComponent(product.id)}` : "/api/wishlist", {
        method: isSaved ? "DELETE" : "POST",
        headers: isSaved ? undefined : { "Content-Type": "application/json" },
        body: isSaved ? undefined : JSON.stringify({ productId: product.id }),
      });
      if (response.status === 401) {
        router.push("/account");
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error?.message ?? "Wishlist could not be updated. Please try again.");
      }
      setIsSaved(!isSaved);
      if (saved) router.refresh();
    } catch (error) {
      setWishlistMessage(error instanceof Error ? error.message : "Wishlist could not be updated. Please try again.");
    } finally {
      setWishlistBusy(false);
    }
  }
  return <motion.article className="product-card" whileHover={reduceMotion?undefined:{y:-3}} transition={{duration:.22,ease:"easeOut"}}>
    <div className="product-image-wrap"><Link href={`/menu/${product.slug}`} className="product-photo" aria-label={`View ${product.name}`}><Image src={product.image} alt={product.alt} fill sizes="(max-width: 560px) 45vw, (max-width: 900px) 45vw, 25vw"/>{product.tag && <span className="product-tag">{product.tag}</span>}</Link><button type="button" className={`wishlist-toggle${isSaved?" saved":""}`} onClick={()=>void toggleWishlist()} disabled={wishlistBusy} aria-label={isSaved?`Remove ${product.name} from wishlist`:`Save ${product.name} to wishlist`} aria-pressed={isSaved}><Heart size={17} fill={isSaved?"currentColor":"none"}/></button></div>
    <div className="product-card-info"><div className="product-line"><Link href={`/menu/${product.slug}`} className="product-name">{product.name}</Link><span className="product-price">{formatINR(product.price)}</span></div><p className="product-desc">{product.description}</p><div className="product-card-bottom"><span className="product-category">{product.category}</span>{product.available ? <button className="add-mini" onClick={() => add(product)} type="button"><Plus size={14}/> Add</button> : <span className="product-category">Sold out</span>}</div>{wishlistMessage&&<p className="error-message" role="status">{wishlistMessage}</p>}</div>
  </motion.article>;
}
