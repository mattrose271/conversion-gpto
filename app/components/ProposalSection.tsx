"use client";

import { getTierDeliverables } from "@/lib/data/tierDeliverables";
import { ComplianceFooter } from "./ComplianceFooter";

interface ProposalSectionProps {
  executiveSummary?: string | null;
  focusArea?: string | null;
  recommendedTier: string | null;
  websiteUrl?: string | null;
}

export function ProposalSection({
  executiveSummary,
  focusArea,
  recommendedTier,
  websiteUrl,
}: ProposalSectionProps) {
  const deliverables = getTierDeliverables(recommendedTier);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";

  const buildCalendlyUrl = () => {
    if (!calendlyUrl) return "#";
    try {
      const url = new URL(calendlyUrl);
      if (recommendedTier) url.searchParams.set("tier", recommendedTier);
      if (websiteUrl) url.searchParams.set("website", websiteUrl);
      if (typeof window !== "undefined") {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const returnUrl = websiteUrl ? `${siteUrl}/audit?url=${encodeURIComponent(websiteUrl)}` : siteUrl;
        url.searchParams.set("redirect", returnUrl);
      }
      return url.toString();
    } catch {
      return calendlyUrl;
    }
  };

  const pricingHref = `/pricing?tier=${encodeURIComponent(recommendedTier || "")}&url=${encodeURIComponent(websiteUrl || "")}`;

  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        marginBottom: 20,
        border: "1px solid rgba(0,0,0,.1)",
      }}
    >
      <div
        style={{
          padding: "0 0 16px 0",
          marginBottom: 20,
          borderBottom: "1px solid rgba(0,0,0,.1)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--brand-red)" }}>
          Proposal
        </h3>
      </div>

      {executiveSummary && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            Executive Summary
          </p>
          <p style={{ margin: 0, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {executiveSummary}
          </p>
        </div>
      )}

      {focusArea && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            Focus Area
          </p>
          <p style={{ margin: 0, color: "#333", lineHeight: 1.6 }}>
            {focusArea}
          </p>
        </div>
      )}

      {deliverables && (
        <div
          style={{
            padding: "20px",
            background: "rgba(0,0,0,.02)",
            borderRadius: 6,
            marginBottom: 16,
            border: "1px solid rgba(0,0,0,.08)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>
              Recommended Tier: <span style={{ color: "var(--brand-red)" }}>{deliverables.tier}</span>
            </p>
            <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
              {deliverables.price}{" "}
              <span style={{ fontSize: 18, fontWeight: 800 }}>/ month</span>
            </div>
            <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
              Per month pricing. Minimum 3-month subscription. No dynamic pricing.
            </p>
            <p style={{ margin: "8px 0 0", color: "#333", fontSize: 14 }}>
              {deliverables.subtitle}
            </p>
          </div>

          <div style={{ height: 1, background: "rgba(0,0,0,.1)", margin: "16px 0" }} />

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 10 }}>
              What This Strengthens
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
              {deliverables.deliverables.map((item, index) => (
                <li key={index} style={{ lineHeight: 1.6, color: "#333", fontSize: 14 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 8 }}>
              What This Enables
            </p>
            <p style={{ margin: 0, color: "#333", lineHeight: 1.6, fontSize: 14 }}>
              GPTO strengthens structural visibility conditions. It supports clearer communication
              of your services, reinforces authority signals, and reduces ambiguity for AI systems.
              Your brand becomes easier to understand, trust, and recommend across AI-driven
              discovery channels.
            </p>
          </div>

          <div
            style={{
              padding: "12px 16px",
              background: "#fff9f9",
              borderRadius: 6,
              border: "1px solid rgba(194,15,44,.15)",
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 6 }}>
              Important Clarification
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.6 }}>
              GPTO strengthens structural visibility conditions. It does not generate traffic, leads,
              or revenue independently.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              className="btn"
              href={pricingHref}
              style={{
                display: "inline-block",
                fontSize: 16,
                padding: "14px 28px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View {deliverables.tier} Package Details
            </a>
            {calendlyUrl && (
              <a
                className="btn alt"
                href={buildCalendlyUrl()}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  fontSize: 16,
                  padding: "14px 28px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Connect with Us
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 16, borderTop: "1px solid rgba(0,0,0,.1)" }}>
        <ComplianceFooter />
      </div>
    </div>
  );
}
