import type { Metadata } from "next";
import { Info, Sparkles } from "lucide-react";
import { MenuExplorer } from "@/components/catalog/menu-explorer";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Coffee & Menu",
  description: "Explore coffee, cold drinks, and fresh bakery favourites at Brew & Bloom.",
};
export const revalidate = 60;

export default async function MenuPage() {
  const { products, preview, configured } = await getProducts();
  return (
    <div className="page-wrap">
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">
            <Sparkles size={12} style={{ color: "var(--caramel)" }} />
            Thoughtfully made, ready when you are
          </span>
          <h1>The coffee &amp; menu.</h1>
          <p>
            From a familiar first sip to something new, every cup is made to be enjoyed at your own
            pace with organic, sustainably sourced beans.
          </p>
          {preview && (
            <div
              className="notice"
              role="status"
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 680,
              }}
            >
              <Info size={16} style={{ color: "var(--caramel)", flexShrink: 0 }} />
              <span>
                Showing development preview products. Connect PostgreSQL and seed the database to load
                your live café menu.
              </span>
            </div>
          )}
          {!configured && !preview && (
            <div className="notice" role="status" style={{ marginTop: 20 }}>
              The café menu is not available until the store database is configured.
            </div>
          )}
        </div>
      </section>
      <section className="menu-page shell">
        <MenuExplorer products={products} />
      </section>
    </div>
  );
}
