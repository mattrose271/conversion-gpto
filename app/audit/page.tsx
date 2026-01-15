"use client";

import { useEffect, useRef, useState } from "react";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        .auditTable td { padding: 10px 6px; }
        .auditTable tr { border-bottom: 1px solid rgba(0,0,0,.08); }
        /* If your theme is dark via brand.css, these still look good; if not, they remain readable. */
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
          <span className="badge">Conversion Interactive Agency</span>
          <h1>
            GPTO <span style={{ color: "var(--brand-red)" }}>AI</span> Readiness Audit
          </h1>
          <p style={{ maxWidth: 720 }}>
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
              style={{ minWidth: 260, flex: 1 }}
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

              <div className="grid cols-2" style={{ alignItems: "start" }}>
                {/* Scorecard */}
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Scorecard</h2>

                  <table className="auditTable" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {[
                        ["AI Readiness", g.aiReadiness],
                        ["Structure", g.structure],
                        ["Content Depth", g.contentDepth],
                        ["Technical Readiness", g.technicalReadiness],
                        ["Overall", g.overall]
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
                      Recommended GPTO Tier: <span style={{ color: "var(--brand-red)" }}>{report.tier}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {(report.explanations?.tierWhy ?? []).slice(0, 2).join(" ")}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                      <a
                        className="btn"
                        href={`/api/audit/pdf?url=${encodeURIComponent(report.url)}`}
                      >
                        Download PDF
                      </a>
                      <a className="btn alt" href="#details">
                        See Details
                      </a>
                    </div>
                  </div>
                </div>

                {/* One-line explanations (optional placeholder area if you want) */}
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>What these scores mean</h3>
                  <ul>
                    <li><strong>AI Readiness:</strong> How easily an AI system can answer what you do, who it’s for, and how it works from your site.</li>
                    <li><strong>Structure:</strong> How clearly pages are organized with titles, headings, and metadata.</li>
                    <li><strong>Content Depth:</strong> Whether pages provide enough specific information to avoid AI guessing.</li>
                    <li><strong>Technical Readiness:</strong> Crawlability and machine signals like clean indexing, low errors, and structured metadata.</li>
                  </ul>
                  <small className="muted">
                    These are based on observable signals from scanned public pages.
                  </small>
                </div>
              </div>

              <div id="details" />

              {/* Detail blocks */}
              <div className="grid cols-2" style={{ marginTop: 16 }}>
                {renderBlock("AI Readiness", report.explanations?.perCategory?.aiReadiness)}
                {renderBlock("Structure", report.explanations?.perCategory?.structure)}
              </div>
              <div className="grid cols-2" style={{ marginTop: 16 }}>
                {renderBlock("Content Depth", report.explanations?.perCategory?.contentDepth)}
                {renderBlock("Technical Readiness", report.explanations?.perCategory?.technicalReadiness)}
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
        <div className="container">© {new Date().getFullYear()} Conversion Interactive Agency — All rights reserved.</div>
      </footer>
    </div>
  );
}

function renderBlock(title: string, block: any) {
  const strengths = (block?.strengths?.length ? block.strengths : ["Not observed in public content."]).slice(0, 6);
  const gaps = (block?.gaps?.length ? block.gaps : ["Not observed in public content."]).slice(0, 6);
  const improvements = (block?.improvements ?? []).slice(0, 6);

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <strong>Strengths</strong>
      <ul>{strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      <strong>Gaps</strong>
      <ul>{gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>

      <strong>Improvements</strong>
      <ul>{improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
    </section>
  );
}
