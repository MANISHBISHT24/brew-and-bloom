import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/product-detail";
import { getProduct, getProducts } from "@/lib/products";
export const revalidate=60;
export async function generateStaticParams(){const {products}=await getProducts();return products.map((product)=>({slug:product.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const product=await getProduct(slug);return product?{title:product.name,description:product.description,openGraph:{images:[product.image]}}:{title:"Menu item"};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const product=await getProduct(slug);if(!product)notFound();return <div className="shell"><div style={{paddingTop:25,fontSize:11,color:"var(--muted)"}}><Link href="/menu">Menu</Link> / {product.name}</div><div className="detail-grid"><div className="detail-image"><Image src={product.image} alt={product.alt} fill priority sizes="(max-width: 800px) 100vw, 50vw"/></div><ProductDetail product={product}/></div></div>;}
