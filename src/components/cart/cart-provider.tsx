"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { StoreProduct } from "@/lib/products";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
};
type CartContextValue = { items: CartLine[]; count: number; subtotal: number; add: (product: StoreProduct, variantId?: string) => void; change: (key: string, quantity: number) => void; remove: (key: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "brew-bloom-cart-v1";
const toSelections = (lines: CartLine[]) => lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const accountMode = useRef(false);
  const latestItems = useRef<CartLine[]>([]);
  const syncGeneration = useRef(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartLine[];
        latestItems.current = Array.isArray(parsed) ? parsed : [];
        setItems(latestItems.current);
      }
    } catch { window.localStorage.removeItem(STORAGE_KEY); }
    setReady(true);
  }, []);

  useEffect(() => { latestItems.current = items; }, [items]);

  const syncAccountCart = useCallback(async (mergeGuest: boolean) => {
    const generation = ++syncGeneration.current;
    const guestSnapshot = mergeGuest && !accountMode.current ? latestItems.current : [];
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (generation !== syncGeneration.current) return;
      if (!response.ok) return;
      const result = await response.json() as { authenticated?: boolean; items?: CartLine[] };
      if (!result.authenticated) {
        if (accountMode.current) {
          accountMode.current = false;
          latestItems.current = [];
          setItems([]);
          window.localStorage.removeItem(STORAGE_KEY);
        }
        return;
      }

      if (guestSnapshot.length) {
        const merged = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toSelections(guestSnapshot) }) });
        if (generation !== syncGeneration.current) return;
        if (!merged.ok) return;
      }

      const latest = guestSnapshot.length ? await fetch("/api/cart", { cache: "no-store" }) : response;
      if (generation !== syncGeneration.current) return;
      if (!latest.ok) return;
      const cart = await latest.json() as { authenticated?: boolean; items?: CartLine[] };
      if (!cart.authenticated) return;
      accountMode.current = true;
      window.localStorage.removeItem(STORAGE_KEY);
      latestItems.current = cart.items ?? [];
      setItems(latestItems.current);
    } catch {
      // Keep the guest cart intact when the account cart service is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the authenticated cart from the server after local hydration.
    void syncAccountCart(false);
    const onSessionChanged = () => { void syncAccountCart(true); };
    window.addEventListener("brew-bloom-session-changed", onSessionChanged);
    return () => window.removeEventListener("brew-bloom-session-changed", onSessionChanged);
  }, [ready, syncAccountCart]);

  useEffect(() => {
    if (!ready) return;
    if (accountMode.current) {
      window.localStorage.removeItem(STORAGE_KEY);
      const timeout = window.setTimeout(() => {
        void fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toSelections(items) }) });
      }, 250);
      return () => window.clearTimeout(timeout);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    add(product, variantId) {
      const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
      if (!variant || !product.available) return;
      const key = `${product.id}:${variant.id}`;
      setItems((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) return current.map((item) => item.key === key ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item);
        return [...current, { key, productId: product.id, slug: product.slug, name: product.name, image: product.image, variantId: variant.id, variantName: variant.name, unitPrice: product.price + variant.priceAdjustment, quantity: 1 }];
      });
    },
    change(key, quantity) { setItems((current) => quantity <= 0 ? current.filter((item) => item.key !== key) : current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(20, Math.floor(quantity))) } : item)); },
    remove(key) { setItems((current) => current.filter((item) => item.key !== key)); },
    clear() { setItems([]); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
