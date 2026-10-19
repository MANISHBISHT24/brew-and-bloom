import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/product-detail";
import { getProduct, getProducts } from "@/lib/products";
export const revalidate=60;
export async function generateStaticParams(){const {products}=await getProducts();return products.map((product)=>({slug:product.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const product=await getProduct(slug);return product?{title:product.name,description:product.description,openGraph:{images:[product.image]}}:{title:"Menu item"};}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <div className="shell page-wrap">
      <nav
        aria-label="Breadcrumb"
        style={{
          paddingTop: 32,
          paddingBottom: 8,
          fontSize: 12,
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Link href="/" style={{ color: "var(--muted)", transition: "color 0.2s" }}>
          Home
        </Link>
        <span style={{ color: "var(--line)" }}>/</span>
        <Link href="/menu" style={{ color: "var(--muted)", transition: "color 0.2s" }}>
          Menu
        </Link>
        <span style={{ color: "var(--line)" }}>/</span>
        <span style={{ color: "var(--espresso)", fontWeight: 600 }}>{product.name}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-image">
          <Image
            src={product.image}
            alt={product.alt}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
        <ProductDetail product={product} />
      </div>
    </div>
  );
}
