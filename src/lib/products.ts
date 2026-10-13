import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  categorySlug: string;
  price: number;
  image: string;
  alt: string;
  tag?: string;
  available: boolean;
  variants: { id: string; name: string; priceAdjustment: number }[];
  extras: { id: string; name: string; price: number }[];
};

const demo = [
  { id: "preview-espresso", slug: "house-espresso", name: "House Espresso", description: "A chocolate-forward, naturally sweet daily espresso.", category: "Espresso", categorySlug: "espresso", price: 180, image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=1000&q=85", alt: "Espresso in a ceramic cup", tag: "House favourite", available: true, variants: [{ id: "preview-espresso-single", name: "Single", priceAdjustment: 0 }, { id: "preview-espresso-double", name: "Double", priceAdjustment: 60 }], extras: [] },
  { id: "preview-oat-latte", slug: "oat-milk-latte", name: "Oat Milk Latte", description: "Silky steamed oat milk, a little sweetness, plenty of comfort.", category: "Latte", categorySlug: "latte", price: 260, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1000&q=85", alt: "Latte with delicate milk art", tag: "Bestseller", available: true, variants: [{ id: "preview-oat-latte-regular", name: "Regular", priceAdjustment: 0 }, { id: "preview-oat-latte-large", name: "Large", priceAdjustment: 50 }], extras: [] },
  { id: "preview-cold-brew", slug: "slow-steep-cold-brew", name: "Slow Steep Cold Brew", description: "Patiently steeped, smooth, and finished over ice.", category: "Cold coffee", categorySlug: "cold-coffee", price: 240, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=85", alt: "Iced coffee with a soft afternoon light", available: true, variants: [{ id: "preview-cold-brew-regular", name: "Regular", priceAdjustment: 0 }, { id: "preview-cold-brew-large", name: "Large", priceAdjustment: 40 }], extras: [] },
  { id: "preview-cardamom-bun", slug: "cardamom-morning-bun", name: "Cardamom Morning Bun", description: "Flaky layers, warm spice, and a delicate sugar crust.", category: "Bakery", categorySlug: "bakery", price: 190, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=85", alt: "Freshly baked golden pastry", tag: "Baked today", available: true, variants: [{ id: "preview-bun-one", name: "Single", priceAdjustment: 0 }], extras: [] },
];

export const fromDb = (product: Prisma.ProductGetPayload<{ include: { category: true; images: true; variants: true; extras: true } }>): StoreProduct => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  category: product.category.name,
  categorySlug: product.category.slug,
  price: Number(product.basePrice.toString()),
  image: product.images[0]?.url ?? demo[0].image,
  alt: product.images[0]?.alt ?? `${product.name} served at Brew & Bloom`,
  tag: product.featured ? "Featured" : undefined,
  available: product.isAvailable,
  variants: product.variants.map((variant) => ({ id: variant.id, name: variant.name, priceAdjustment: Number(variant.priceAdjustment.toString()) })),
  extras: product.extras.map((extra) => ({ id: extra.id, name: extra.name, price: Number(extra.price.toString()) })),
});

export async function getProducts(): Promise<{ products: StoreProduct[]; preview: boolean; configured: boolean }> {
  if (!process.env.DATABASE_URL) {
    return process.env.NODE_ENV === "production" ? { products: [], preview: false, configured: false } : { products: demo, preview: true, configured: false };
  }
  try {
    const products = await getPrisma().product.findMany({
      where: { archivedAt: null },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } }, extras: { where: { isAvailable: true } } },
      orderBy: [{ featured: "desc" }, { popularity: "desc" }, { name: "asc" }],
    });
    return { products: products.map(fromDb), preview: false, configured: true };
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.error("Catalog database unavailable; showing explicitly marked preview products.", error);
    return { products: demo, preview: true, configured: false };
  }
}

export async function getProduct(slug: string): Promise<StoreProduct | undefined> {
  const { products } = await getProducts();
  return products.find((product) => product.slug === slug);
}
