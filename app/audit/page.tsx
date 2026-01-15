"use client";

import { useEffect, useRef, useState } from "react";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Progress bar state (estimated)
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);

  useEffect(() => {
    // Drive an "estimated" progress bar while loading
    if (loading) {
      setProgress(8);

      if (progressRef.current) window.clearInterval(progressRef.current);

      progressRef.current = window.setInterval(() => {
        setProgress((p) => {
          // Cap at 92% while still loading; final jump happens when request completes
          if (p >= 92) return p;

          // Ease-out style growth: smaller increments as you get higher
          const remaining = 92 - p;
          const base = Math.max(0.6, remaining / 30); // smaller near the end
          const jitter = Math.random() * 1.2; // makes it feel alive
          const next = p + base + jitter;

          return Math.min(92, Math.round(next));
        });
      }, 450);
    } else {
      // stop interval when not loading
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

      // ✅ Complete the bar just before showing results
      setProgress(100);
      setReport(data);

      // Small delay so the user sees completion before overlay disappears
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
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 20 }}>
      {/* Minimal CSS for progress + overlay */}
      <style>{`
        @keyframes leafyShimmer {
          0% { transform: translateX(-60%); opacity: 0.0; }
          30% { opacity: 0.35; }
          100% { transform: translateX(160%); opacity: 0.0; }
        }
      `}</style>

      {/* ✅ Full-screen overlay while generating */}
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
            style={{
              width: "min(720px, 92vw)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.08)",
              padding: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,.35)"
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
              Sit Tight, We&apos;re Generating Your Report!
            </div>
            <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 14 }}>
              Scanning public pages and compiling your scorecard.
            </div>

            {/* Progress track */}
            <div
              style={{
                position: "relative",
                height: 14,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              {/* Filled progress */}
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.28)",
                  transition: "width 250ms ease"
                }}
              />

              {/* Shimmer pass (adds motion so it feels active) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "40%",
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.25) 50%, rgba(255,255,255,0) 100%)",
                  animation: "leafyShimmer 1.1s infinite"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Estimated progress
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
                {Math.min(progress, 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ margin: 0, fontSize: 34 }}>GPTO AI Readiness Audit</h1>
      <p style={{ opacity: 0.8 }}>
        Paste a website URL to generate a scorecard + PDF download.
      </p>

      {/* ✅ Enter key + button click */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && url.trim()) run();
        }}
        style={{ display: "flex", gap: 10, marginTop: 14 }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.15)",
            background: "rgba(255,255,255,.06)",
            color: "inherit"
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.15)",
            background: "rgba(255,255,255,.12)",
            color: "inherit",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p style={{ marginTop: 14, color: "#ffb4b4" }}>{error}</p>}

      {report && (
        <>
          <div style={{ marginTop: 18, opacity: 0.8, fontSize: 13 }}>
            Scanned {report.scope?.scannedPages} pages (max {report.scope?.maxPages}) •{" "}
            {report.scope?.usedSitemap ? "sitemap.xml" : "link crawl"}
          </div>

          {/* SCORECARD TABLE FIRST */}
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 16,
              padding: 14,
              background: "rgba(255,255,255,.06)"
            }}
          >
            <h2 style={{ marginTop: 0 }}>Scorecard</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["AI Openness", g.aiOpenness],
                  ["Structure", g.structure],
                  ["Content Depth", g.contentDepth],
                  ["Technical Readiness", g.technicalReadiness],
                  ["Overall", g.overall]
                ].map(([k, v]) => (
                  <tr key={String(k)} style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                    <td style={{ padding: "10px 6px", fontWeight: 800 }}>{k as string}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 900 }}>
                      {v as string}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900 }}>Recommended GPTO Tier: {report.tier}</div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>
                  {(report.explanations?.tierWhy ?? []).slice(0, 2).join(" ")}
                </div>
              </div>

              <a
                href={`/api/audit/pdf?url=${encodeURIComponent(report.url)}`}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(255,255,255,.10)",
                  fontWeight: 800
                }}
              >
                Download PDF
              </a>
            </div>
          </div>

          {/* EXPLANATIONS */}
          {renderBlock("AI Openness", report.explanations?.perCategory?.aiOpenness)}
          {renderBlock("Structure", report.explanations?.perCategory?.structure)}
          {renderBlock("Content Depth", report.explanations?.perCategory?.contentDepth)}
          {renderBlock("Technical Readiness", report.explanations?.perCategory?.technicalReadiness)}
        </>
      )}
    </main>
  );
}

function renderBlock(title: string, block: any) {
  const strengths = (block?.strengths?.length ? block.strengths : ["Not observed in public content."]).slice(0, 6);
  const gaps = (block?.gaps?.length ? block.gaps : ["Not observed in public content."]).slice(0, 6);
  const improvements = (block?.improvements ?? []).slice(0, 6);

  return (
    <section
      style={{
        marginTop: 16,
        border: "1px solid rgba(255,255,255,.15)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,.06)"
      }}
    >
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
