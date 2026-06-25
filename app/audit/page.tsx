"use client";

import { useEffect, useRef, useState } from "react";
import AuditPrepModal, { type AuditPrepData } from "../components/AuditPrepModal";
import { CompetitiveSnapshot } from "../components/CompetitiveSnapshot";
import { ComplianceFooter } from "../components/ComplianceFooter";
import { FullAppraisalCard } from "../components/FullAppraisalCard";

type Report = any;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const progressRef = useRef<number | null>(null);

  useEffect(() => {
    const modalEmail = window.localStorage.getItem("gpto_modal_email")?.trim() || "";
    const savedEmail = window.localStorage.getItem("gpto_saved_email")?.trim() || "";
    if (modalEmail) {
      setEmail(modalEmail);
      setEmailLocked(true);
    } else if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (progressRef.current) window.clearInterval(progressRef.current);
      progressRef.current = null;
      return;
    }
    setProgress(8);
    progressRef.current = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(1, Math.round((92 - current) / 12))));
    }, 550);
    return () => {
      if (progressRef.current) window.clearInterval(progressRef.current);
    };
  }, [loading]);

  async function sendResultEmails(data: Report) {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    window.localStorage.setItem("gpto_saved_email", normalizedEmail);

    const payload = {
      email: normalizedEmail,
      auditId: data.auditId || undefined,
      scores: data.scores,
      grades: data.grades,
      businessInfo: data.businessInfo,
      executiveSummary: data.executiveSummary,
      recommendations: Array.isArray(data.recommendations)
        ? data.recommendations.map((item: any) => typeof item === "string" ? item : item.title).filter(Boolean)
        : undefined,
    };

    try {
      const response = await fetch("/api/audit/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setEmailFeedback(
        response.ok
          ? `Preliminary scorecard emailed to ${normalizedEmail}.`
          : "The scorecard is ready, but the email could not be sent."
      );
    } catch {
      setEmailFeedback("The scorecard is ready, but the email could not be sent.");
    }

    fetch("/api/audit/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        userEmail: normalizedEmail,
        url: data.url,
      }),
    }).catch(() => {});
  }

  async function runAudit(prepData: AuditPrepData) {
    if (loading) return;
    setLoading(true);
    setReport(null);
    setError(null);
    setEmailFeedback(null);
    setShowPrepModal(false);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          email: email.trim() || undefined,
          focusArea: prepData.focusArea || undefined,
          competitors: prepData.competitors.length ? prepData.competitors : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Audit failed.");
      setProgress(100);
      setReport(data);
      await sendResultEmails(data);
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "Audit failed.");
    } finally {
      window.setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    }
  }

  const scores = report?.scores || {};
  const grades = report?.grades || {};
  const dimensions = [
    ["AI Clarity", scores.aiReadiness, grades.aiReadiness],
    ["Structure", scores.structure, grades.structure],
    ["Content Depth", scores.contentDepth, grades.contentDepth],
    ["Technical", scores.technicalReadiness, grades.technicalReadiness],
  ] as const;
  const overallScore = dimensions.reduce((sum, item) => sum + (Number(item[1]) || 0), 0) / dimensions.length;

  return (
    <div>
      {loading && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,.58)",
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}>
          <div className="card" style={{ width: "min(620px, 94vw)" }}>
            <h2 style={{ marginTop: 0 }}>Generating your preliminary scorecard</h2>
            <p className="muted">Scanning public pages and capturing evidence for the optional full appraisal.</p>
            <div style={{ height: 14, background: "rgba(0,0,0,.08)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--brand-red)", transition: "width .25s" }} />
            </div>
            <p style={{ textAlign: "right", marginBottom: 0 }}>{progress}%</p>
          </div>
        </div>
      )}

      <section className="hero">
        <div className="container">
          <span className="badge">Run the Free Audit</span>
          <h1>GPTO <span style={{ color: "var(--brand-red)" }}>Preliminary</span> Audit</h1>
          <p>Get a fast crawl-based scorecard, then choose whether to generate the full eight-stage appraisal.</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (url.trim()) setShowPrepModal(true);
            }}
            style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}
          >
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="example.com"
              aria-label="Website URL"
              style={{ flex: "1 1 260px" }}
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              aria-label="Email"
              readOnly={emailLocked}
              style={{ flex: "1 1 260px", background: emailLocked ? "rgba(0,0,0,.04)" : "white" }}
            />
            <button className="btn" type="submit" disabled={loading || !url.trim()}>
              Generate
            </button>
          </form>

          <AuditPrepModal
            isOpen={showPrepModal}
            onClose={() => setShowPrepModal(false)}
            onSuccess={runAudit}
          />
          {error && <p style={{ color: "var(--brand-red)", marginTop: 12 }}>{error}</p>}
          {emailFeedback && <p style={{ marginTop: 12 }}>{emailFeedback}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {!report ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Preliminary, then evidence-led</h2>
              <p className="muted" style={{ marginBottom: 0 }}>
                The quick scorecard identifies directional signals. Only the full appraisal produces
                readiness ratings, coordinated strategy, a written proposal, and a package recommendation.
              </p>
            </div>
          ) : (
            <>
              <div className="grid cols-2" style={{ gap: 16, alignItems: "start" }}>
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Preliminary Scorecard</h2>
                  <p className="muted">Directional crawl-based signals only.</p>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {dimensions.map(([label, score, grade]) => (
                        <tr key={label} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                          <td style={{ padding: "10px 0", fontWeight: 800 }}>{label}</td>
                          <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 800 }}>
                            {Math.round(Number(score) || 0)} / 100 ({grade || "—"})
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: "10px 0", fontWeight: 900 }}>Overall</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 900 }}>
                          {Math.round(overallScore)} / 100
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <a
                    className="btn"
                    href={`/api/audit/pdf?url=${encodeURIComponent(report.url)}${report.focusArea ? `&focusArea=${encodeURIComponent(report.focusArea)}` : ""}${report.competitors?.length ? `&competitors=${encodeURIComponent(JSON.stringify(report.competitors))}` : ""}`}
                    style={{ display: "inline-block", marginTop: 16 }}
                  >
                    Download Preliminary PDF
                  </a>
                </div>

                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Audit coverage</h2>
                  <p><strong>Pages reviewed:</strong> {report.scope?.scannedPages || 0}</p>
                  <p><strong>Sitemap used:</strong> {report.scope?.usedSitemap ? "Yes" : "No"}</p>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    The audit records observable headings, excerpts, schema, FAQ, authority, service,
                    and call-to-action signals for the full appraisal.
                  </p>
                </div>
              </div>

              {report.competitorSignals?.length > 0 && (
                <CompetitiveSnapshot
                  primarySignals={report.primarySignals}
                  competitorSignals={report.competitorSignals.map((competitor: any) => ({
                    signals: competitor.signals || competitor,
                    url: competitor.url,
                  }))}
                />
              )}

              <FullAppraisalCard
                auditId={report.auditId || null}
                websiteUrl={report.url}
                initialEmail={email}
                focusArea={report.focusArea}
                competitors={report.competitors || []}
              />

              <div className="card" style={{ marginTop: 24 }}>
                <ComplianceFooter />
              </div>
            </>
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
