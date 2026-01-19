"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tier = "Bronze" | "Silver" | "Gold";

type Props = {
  /** If false, the "Recommended" badge is never shown (use this on homepage). */
  allowHighlight?: boolean;
  /** Prefills contact form website */
  website?: string;
};

export default function PricingCards({ allowHighlight = true, website = "" }: Props) {
  const [highlightTier, setHighlightTier] = useState<Tier | "">("");
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!allowHighlight) {
      setHighlightTier("");
      return;
    }

    try {
      // ONLY highlight when arriving from audit via query param (?tier=Gold|Silver|Bronze)
      const params = new URLSearchParams(window.location.search);
      const qp = (params.get("tier") || "").trim().toLowerCase();

      const mapped: Tier | "" =
        qp === "bronze" ? "Bronze" :
        qp === "silver" ? "Silver" :
        qp === "gold" ? "Gold" :
        "";

      setHighlightTier(mapped);
    } catch {
      setHighlightTier("");
    }
  }, [allowHighlight]);

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

  // Track active slide on scroll (mobile only; dots hidden on desktop anyway)
  function handleScroll() {
    const el = sliderRef.current;
    if (!el) return;

    // Throttle using requestAnimationFrame
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-slide='1']"));
      if (!slides.length) return;

      // Find slide whose center is closest to the container center
      const containerCenter = el.scrollLeft + el.clientWidth / 2;

      let bestIdx = 0;
      let bestDist = Infinity;

      slides.forEach((s, idx) => {
        const slideCenter = s.offsetLeft + s.clientWidth / 2;
        const dist = Math.abs(slideCenter - containerCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      setActiveIndex(bestIdx);
    });
  }

  function scrollToIndex(i: number) {
    const el = sliderRef.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-slide='1']"));
    const target = slides[i];
    if (!target) return;

    el.scrollTo({
      left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
      behavior: "smooth"
    });
  }

  useEffect(() => {
    // Set initial active index (in case the container starts scrolled)
    handleScroll();

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginTop: 16 }}>
      <style>{`
        /* Mobile slider */
        .pricingSlider {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 4px 2px 12px;
          scrollbar-width: none;
        }
        .pricingSlider::-webkit-scrollbar { display: none; }

        .slide {
          scroll-snap-align: center;
          flex: 0 0 86%;
          max-width: 520px;
        }

        /* Desktop grid */
        @media (min-width: 900px) {
          .pricingSlider {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
            overflow: visible;
            scroll-snap-type: none;
            padding: 0;
          }
          .slide {
            flex: initial;
            max-width: none;
          }
        }

        /* Dots */
        .dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }
        .dotBtn {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(0,0,0,.18);
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .dotActive {
          background: var(--brand-red);
        }
        @media (min-width: 900px) {
          .dots { display: none; }
        }
      `}</style>

      <div
        ref={sliderRef}
        className="pricingSlider"
        onScroll={handleScroll}
        aria-label="Pricing tiers"
      >
        {plans.map((p, idx) => {
          const isRec = allowHighlight && highlightTier && p.tier === highlightTier;

          return (
            <div className="slide" data-slide="1" key={p.tier} aria-label={`Plan ${idx + 1} of ${plans.length}`}>
              <div
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="dots" aria-label="Pricing slider navigation">
        {plans.map((_, i) => (
          <button
            key={i}
            className={`dotBtn ${i === activeIndex ? "dotActive" : ""}`}
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to plan ${i + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
