import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/catalog/product-card";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { fromDb } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your wishlist", robots: { index: false, follow: false } };

export default async function WishlistPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/account");

  if (!process.env.DATABASE_URL) {
    return <main className="shell content-page"><span className="eyebrow">Saved for later</span><h1>Your wishlist.</h1><p className="notice">Wishlist storage is unavailable until the store database is configured.</p></main>;
  }

  const wishlist = await getPrisma().wishlistItem.findMany({
    where: { userId: session.user.id, product: { archivedAt: null } },
    include: { product: { include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } }, extras: { where: { isAvailable: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const products = wishlist.map(({ product }) => fromDb(product));

  return (
    <div className="page-wrap">
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">Saved for another good day</span>
          <h1>Your wishlist.</h1>
          <p>A little list of the coffees and pastries you would like to enjoy again.</p>
        </div>
      </section>
      <section className="shell wishlist-page">
        {products.length ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} saved />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Your list is waiting.</h2>
            <p>Save a coffee or pastry from the menu and it will be right here.</p>
            <Link className="button button-small" href="/menu">
              Explore the menu
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
