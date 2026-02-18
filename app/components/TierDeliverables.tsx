"use client";

import { getTierDeliverables, type Tier } from "@/lib/data/tierDeliverables";

interface TierDeliverablesProps {
  tier: Tier | string | null | undefined;
  websiteUrl?: string;
}

export default function TierDeliverables({ tier, websiteUrl = "" }: TierDeliverablesProps) {
  const deliverables = getTierDeliverables(tier);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";

  if (!deliverables) {
    return null;
  }

  // Build Calendly URL with query parameters
  const buildCalendlyUrl = () => {
    if (!calendlyUrl) return "#";
    const url = new URL(calendlyUrl);
    if (tier) url.searchParams.set("tier", String(tier));
    if (websiteUrl) url.searchParams.set("website", websiteUrl);
    // Add redirect URL to return to website after scheduling
    if (typeof window !== "undefined") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const returnUrl = websiteUrl ? `${siteUrl}/audit?url=${encodeURIComponent(websiteUrl)}` : siteUrl;
      url.searchParams.set("redirect", returnUrl);
    }
    return url.toString();
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        {deliverables.tier} Tier Deliverables
      </h3>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
          {deliverables.price}{" "}
          <span style={{ fontSize: 18, fontWeight: 800 }}>/ month</span>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {deliverables.subtitle}
        </div>
        <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          Per month pricing. Minimum 3-month subscription.
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "14px 0" }} />

      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
        {deliverables.deliverables.map((deliverable, index) => (
          <li key={index} style={{ lineHeight: 1.5 }}>
            {deliverable}
          </li>
        ))}
      </ul>

      {calendlyUrl && (
        <div style={{ marginTop: 20 }}>
          <a
            className="btn"
            href={buildCalendlyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: "100%", textAlign: "center", display: "block" }}
          >
            Connect with Us
          </a>
        </div>
      )}
    </div>
  );
}
