import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { ContactForm } from "@/components/layout/contact-form";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Contact & café location",
  description: "Get in touch with Brew & Bloom.",
};

export default async function ContactPage() {
  let settings: null | {
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    openingHours: unknown;
  } = null;

  if (process.env.DATABASE_URL) {
    try {
      settings = await getPrisma().storeSettings.findUnique({
        where: { key: "default" },
        select: {
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          region: true,
          postalCode: true,
          openingHours: true,
        },
      });
    } catch {
      settings = null;
    }
  }

  const hoursDisplay =
    settings?.openingHours &&
    typeof settings.openingHours === "object" &&
    "display" in settings.openingHours
      ? String((settings.openingHours as { display?: unknown }).display ?? "")
      : "";

  return (
    <div className="page-wrap">
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">
            <Sparkles size={12} style={{ color: "var(--caramel)" }} />
            We’d love to hear from you
          </span>
          <h1>Say hello.</h1>
          <p>Questions about the seasonal menu, an order, or event catering? Leave us a note and our team will get back to you.</p>
        </div>
      </section>

      <div className="shell contact-grid">
        <div style={{ background: "var(--surface-card)", padding: 32, borderRadius: "var(--radius-md)", border: "1px solid var(--line-subtle)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="section-title" style={{ fontSize: 36, margin: "0 0 10px" }}>
            A note to the team.
          </h2>
          <p className="section-copy" style={{ margin: 0 }}>
            Fill in your details and we’ll be in touch as soon as our baristas and management step off the bar.
          </p>
          <ContactForm />
        </div>

        <aside className="location-panel">
          <span className="eyebrow">Find the café</span>
          {settings?.addressLine1 ? (
            <>
              <h2>{settings.addressLine1}</h2>
              <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} style={{ color: "var(--caramel)", flexShrink: 0 }} />
                <span>{[settings.addressLine2, settings.city, settings.region, settings.postalCode].filter(Boolean).join(", ")}</span>
              </p>
            </>
          ) : (
            <>
              <h2>Location to come.</h2>
              <p>
                The café address and opening hours will appear here once configured in the store settings. We don&apos;t publish placeholder addresses as real locations.
              </p>
            </>
          )}

          <div style={{ borderTop: "1px solid rgba(53, 37, 31, 0.12)", paddingTop: 20, marginTop: 24, display: "grid", gap: 14 }}>
            {settings?.email && (
              <p style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, fontSize: 13 }}>
                <Mail size={16} style={{ color: "var(--caramel)" }} />
                <span>Email: <a href={`mailto:${settings.email}`} className="text-link" style={{ textTransform: "none", fontSize: 13 }}>{settings.email}</a></span>
              </p>
            )}
            {settings?.phone && (
              <p style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, fontSize: 13 }}>
                <Phone size={16} style={{ color: "var(--caramel)" }} />
                <span>Phone: <a href={`tel:${settings.phone}`}>{settings.phone}</a></span>
              </p>
            )}
            {hoursDisplay ? (
              <p style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, fontSize: 13 }}>
                <Clock size={16} style={{ color: "var(--caramel)" }} />
                <span>Opening hours: {hoursDisplay}</span>
              </p>
            ) : (
              <p style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, fontSize: 13, color: "var(--muted)" }}>
                <Clock size={16} style={{ color: "var(--caramel)" }} />
                <span>Hours: 7:00 AM – 7:00 PM (Daily) upon launch</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
