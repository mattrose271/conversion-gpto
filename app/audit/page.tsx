"use client";

import { useEffect, useRef, useState } from "react";
import TierDeliverables from "../components/TierDeliverables";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Progress bar state (estimated)
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);

  // Slider state (details)
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      setProgress(8);

      if (progressRef.current) window.clearInterval(progressRef.current);

      progressRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 92) return p;
          const remaining = 92 - p;
          const base = Math.max(0.6, remaining / 30);
          const jitter = Math.random() * 1.2;
          const next = p + base + jitter;
          return Math.min(92, Math.round(next));
        });
      }, 450);
    } else {
      if (progressRef.current) {
        window.clearInterval(progressRef.current);
        progressRef.current = null;
      }
    }

    return () => {
      if (progressRef.current) window.clearInterval(progressRef.current);
    };
  }, [loading]);

  async function run() {
    if (loading) return;

    setError(null);
    setReport(null);
    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      // zod errors can come back as array
      if (!res.ok) {
        const msg =
          data?.error ||
          (Array.isArray(data) ? data?.[0]?.message : null) ||
          "Audit failed";
        throw new Error(msg);
      }

      setProgress(100);
      setReport(data);

      // Persist recommended tier and audit ID for later flows if needed
      try {
        window.localStorage.setItem("gpto_recommended_tier", String(data.tier || ""));
        if (data.auditId) {
          window.localStorage.setItem("gpto_latest_audit_id", String(data.auditId));
        }
      } catch {}

      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 350);
    } catch (e: any) {
      setLoading(false);
      setProgress(0);
      setError(e.message || "Something went wrong");
    }
  }

  // --- Slider helpers (details cards) ---
  function onSliderScroll() {
    const el = sliderRef.current;
    if (!el) return;

    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-audit-slide='1']"));
      if (!slides.length) return;

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

      setActiveSlide(bestIdx);
    });
  }

  function scrollToSlide(i: number) {
    const el = sliderRef.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-audit-slide='1']"));
    const target = slides[i];
    if (!target) return;

    el.scrollTo({
      left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
      behavior: "smooth"
    });
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const g = report?.grades;

  // Friendly score rendering (supports either "A/B/C/D" or "0..100 + grade")
  function scoreCell(label: string, key: string) {
    const scoreKey = `score_${key}`;
    const score = report?.scores?.[key] ?? report?.[scoreKey];
    const grade = g?.[key] ?? g?.[key === "aiClarity" ? "aiReadiness" : key] ?? g?.aiReadiness;

    if (typeof score === "number") return `${Math.round(score)} / 100 (${grade || "-"})`;
    return `${grade || "-"}`;
  }

  const aiKey =
    g?.aiClarity !== undefined
      ? "aiClarity"
      : g?.aiReadiness !== undefined
      ? "aiReadiness"
      : "aiReadiness";

  return (
    <div>
      <style>{`
        @keyframes leafyShimmer {
          0% { transform: translateX(-60%); opacity: 0.0; }
          30% { opacity: 0.35; }
          100% { transform: translateX(160%); opacity: 0.0; }
        }

        .auditTable td { padding: 10px 6px; }
        .auditTable tr { border-bottom: 1px solid rgba(0,0,0,.08); }

        /* Audit detail slider */
        .auditSlider {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 4px 2px 12px;
          scrollbar-width: none;

          overscroll-behavior-x: contain;
          scroll-snap-stop: always;
          touch-action: pan-x;
        }
        .auditSlider::-webkit-scrollbar { display: none; }
        .auditSlide {
          scroll-snap-align: center;
          flex: 0 0 92%;
          max-width: 720px;
        }
        @media (min-width: 900px) {
          .auditSlider { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; overflow: visible; padding: 0; scroll-snap-type: none; touch-action: auto; }
          .auditSlide { flex: initial; max-width: none; }
        }

        .auditDots { display:flex; justify-content:center; gap:8px; margin-top: 10px; }
        .auditDotBtn { width: 10px; height: 10px; border-radius: 999px; background: rgba(0,0,0,.18); border: none; padding:0; cursor:pointer; min-width: 44px; min-height: 44px; }
        .auditDotActive { background: var(--brand-red); }
        @media (min-width: 900px) { .auditDots { display:none; } }

        /* Mobile optimization for buttons - grid handled in brand.css */
        @media (max-width: 899px) {
          .btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
        }
      `}</style>

      {/* Full-screen overlay while generating */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(6px)"
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="card"
            style={{
              width: "min(720px, 92vw)",
              borderRadius: 20,
              padding: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,.35)"
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
              Sit Tight, We&apos;re Generating Your Report!
            </div>
            <div className="muted" style={{ marginBottom: 14 }}>
              Scanning public pages and compiling your scorecard.
            </div>

            <div
              style={{
                position: "relative",
                height: 14,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,.10)",
                background: "rgba(0,0,0,.06)"
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  borderRadius: 999,
                  background: "rgba(0,0,0,.20)",
                  transition: "width 250ms ease"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "40%",
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 100%)",
                  animation: "leafyShimmer 1.1s infinite"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Estimated progress
              </div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {Math.min(progress, 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branded hero */}
      <section className="hero">
        <div className="container">
          <a href="/audit" className="badge">Run the Free Audit</a>
          <h1>
            GPTO <span style={{ color: "var(--brand-red)" }}>AI</span> Readiness Audit
          </h1>
          <p style={{ maxWidth: "100%" }}>
            Paste a website URL to generate a scorecard + PDF download.
          </p>

          {/* Input + Generate (branded) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && url.trim()) run();
            }}
            style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              aria-label="Website URL"
              style={{ minWidth: "min(100%, 260px)", flex: 1 }}
            />
            <button className="btn" type="submit" disabled={loading || !url.trim()} style={{ minWidth: "min(100%, 140px)" }}>
              {loading ? "Generating…" : "Generate"}
            </button>
            <a href="/pricing" className="btn alt" style={{ minWidth: "min(100%, 140px)" }}>
              See Plans
            </a>
          </form>

          {error && <p style={{ marginTop: 12, color: "var(--brand-red)" }}>{error}</p>}
        </div>
      </section>

      {/* Results */}
      <section className="section">
        <div className="container">
          {report ? (
            <>
              <div className="muted" style={{ marginBottom: 12 }}>
                Scanned {report.scope?.scannedPages} pages (max {report.scope?.maxPages}) •{" "}
                {report.scope?.usedSitemap ? "sitemap.xml" : "link crawl"}
              </div>

              <div className="grid cols-2" style={{ alignItems: "start", gap: 16 }}>
                {/* Scorecard */}
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Scorecard</h2>

                  <table className="auditTable" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {[
                        ["AI Clarity", scoreCell("AI Clarity", aiKey)],
                        ["Structure", scoreCell("Structure", "structure")],
                        ["Content Depth", scoreCell("Content Depth", "contentDepth")],
                        ["Technical", scoreCell("Technical", "technicalReadiness")],
                        ["Overall", scoreCell("Overall", "overall")]
                      ].map(([k, v]) => (
                        <tr key={String(k)}>
                          <td style={{ fontWeight: 800 }}>{k as string}</td>
                          <td style={{ textAlign: "right", fontWeight: 900 }}>{v as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 900 }}>
                      Recommended GPTO Tier:{" "}
                      <span style={{ color: "var(--brand-red)" }}>{report.tier}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {(report.explanations?.tierWhy ?? []).slice(0, 2).join(" ")}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                      <a className="btn" href={`/api/audit/pdf?url=${encodeURIComponent(report.url)}`}>
                        Download PDF
                      </a>
                      <a className="btn alt" href="#details">
                        See Details
                      </a>
                      <a
                        className="btn alt"
                        href={`/pricing?tier=${encodeURIComponent(report.tier || "")}&url=${encodeURIComponent(
                          report.url || ""
                        )}`}
                      >
                        View All Plans
                      </a>
                    </div>
                  </div>
                </div>

                {/* What scores mean */}
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>What these scores mean</h3>
                  <ul>
                    <li>
                      <strong>AI Clarity:</strong> How easily an AI system can answer what you do, who it’s for, and how it works from your site.
                    </li>
                    <li>
                      <strong>Structure:</strong> How clearly pages are organized with titles, headings, and metadata.
                    </li>
                    <li>
                      <strong>Content Depth:</strong> Whether pages provide enough specific information to avoid AI guessing.
                    </li>
                    <li>
                      <strong>Technical:</strong> Crawlability and machine signals like clean indexing, low errors, and structured metadata.
                    </li>
                  </ul>
                  <small className="muted">
                    These are based on observable signals from scanned public pages.
                  </small>
                </div>
              </div>

              {/* Tier Deliverables - Automatically displayed */}
              {report.tier && (
                <div style={{ marginTop: 24 }}>
                  <TierDeliverables tier={report.tier} websiteUrl={report.url} />
                </div>
              )}

              <div id="details" />

              {/* Detail blocks as swipe slider on mobile */}
              <div style={{ marginTop: 16 }}>
                <div
                  ref={sliderRef}
                  className="auditSlider"
                  onScroll={onSliderScroll}
                  aria-label="Audit details"
                >
                  <div className="auditSlide" data-audit-slide="1">
                    {renderBlock(
                      "AI Clarity",
                      report.explanations?.perCategory?.aiReadiness || report.explanations?.perCategory?.aiClarity,
                      report.tier,
                      report.url
                    )}
                  </div>

                  <div className="auditSlide" data-audit-slide="1">
                    {renderBlock(
                      "Structure",
                      report.explanations?.perCategory?.structure,
                      report.tier,
                      report.url
                    )}
                  </div>

                  <div className="auditSlide" data-audit-slide="1">
                    {renderBlock(
                      "Content Depth",
                      report.explanations?.perCategory?.contentDepth,
                      report.tier,
                      report.url
                    )}
                  </div>

                  <div className="auditSlide" data-audit-slide="1">
                    {renderBlock(
                      "Technical",
                      report.explanations?.perCategory?.technicalReadiness,
                      report.tier,
                      report.url
                    )}
                  </div>
                </div>

                <div className="auditDots" aria-label="Audit detail navigation">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`auditDotBtn ${i === activeSlide ? "auditDotActive" : ""}`}
                      onClick={() => scrollToSlide(i)}
                      aria-label={`Go to section ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Run an audit</h3>
              <p className="muted">
                Enter your website above and hit <strong>Generate</strong> to get a scorecard, a shareable PDF,
                and a clear path to improve AI visibility.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Conversion Interactive Agency — All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function renderBlock(title: string, block: any, tier: string, websiteUrl: string) {
  const strengths: string[] = (block?.strengths?.length
    ? block.strengths
    : ["Solid foundation observed at this scan depth."]
  ).slice(0, 6);

  const gapsRaw: string[] = (block?.gaps ?? []).slice(0, 6);
  const improvementsRaw: string[] = (block?.improvements ?? []).slice(0, 6);

  const noMajorGaps =
    gapsRaw.length === 0 ||
    (gapsRaw.length === 1 && String(gapsRaw[0]).toLowerCase().includes("no major"));

  const defaultOpportunities: Record<string, string[]> = {
    "AI Clarity": [
      "Make your one-sentence “what we do” statement consistent across homepage, pricing, and primary service/product pages.",
      "Add a clear “who it’s for” section with 2–4 concrete audience examples (roles/industries).",
      "Add a short “how it works” section or FAQ to reduce ambiguity for AI summaries and answer engines.",
      "Add trust signals near decision points (case studies, customer logos, security/privacy links)."
    ],
    "Structure": [
      "Align page titles + H1s to the exact questions people search for (improves AI extractability and clarity).",
      "Standardize templates: one clear H1, supporting H2 sections, and consistent internal linking between key pages.",
      "Add meta descriptions to your highest-traffic pages to improve snippet clarity and indexing confidence.",
      "Create clearer topic clusters (service → FAQs → case studies) so AI systems understand page relationships."
    ],
    "Content Depth": [
      "Add decision-support content: FAQs, comparisons, use cases, and “who it’s for / not for” sections.",
      "Expand thin pages with specifics: process, deliverables, timelines, proof points, and next steps.",
      "Create 2–3 authoritative pages that explain your core offer in depth and link to them from key pages.",
      "Add examples (screenshots, outcomes, results) that reduce AI uncertainty when summarizing."
    ],
    "Technical": [
      "Extend structured data (JSON-LD) beyond the homepage to core service/product and FAQ pages where relevant.",
      "Ensure canonical tags are consistent across variants (www/non-www, trailing slash, query params).",
      "Publish/verify sitemap.xml and reference it in robots.txt for cleaner discovery.",
      "Reduce redirect chains and broken links to improve crawl reliability over time."
    ]
  };

  const nextLevel: string[] = (improvementsRaw.length
    ? improvementsRaw
    : defaultOpportunities[title] ?? [
        "Even strong sites benefit from ongoing AI optimization: refine clarity, consistency, and machine-readability across more pages."
      ]
  ).slice(0, 6);

  const gapsHeading = noMajorGaps ? "Optimization Opportunities (Next Level)" : "Gaps";
  const gapsList = noMajorGaps
    ? nextLevel
    : gapsRaw.length
    ? gapsRaw
    : ["No critical issues detected — focus shifts to optimization opportunities."];

  const pricingHref = `/pricing?tier=${encodeURIComponent(tier || "")}&url=${encodeURIComponent(
    websiteUrl || ""
  )}`;

  return (
    <section className="card" style={{ height: "100%" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <strong>Strengths</strong>
      <ul>{strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      <strong>{gapsHeading}</strong>
      <ul>{gapsList.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      {/* REPLACES "Recommended Next Steps" */}
      <div style={{ marginTop: 14 }}>
        <a
          className="btn"
          href={pricingHref}
          style={{ width: "100%", textAlign: "center", display: "block" }}
        >
          Learn More About Our Packages
        </a>
      </div>

      {noMajorGaps && (
        <small className="muted" style={{ display: "block", marginTop: 10 }}>
          Even when foundations are strong, AI visibility improves through ongoing refinement as models and queries evolve.
        </small>
      )}
    </section>
  );
}
