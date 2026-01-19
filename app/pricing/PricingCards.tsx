"use client";

import { useMemo } from "react";

type Props = {
  /** If set, highlights that tier with a "Recommended" badge. If undefined, no badge shown. */
  highlightTier?: "Bronze" | "Silver" | "Gold";
  /** If true, shows a short "deliverables" list and a Get Started button */
  showGetStarted?: boolean;
  /** Prefills contact form website */
  website?: string;
};

export default function PricingCards({
  highlightTier,
  showGetStarted = true,
  website = ""
}: Props) {
  const plans = useMemo(() => {
    return [
      {
        tier: "Bronze" as const,
        title: "Foundation",
        price: "$999",
        sub: "Corrects core issues and establishes your AI-visibility performance baseline.",
        bullets: [
          "Essential schema markup added to your most important pages.",
          "AI-powered technical + content audit with clear action steps.",
          "Refinement of your top on-page messaging.",
          "Competitor snapshot covering search signals and basic sentiment.",
          "Content recommendations: 4–6 content ideas monthly.",
          "A clean PDF scorecard summarizing findings and opportunities."
        ]
      },
      {
        tier: "Silver" as const,
        title: "Growth",
        price: "$2,499",
        sub: "Strengthens your authority and provides competitive insight.",
        bullets: [
          "Full-site schema implementation (Organization, Service/Product, Local, FAQ).",
          "Five-competitor analysis revealing search gaps, strengths, and opportunities.",
          "Structured authority + content improvement plan built from GPTO’s framework.",
          "Lightweight telemetry module to track engagement on key pages.",
          "Quarterly re-audit to measure progress and adjust strategy."
        ]
      },
      {
        tier: "Gold" as const,
        title: "Elite",
        price: "$4,999",
        sub: "Automates optimization and delivers advanced competitive intelligence.",
        bullets: [
          "Complete real-time optimization for live search, intent, and behavior signals.",
          "Dynamic schema and adaptive SEO updated based on real-time data.",
          "10-competitor, multi-market authority + sentiment mapping.",
          "AI-supported reputation and link-building guidance.",
          "Monthly telemetry insights + executive performance dashboard."
        ]
      }
    ];
  }, []);

  function getStartedHref(tier: string) {
    const qs = new URLSearchParams();
    if (tier) qs.set("tier", tier);
    if (website) qs.set("url", website);
    return `/contact?${qs.toString()}`;
  }

  return (
    <div className="grid cols-3" style={{ alignItems: "stretch", gap: 18, marginTop: 16 }}>
      {plans.map((p) => {
        const isRec = highlightTier && p.tier === highlightTier;

        return (
          <div
            key={p.tier}
            className="card"
            style={{
              position: "relative",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255,255,255,0.85)",
              border: isRec ? "2px solid var(--brand-red)" : "1px solid rgba(0,0,0,.08)",
              boxShadow: "0 10px 30px rgba(0,0,0,.06)",
              display: "flex",
              flexDirection: "column",
              minHeight: 520
            }}
          >
            {/* Recommended badge ONLY if highlightTier provided */}
            {isRec && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #ff5aa5, #ffb55a)",
                  color: "#111",
                  fontWeight: 900,
                  fontSize: 12
                }}
              >
                Recommended
              </div>
            )}

            <div style={{ fontWeight: 900, fontSize: 18 }}>{p.tier}</div>

            <div style={{ fontSize: 40, fontWeight: 900, marginTop: 6, lineHeight: 1 }}>
              {p.price} <span style={{ fontSize: 18, fontWeight: 800 }}>/ mo</span>
            </div>

            <div className="muted" style={{ marginTop: 10, minHeight: 44 }}>
              {p.sub}
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "14px 0" }} />

            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {p.bullets.map((b) => (
                <li key={b} style={{ lineHeight: 1.3 }}>
                  {b}
                </li>
              ))}
            </ul>

            {showGetStarted && (
              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <a
                  className="btn"
                  href={getStartedHref(p.tier)}
                  style={{ width: "100%", textAlign: "center", display: "block" }}
                >
                  Get Started
                </a>
                <div className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>
                  3 month commitment
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
