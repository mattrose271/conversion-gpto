"use client";

import { useEffect, useRef, useState } from "react";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mobile slider active section
  const [activeSection, setActiveSection] = useState<0 | 1 | 2 | 3>(0);

  // Touch swipe handling
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Progress bar state (estimated)
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);

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

  function goPrev() {
    setActiveSection((s) => ((s + 3) % 4) as 0 | 1 | 2 | 3);
  }
  function goNext() {
    setActiveSection((s) => ((s + 1) % 4) as 0 | 1 | 2 | 3);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;

    touchStartRef.current = null;

    // Ignore long presses / slow drags
    if (dt > 900) return;

    // Must be mostly horizontal
    if (Math.abs(dx) < 55) return; // swipe threshold
    if (Math.abs(dy) > 80) return; // too vertical

    if (dx < 0) goNext(); // swipe left
    else goPrev(); // swipe right
  }

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
      if (!res.ok) throw new Error(data?.error || "Audit failed");

      // Finish bar, then reveal content
      setProgress(100);
      setReport(data);

      // Reset mobile slider to first section on each new report
      setActiveSection(0);

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

  const g = report?.grades;

  return (
    <div>
      <style>{`
        @keyframes leafyShimmer {
          0% { transform: translateX(-60%); opacity: 0.0; }
          30% { opacity: 0.35; }
          100% { transform: translateX(160%); opacity: 0.0; }
        }

        /* --- Responsive helpers --- */
        .mobileOnly { display: none; }
        .desktopOnly { display: block; }

        /* Scorecard table styles */
        .auditTable { width: 100%; border-collapse: collapse; }
        .auditTable td { padding: 10px 6px; vertical-align: top; }
        .auditTable tr { border-bottom: 1px solid rgba(0,0,0,.08); }
        .auditLabel { font-weight: 800; }
        .auditValue { text-align: right; font-weight: 900; }

        /* “Report sections” pills */
        .segRow {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
        }
        .segRow::-webkit-scrollbar { display: none; }
        .sectionHint { font-size: 12px; opacity: 0.7; margin-top: 8px; }

        /* Prevent long sections (esp. Technical) from clipping on mobile */
        .auditBlock {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* Let iPhone scroll vertically while we still detect horizontal swipes */
        .swipeArea {
          touch-action: pan-y;
        }

        /* Make cards and content fit small phones cleanly */
        @media (max-width: 900px) {
          .mobileOnly { display: block; }
          .desktopOnly { display: none; }

          /* Ensure your brand grid never stays 2-col on iPhone */
          .grid.cols-2, .grid.cols-3 { grid-template-columns: 1fr !important; }

          /* Tighter paddings */
          .container { padding-left: 16px !important; padding-right: 16px !important; }

          /* Make hero headings wrap nicely */
          h1 { font-size: 34px !important; line-height: 1.05 !important; }

          /* Form should stack cleanly */
          .auditForm { flex-direction: column !important; align-items: stretch !important; }
          .auditForm input { width: 100% !important; min-width: 0 !important; }
          .auditForm .btn, .auditForm .btn.alt { width: 100% !important; text-align: center !important; }

          /* Scorecard + Meaning cards stack */
          .scoreRow { display: grid !important; grid-template-columns: 1fr !important; gap: 12px !important; }

          /* Table stays readable on very narrow screens */
          .auditLabel { font-size: 15px !important; }
          .auditValue { font-size: 15px !important; }
        }

        /* Ultra-small iPhones */
        @media (max-width: 380px) {
          h1 { font-size: 30px !important; }
          .auditTable td { padding: 8px 4px; }
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
              <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.min(progress, 100)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Branded hero */}
      <section className="hero">
        <div className="container">
          <span className="badge">Conversion Interactive Agency</span>
          <h1>
            GPTO <span style={{ color: "var(--brand-red)" }}>AI</span> Clarity Audit
          </h1>
          <p style={{ maxWidth: 720 }}>
            Paste a website URL to generate a scorecard + PDF download.
          </p>

          <form
            className="auditForm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && url.trim()) run();
            }}
            style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              aria-label="Website URL"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="btn" type="submit" disabled={loading || !url.trim()}>
              {loading ? "Generating…" : "Generate"}
            </button>
            <a href="/pricing" className="btn alt">
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

              {/* Scorecard + Meaning (mobile-safe stack via .scoreRow) */}
              <div className="scoreRow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Scorecard</h2>

                  <table className="auditTable">
                    <tbody>
                      {[
                        ["AI Clarity", g.aiClarity],
                        ["Structure", g.structure],
                        ["Content Depth", g.contentDepth],
                        ["Technical", g.technicalClarity],
                        ["Overall", g.overall]
                      ].map(([k, v]) => (
                        <tr key={String(k)}>
                          <td className="auditLabel">{k as string}</td>
                          <td className="auditValue">{v as string}</td>
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
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginTop: 0 }}>What these scores mean</h3>
                  <ul style={{ marginBottom: 0 }}>
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
                  <small className="muted">Based on observable signals from scanned public pages.</small>
                </div>
              </div>

              <div id="details" />

              {/* Desktop: show all four */}
              <div className="desktopOnly">
                <div className="grid cols-2" style={{ marginTop: 16 }}>
                  {renderBlock("AI Clarity", report.explanations?.perCategory?.aiClarity)}
                  {renderBlock("Structure", report.explanations?.perCategory?.structure)}
                </div>
                <div className="grid cols-2" style={{ marginTop: 16 }}>
                  {renderBlock("Content Depth", report.explanations?.perCategory?.contentDepth)}
                  {renderBlock("Technical", report.explanations?.perCategory?.technicalClarity)}
                </div>
              </div>

              {/* Mobile: slider + swipe */}
              <div className="mobileOnly" style={{ marginTop: 16 }}>
                <div className="card" style={{ marginBottom: 12 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>Report Sections</strong>

                  <div className="segRow">
                    {["AI Clarity", "Structure", "Content", "Technical"].map((label, idx) => {
                      const isActive = activeSection === idx;
                      return (
                        <button
                          key={label}
                          className={`btn ${isActive ? "" : "alt"}`}
                          style={{ whiteSpace: "nowrap" }}
                          onClick={() => setActiveSection(idx as 0 | 1 | 2 | 3)}
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button className="btn alt" type="button" onClick={goPrev}>
                      ← Prev
                    </button>
                    <button className="btn" type="button" onClick={goNext}>
                      Next →
                    </button>
                  </div>

                  <div className="sectionHint">Tip: Swipe left/right on the section below.</div>
                </div>

                <div className="swipeArea" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                  {activeSection === 0 &&
                    renderBlock("AI Clarity", report.explanations?.perCategory?.aiClarity)}
                  {activeSection === 1 &&
                    renderBlock("Structure", report.explanations?.perCategory?.structure)}
                  {activeSection === 2 &&
                    renderBlock("Content Depth", report.explanations?.perCategory?.contentDepth)}
                  {activeSection === 3 &&
                    renderBlock("Technical", report.explanations?.perCategory?.technicalClarity)}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Run an audit</h3>
              <p className="muted">
                Enter a domain above and click Generate. You’ll get a scorecard and a PDF download.
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

function renderBlock(title: string, block: any) {
  const strengths: string[] =
    (block?.strengths?.length ? block.strengths : ["Solid foundation observed at this scan depth."]).slice(0, 6);

  const gapsRaw: string[] = (block?.gaps ?? []).slice(0, 6);
  const improvementsRaw: string[] = (block?.improvements ?? []).slice(0, 6);

  const defaultOpportunities: Record<string, string[]> = {
    "AI Clarity": [
      "Make your one-sentence “what we do” statement consistent across homepage, pricing, and primary service/product pages.",
      "Add a clear “who it’s for” section with 2–4 concrete audience examples (roles/industries).",
      "Add a short “how it works” section or FAQ to reduce ambiguity for AI summaries and answer engines.",
      "Add trust signals near decision points (case studies, customer logos, security/privacy links)."
    ],
    "Structure": [
      "Align page titles + H1s to the exact questions people search for (improves AI extractability and Clarity).",
      "Standardize templates: one clear H1, supporting H2s, and consistent internal linking between key pages.",
      "Add meta descriptions to your highest-traffic pages to improve snippet Clarity and indexing confidence.",
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

  const nextLevel: string[] =
    (improvementsRaw.length ? improvementsRaw : defaultOpportunities[title] ?? [
      "Even strong sites benefit from ongoing AI optimization: refine Clarity, consistency, and machine-readability across more pages."
    ]).slice(0, 6);

  const hasGaps =
    gapsRaw.length > 0 &&
    !(gapsRaw.length === 1 && String(gapsRaw[0]).toLowerCase().includes("no major"));

  return (
    <section className="card auditBlock">
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <strong>Strengths</strong>
      <ul>{strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      {hasGaps && (
        <>
          <strong>Gaps</strong>
          <ul>{gapsRaw.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </>
      )}

      <strong>Optimization Opportunities (Next Level)</strong>
      <ul>{nextLevel.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      <strong>Recommended Next Steps</strong>
      <ul>{nextLevel.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      {!hasGaps && (
        <small className="muted">
          Even when foundations are strong, AI visibility improves through ongoing refinement as models and queries evolve.
        </small>
      )}
    </section>
  );
}
