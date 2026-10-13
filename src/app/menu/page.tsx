import type { Metadata } from "next";
import { MenuExplorer } from "@/components/catalog/menu-explorer";
import { getProducts } from "@/lib/products";
export const metadata: Metadata = { title: "Coffee & Menu", description: "Explore coffee, cold drinks, and fresh bakery favourites at Brew & Bloom." };
export const revalidate=60;
export default async function MenuPage() {
  const {products,preview,configured}=await getProducts();
  return <div className="page-wrap"><section className="page-hero"><div className="shell"><span className="eyebrow">Thoughtfully made, ready when you are</span><h1>The coffee &amp; menu.</h1><p>From a familiar first sip to something new, every cup is made to be enjoyed at your own pace.</p>{preview&&<p className="notice" role="status">Showing development preview products. Seed the connected database to use your live menu.</p>}{!configured&&!preview&&<p className="notice" role="status">The café menu is not available until the store database is configured.</p>}</div></section><section className="menu-page shell"><MenuExplorer products={products}/></section></div>;
}
