import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, MapPin, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { NewsletterSignup } from "@/components/layout/newsletter-signup";
import { getProducts } from "@/lib/products";
export const revalidate=60;

export default async function Home() {
  const { products, preview, configured } = await getProducts();
  return <>
    <section className="hero shell"><div className="hero-grid">
      <div className="hero-copy"><div className="hero-kicker eyebrow">A slower kind of coffee</div><h1>Your everyday ritual, <em>brewed better.</em></h1><p>Good coffee doesn’t need to be complicated. Just thoughtful beans, careful hands, and a little room to slow down.</p><div className="hero-actions"><Link className="button" href="/menu">Explore our menu <ArrowRight size={15}/></Link><Link className="button button-outline" href="/about">Discover our story</Link></div><div className="hero-note"><span/>Small moments, made well</div></div>
      <div className="hero-image"><Image src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1600&q=88" alt="Fresh coffee being prepared at a café" fill priority sizes="(max-width: 900px) 100vw, 55vw"/><div className="hero-stamp">Brewed with<br/>intention · daily</div></div>
    </div></section>
    <div className="intro-strip"><div className="shell"><div className="intro-item"><Sparkles/>Carefully chosen coffee</div><div className="intro-item"><Leaf/>Good things, made simply</div><div className="intro-item"><MapPin/>A neighbourhood kind of place</div></div></div>
    <section className="section shell"><div className="section-head"><div><span className="eyebrow">A few good things</span><h2 className="section-title">Made for your moment.</h2></div><Link className="text-link" href="/menu">View the whole menu <ArrowRight size={14}/></Link></div>{preview&&<p className="notice" role="status">Preview menu shown. Connect PostgreSQL and run the seed command to load your café catalogue.</p>}{!configured&&!preview&&<p className="notice" role="status">The live café menu will appear after the store database is configured.</p>}<div className="product-grid">{products.slice(0,4).map((product)=><ProductCard key={product.id} product={product}/>)}</div></section>
    <section className="section shell" style={{paddingTop:12}}><div className="story-grid"><div className="story-photo"><Image src="https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=85" alt="A warm and welcoming café interior" fill sizes="(max-width: 900px) 100vw, 50vw"/></div><div className="story-copy"><span className="eyebrow">A little more intention</span><h2>Good coffee has a way of bringing us back.</h2><p>To the table, to each other, to the small pause in the middle of a busy day. We built Brew &amp; Bloom around that feeling — a thoughtful cup, a welcoming seat, and time to enjoy both.</p><Link className="text-link" href="/about">A little about us <ArrowRight size={14}/></Link><div className="story-stat"><div className="stat"><strong>Slow</strong><span>By choice</span></div><div className="stat"><strong>Warm</strong><span>By nature</span></div><div className="stat"><strong>Yours</strong><span>Every day</span></div></div></div></div></section>
    <section className="quote-section"><div className="shell quote-inner"><div className="quote-mark">“</div><blockquote>Make room for the little things that make a day feel like yours.</blockquote><div className="quote-credit">The Brew &amp; Bloom way</div></div></section>
    <section className="section shell"><div className="location-grid"><div className="location-panel"><span className="eyebrow">The neighbourhood table</span><h2>Come as you are.</h2><p>Find a favourite seat, take your coffee to go, or linger over something fresh from the counter. We’re happiest when you feel at home.</p><div className="hours"><div className="hours-row"><span>Hours &amp; address</span><span>Coming soon</span></div></div><Link className="text-link" href="/contact">Plan a visit <ArrowRight size={14}/></Link></div><div className="location-image"><Image src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85" alt="Sunlight across a relaxed neighbourhood coffee shop" fill sizes="(max-width: 900px) 100vw, 50vw"/></div></div></section>
    <NewsletterSignup/>
  </>;
}
