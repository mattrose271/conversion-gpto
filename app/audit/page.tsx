"use client";

import { useEffect, useRef, useState } from "react";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      if (timerRef.current) window.clearInterval(timerRef.current);

      timerRef.current = window.setInterval(() => {
        setElapsed((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
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
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const g = report?.grades;

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 20 }}>
      {/* Spinner keyframes */}
      <style>{`
        @keyframes leafyDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            {loading ? (
              <>
                <span>Generating</span>
                {/* ✅ Spinner dot */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "currentColor",
                    display: "inline-block",
                    animation: "leafyDot 1s infinite"
                  }}
                />
              </>
            ) : (
              "Generate"
            )}
          </button>

          {/* ✅ Timer badge */}
          {loading && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.06)",
                fontSize: 13,
                opacity: 0.9,
                whiteSpace: "nowrap"
              }}
              aria-live="polite"
            >
              ⏱ {elapsed}s
            </div>
          )}
        </div>
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
                  <tr
                    key={String(k)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}
                  >
                    <td style={{ padding: "10px 6px", fontWeight: 800 }}>
                      {k as string}
                    </td>
                    <td
                      style={{
                        padding: "10px 6px",
                        textAlign: "right",
                        fontWeight: 900
                      }}
                    >
                      {v as string}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 12,
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  Recommended GPTO Tier: {report.tier}
                </div>
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
          {renderBlock(
            "Technical Readiness",
            report.explanations?.perCategory?.technicalReadiness
          )}
        </>
      )}
    </main>
  );
}

function renderBlock(title: string, block: any) {
  const strengths = (block?.strengths?.length
    ? block.strengths
    : ["Not observed in public content."]
  ).slice(0, 6);

  const gaps = (block?.gaps?.length ? block.gaps : ["Not observed in public content."]).slice(
    0,
    6
  );

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
      <ul>
        {strengths.map((s: string, i: number) => (
          <li key={i}>{s}</li>
        ))}
      </ul>

      <strong>Gaps</strong>
      <ul>
        {gaps.map((s: string, i: number) => (
          <li key={i}>{s}</li>
        ))}
      </ul>

      <strong>Improvements</strong>
      <ul>
        {improvements.map((s: string, i: number) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
