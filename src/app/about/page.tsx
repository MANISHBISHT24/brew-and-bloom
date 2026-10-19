import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coffee, Heart, Leaf, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Our story",
  description: "The thought behind the everyday ritual at Brew & Bloom.",
};

export default function AboutPage() {
  return (
    <div className="page-wrap">
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">
            <Sparkles size={12} style={{ color: "var(--caramel)" }} />
            A place for the everyday
          </span>
          <h1>Make a little room for good.</h1>
          <p>
            Brew &amp; Bloom is built around an uncomplicated idea: a thoughtful cup, a welcoming table,
            and a moment that belongs to you.
          </p>
        </div>
      </section>

      <section className="section shell">
        <div className="story-grid">
          <div className="story-photo">
            <Image
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1300&q=85"
              alt="Specialty coffee brewed with care on a sunny café counter"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          </div>
          <div className="story-copy">
            <span className="eyebrow">Crafted slowly. Enjoyed daily.</span>
            <h2>Not every good thing has to hurry.</h2>
            <p>
              We believe a daily coffee can be more than a quick stop. It can be a familiar hello, a soft
              landing between plans, or a small pleasure you take with you.
            </p>
            <p>
              Our menu keeps the focus on single-origin beans, considered preparation, and flavours
              worth coming back to. The details matter, but the feeling matters most.
            </p>
            <Link className="text-link" href="/menu">
              Find your favourite <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="intro-strip" style={{ background: "var(--cream)" }}>
        <div className="shell" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "inline-flex", padding: 10, background: "var(--ivory)", borderRadius: "var(--radius-sm)", marginBottom: 12, color: "var(--caramel)" }}>
              <Coffee size={20} />
            </div>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: "0 0 8px", color: "var(--espresso-deep)" }}>Single Origin Ritual</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>Directly traded specialty beans roasted in light-medium profiles to highlight natural terroir.</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "inline-flex", padding: 10, background: "var(--ivory)", borderRadius: "var(--radius-sm)", marginBottom: 12, color: "var(--sage)" }}>
              <Leaf size={20} />
            </div>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: "0 0 8px", color: "var(--espresso-deep)" }}>Botanical Balance</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>Floral notes, house-steeped botanicals, and organic oat and dairy pairings with clean sweetness.</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "inline-flex", padding: 10, background: "var(--ivory)", borderRadius: "var(--radius-sm)", marginBottom: 12, color: "var(--coffee)" }}>
              <Heart size={20} />
            </div>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, margin: "0 0 8px", color: "var(--espresso-deep)" }}>Warm Neighbourhood Pace</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>A slower corner of the city where taking twenty minutes for yourself is always celebrated.</p>
          </div>
        </div>
      </section>

      <section className="quote-section">
        <div className="shell quote-inner">
          <div className="quote-mark">“</div>
          <blockquote>
            We make space for the small rituals that make an ordinary day feel a little brighter.
          </blockquote>
          <div className="quote-credit">Brew &amp; Bloom</div>
        </div>
      </section>

      <section className="section shell" style={{ textAlign: "center" }}>
        <span className="eyebrow">Whenever you’re ready</span>
        <h2 className="section-title">We’ll put the kettle on.</h2>
        <p className="section-copy" style={{ margin: "16px auto 28px" }}>
          Have a look at the seasonal menu, or send us a note if you have a special request or event.
        </p>
        <Link className="button" href="/menu">
          Explore the menu <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
