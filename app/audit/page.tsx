"use client";

// Trigger redeploy - Performance Summary Table updates
import { useEffect, useRef, useState } from "react";
import TierDeliverables from "../components/TierDeliverables";
import { getTierDeliverables } from "@/lib/data/tierDeliverables";

type Report = any;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedModalEmail = window.localStorage.getItem("gpto_modal_email")?.trim() || "";
    const storedSavedEmail = window.localStorage.getItem("gpto_saved_email")?.trim() || "";
    if (storedModalEmail) {
      setEmail(storedModalEmail);
      setEmailLocked(true);
    } else if (storedSavedEmail) {
      setEmail(storedSavedEmail);
    }

    const updateFromModalEmail = (value?: string | null) => {
      const trimmed = (value ?? "").trim();
      if (trimmed) {
        setEmail(trimmed);
        setEmailLocked(true);
      } else {
        setEmail("");
        setEmailLocked(false);
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      updateFromModalEmail(detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "gpto_modal_email") {
        updateFromModalEmail(event.newValue);
      }
    };

    window.addEventListener("gptoEmailUpdate", handleCustomEvent as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("gptoEmailUpdate", handleCustomEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

      // Store email in localStorage if provided
      if (email.trim()) {
        void sendAuditEmailRequest(email, data);
        
        // Send audit report email to user
        try {
          const emailPayload: Record<string, unknown> = {
            email: email.trim(),
          };

          if (data.auditId) emailPayload.auditId = data.auditId;
          if (data.tier) emailPayload.tier = data.tier;
          if (data.scores) emailPayload.scores = data.scores;
          if (data.grades) emailPayload.grades = data.grades;
          if (data.businessInfo) emailPayload.businessInfo = data.businessInfo;
          if (data.executiveSummary) emailPayload.executiveSummary = data.executiveSummary;

          const tierWhyRaw = Array.isArray(data.explanations?.tierWhy)
            ? data.explanations?.tierWhy[0]
            : data.explanations?.tierWhy;
          const tierWhy = typeof tierWhyRaw === "string" && tierWhyRaw.trim() ? tierWhyRaw.trim() : null;
          if (tierWhy) emailPayload.tierWhy = tierWhy;

          if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            // Convert recommendation objects to strings (extract title if it's an object)
            emailPayload.recommendations = data.recommendations.map((rec: any) => {
              if (typeof rec === "string") {
                return rec;
              } else if (rec && typeof rec === "object" && rec.title) {
                return rec.title;
              } else {
                return String(rec);
              }
            });
          }

          // Send email to user and show feedback
          try {
            const emailRes = await fetch("/api/audit/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload)
            });
            const emailData = await emailRes.json().catch(() => ({}));
            if (emailRes.ok && emailData?.welcomeEmailSent) {
              setEmailFeedback(`Report emailed to ${email.trim()}. Check your inbox (and spam folder).`);
            } else {
              const errMsg = emailData?.error || (!emailRes.ok ? "Server error" : "Email service unavailable");
              setEmailFeedback(`Couldn't send email: ${errMsg}. Check spam folder or try again.`);
            }
          } catch (err) {
            console.warn("Failed to send audit email to user:", err);
            setEmailFeedback("Couldn't send email. Please try again.");
          }
        } catch (err) {
          console.warn("Error preparing audit email:", err);
        }
      } else {
        setEmailFeedback(null);
      }

      // Send audit results to internal team (AUDIT_EMAIL_RECIPIENTS)
      try {
        // Ensure URL has protocol
        let normalizedUrl = url.trim();
        if (normalizedUrl && !normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = `https://${normalizedUrl}`;
        }
        
        const notifyPayload: Record<string, unknown> = {
          userEmail: email.trim() || "No email provided",
          url: normalizedUrl,
        };
        
        if (data.auditId) notifyPayload.auditId = data.auditId;
        if (data.tier) notifyPayload.tier = data.tier;
        if (data.scores) notifyPayload.scores = data.scores;
        if (data.grades) notifyPayload.grades = data.grades;
        if (data.businessInfo) notifyPayload.businessInfo = data.businessInfo;
        if (data.executiveSummary) notifyPayload.executiveSummary = data.executiveSummary;
        
        const tierWhyRaw = Array.isArray(data.explanations?.tierWhy)
          ? data.explanations?.tierWhy[0]
          : data.explanations?.tierWhy;
        const tierWhy = typeof tierWhyRaw === "string" && tierWhyRaw.trim() ? tierWhyRaw.trim() : null;
        if (tierWhy) notifyPayload.tierWhy = tierWhy;
        
        if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          // Convert recommendation objects to strings (extract title if it's an object)
          notifyPayload.recommendations = data.recommendations.map((rec: any) => {
            if (typeof rec === "string") {
              return rec;
            } else if (rec && typeof rec === "object" && rec.title) {
              return rec.title;
            } else {
              return String(rec);
            }
          });
        }

        // Send notification email to AUDIT_EMAIL_RECIPIENTS (fire and forget - don't block on errors)
        fetch("/api/audit/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notifyPayload)
        }).catch((err) => {
          console.warn("Failed to send audit notification:", err);
        });
      } catch (err) {
        console.warn("Error preparing audit notification:", err);
      }

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

  function sendAuditEmailRequest(emailAddress: string, reportData: Report) {
    const normalized = emailAddress.trim();
    if (!EMAIL_REGEX.test(normalized)) {
      setEmailFeedback("Enter a valid email to receive your audit summary.");
      return;
    }

    try {
      // Store email in localStorage
      window.localStorage.setItem("gpto_saved_email", normalized);
      setEmailFeedback(null); // Clear feedback since we're just storing, not sending
    } catch (err: any) {
      console.error("Email storage error:", err);
      // Silently fail - email storage is not critical
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
  const s = report?.scores || {};

  // Convert numeric score to letter grade
  function toGrade(score: number): string {
    if (score === 100) return "A+";
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

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

  // Calculate Overall score as average of the four other scores
  // Use the same score extraction logic as scoreCell to ensure consistency
  const aiScoreValue = report?.scores?.[aiKey] ?? report?.scores?.aiReadiness ?? report?.[`score_${aiKey}`] ?? 0;
  const structureScoreValue = report?.scores?.structure ?? report?.[`score_structure`] ?? 0;
  const contentDepthScoreValue = report?.scores?.contentDepth ?? report?.[`score_contentDepth`] ?? 0;
  const technicalScoreValue = report?.scores?.technicalReadiness ?? report?.[`score_technicalReadiness`] ?? 0;
  
  // Calculate average: (AI Clarity + Structure + Content Depth + Technical) / 4
  const overallScore = (aiScoreValue + structureScoreValue + contentDepthScoreValue + technicalScoreValue) / 4;
  const overallGrade = toGrade(overallScore);
  const emailFeedbackColor =
    emailFeedback && (/emailed/.test(emailFeedback) || emailFeedback.includes("couldn't") || emailFeedback.startsWith("Enter"))
      ? "var(--brand-red)"
      : "#555";

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

        .auditDots { display:flex; justify-content:center; gap:8px; margin-top: 16px; }
        .auditDotBtn { width: 8px; height: 8px; border-radius: 999px; background: rgba(0,0,0,.15); border: none; padding:0; cursor:pointer; min-width: 44px; min-height: 44px; transition: background 0.2s ease; }
        .auditDotBtn:hover { background: rgba(0,0,0,.25); }
        .auditDotActive { background: rgba(0,0,0,.4); }
        @media (min-width: 900px) { .auditDots { display:none; } }

        /* Mobile optimization for buttons - grid handled in brand.css */
        @media (max-width: 899px) {
          .btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
        }

        /* Comprehensive mobile responsive styles */
        @media (max-width: 640px) {
          /* Reduce card padding on mobile */
          .card {
            padding: 12px !important;
            margin-bottom: 16px !important;
          }

          /* Smaller headings on mobile */
          h2 { font-size: 24px !important; line-height: 1.2 !important; }
          h3 { font-size: 18px !important; line-height: 1.3 !important; margin-bottom: 8px !important; }

          /* Reduce spacing in sections */
          .section { padding: 24px 0 !important; }
          
          /* Tables - make them scrollable with better mobile UX */
          table {
            font-size: 14px !important;
          }
          th, td {
            padding: 8px 6px !important;
            font-size: 13px !important;
          }
          th {
            font-size: 12px !important;
            white-space: nowrap;
          }

          /* Stack grid layouts */
          .grid.cols-2 {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          /* Mobile-friendly buttons */
          .btn {
            width: 100% !important;
            min-width: auto !important;
            padding: 12px 16px !important;
            font-size: 15px !important;
          }

          /* Reduce margins and padding */
          p { margin-bottom: 10px !important; font-size: 15px !important; }
          .muted { font-size: 13px !important; }

          /* Roadmap timeline - stack on mobile */
          .roadmap-item {
            flex-direction: column !important;
            gap: 8px !important;
            align-items: flex-start !important;
          }

          /* Final close section - full width buttons */
          .final-close-buttons {
            flex-direction: column !important;
          }
          .final-close-buttons .btn {
            width: 100% !important;
          }

          /* Scorecard - reduce size on mobile */
          .scorecard-grade {
            font-size: 24px !important;
          }

          /* Large text sizes - make responsive */
          .large-text {
            font-size: 24px !important;
          }
          .xlarge-text {
            font-size: 28px !important;
          }

          /* About Your Business table - better mobile layout */
          .business-info-table td:first-child {
            width: auto !important;
            min-width: 120px;
          }
        }

        /* Tablet adjustments (641px - 899px) */
        @media (min-width: 641px) and (max-width: 899px) {
          .card {
            padding: 14px !important;
          }
          table {
            font-size: 14px;
          }
          th, td {
            padding: 10px 8px;
          }
        }

        /* Ensure tables are scrollable on small screens */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
        .table-wrapper::-webkit-scrollbar {
          height: 6px;
        }
        .table-wrapper::-webkit-scrollbar-track {
          background: rgba(0,0,0,.05);
        }
        .table-wrapper::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,.2);
          border-radius: 3px;
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
              style={{ minWidth: "min(100%, 260px)", flex: "1 1 260px" }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label="Email to receive the report"
              style={{
                minWidth: "min(100%, 260px)",
                flex: "1 1 260px",
                background: emailLocked ? "rgba(0,0,0,0.04)" : "white",
                cursor: emailLocked ? "not-allowed" : "auto"
              }}
              readOnly={emailLocked}
            />
            <button className="btn" type="submit" disabled={loading || !url.trim()} style={{ minWidth: "min(100%, 140px)" }}>
              {loading ? "Generating…" : "Generate"}
            </button>
            <a href="/pricing" className="btn alt" style={{ minWidth: "min(100%, 140px)" }}>
              See Plans
            </a>
          </form>
          {emailFeedback && (
            <p
              aria-live="polite"
              style={{
                marginTop: 10,
                fontSize: 13,
                color: emailFeedbackColor
              }}
            >
              {emailFeedback}
            </p>
          )}

          {error && <p style={{ marginTop: 12, color: "var(--brand-red)" }}>{error}</p>}
        </div>
      </section>

      {/* Results */}
      <section className="section">
        <div className="container">
          {report ? (
            <>
              <div className="grid cols-2" style={{ alignItems: "start", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                {/* Scorecard */}
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Scorecard</h2>

                  <table className="auditTable" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {[
                        ["AI Clarity", scoreCell("AI Clarity", aiKey), report.grades?.[aiKey]],
                        ["Structure", scoreCell("Structure", "structure"), report.grades?.structure],
                        ["Content Depth", scoreCell("Content Depth", "contentDepth"), report.grades?.contentDepth],
                        ["Technical", scoreCell("Technical", "technicalReadiness"), report.grades?.technicalReadiness],
                        ["Overall", `${Math.round(overallScore)} / 100 (${overallGrade})`, overallGrade]
                      ].map(([k, v, grade]) => (
                        <tr key={String(k)} style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                          <td style={{ padding: "10px 0", fontWeight: 800 }}>{k as string}</td>
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

                    <div style={{ 
                      display: "flex", 
                      gap: 12, 
                      marginTop: 16, 
                      flexWrap: "wrap",
                      paddingTop: 16,
                      borderTop: "1px solid rgba(0,0,0,.08)"
                    }}>
                      <a className="btn" href={`/api/audit/pdf?url=${encodeURIComponent(report.url)}`}>
                        Download PDF Report
                      </a>
                      <a
                        className="btn alt"
                        href={`/pricing?tier=${encodeURIComponent(report.tier || "")}&url=${encodeURIComponent(
                          report.url || ""
                        )}`}
                      >
                        View Packages
                      </a>
                    </div>
                  </div>
                </div>

                {/* What scores mean */}
                <div className="card">
                  <h3 style={{ marginTop: 0, marginBottom: 10 }}>Understanding Your Scores</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                      <strong style={{ display: "block", marginBottom: 4 }}>AI Clarity</strong>
                      <span style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
                        How easily AI tools can understand what you do, who you serve, and how you help.
                      </span>
                    </div>
                    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                      <strong style={{ display: "block", marginBottom: 4 }}>Structure</strong>
                      <span style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
                        How well your pages are organized with clear titles, headings, and descriptions.
                      </span>
                    </div>
                    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                      <strong style={{ display: "block", marginBottom: 4 }}>Content Depth</strong>
                      <span style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
                        Whether your pages have enough detail for AI tools to confidently recommend you.
                      </span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      <strong style={{ display: "block", marginBottom: 4 }}>Technical</strong>
                      <span style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
                        How easily AI systems can find and index your pages.
                      </span>
                    </div>
                  </div>
                  {report.scope && (
                    <div
                      style={{
                        marginTop: 16,
                        borderTop: "1px solid rgba(0,0,0,.08)",
                        paddingTop: 12,
                        fontSize: 13,
                        color: "#444"
                      }}
                    >
                      <strong>Pages reviewed:</strong>{" "}
                      {Math.min(report.scope.scannedPages ?? 0, report.scope.maxPages ?? 40)}
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666" }}>
                        This number reflects the pages GPTO could find live on your site—if only 15 show up, those were the only public paths it could reach in this audit.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer-Facing GPTO Output Template */}
              {report.executiveSummary && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ 
                    borderTop: "1px solid rgba(0,0,0,.1)", 
                    paddingTop: 24, 
                    marginBottom: 12
                  }}>
                    <h2 style={{ marginTop: 0, marginBottom: 6 }}>Strategic AI Readiness Assessment</h2>
                    <p className="muted" style={{ marginTop: 0, fontSize: 15, lineHeight: 1.6 }}>
                      A comprehensive evaluation of your brand's visibility in AI-driven search and discovery channels. 
                      This assessment provides clear insights, actionable recommendations, and a roadmap for improving how AI systems understand, find, and recommend your business.
                    </p>
                  </div>

                  {/* 1. Executive Summary */}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>Key Findings at a Glance</h3>
                    <p style={{ lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                      {report.executiveSummary}
                    </p>
                  </div>

                  {/* 2. Customer Snapshot */}
                  {report.businessInfo && (
                    <div className="card" style={{ marginBottom: 20 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>About Your Business</h3>
                      <table className="business-info-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                            <td style={{ padding: "10px 12px 10px 0", fontWeight: 700, width: "40%" }}>Business Name</td>
                            <td style={{ padding: "10px 0" }}>{report.businessInfo.businessName || <span className="muted">Not detected</span>}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "10px 12px 10px 0", fontWeight: 700 }}>Website</td>
                            <td style={{ padding: "10px 0" }}>
                              <a href={report.businessInfo.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-red)", textDecoration: "none", wordBreak: "break-all" }}>
                                {report.businessInfo.website}
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3. Plain-English Performance Summary Table */}
                  <PerformanceSummaryTable report={report} />

                  {/* 4. Core GPTO Audit (4 Dimensions) */}
                  <div style={{ marginTop: 20 }}>
                    <h3 style={{ marginBottom: 12, color: "var(--brand-red)" }}>Four Key Areas We Analyzed</h3>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
                      We looked at four important areas that determine how well AI tools and AI systems can find, understand, and recommend your business.
                    </p>
                    <div
                      ref={sliderRef}
                      className="auditSlider"
                      onScroll={onSliderScroll}
                      aria-label="GPTO Audit dimensions"
                    >
                      <div className="auditSlide" data-audit-slide="1">
                        {renderAuditDimension(
                          "How Well AI Systems Can Find You",
                          report.explanations?.perCategory?.technicalReadiness,
                          report.explanations?.perCategory?.structure,
                          report.grades,
                          report.tier,
                          report.url
                        )}
                      </div>
                      <div className="auditSlide" data-audit-slide="1">
                        {renderAuditDimension(
                          "How Well AI Tools Understand Your Business",
                          report.explanations?.perCategory?.aiReadiness || report.explanations?.perCategory?.aiClarity,
                          null,
                          report.grades,
                          report.tier,
                          report.url
                        )}
                      </div>
                      <div className="auditSlide" data-audit-slide="1">
                        {renderAuditDimension(
                          "How Clear Your Website Is to Visitors",
                          report.explanations?.perCategory?.contentDepth,
                          report.explanations?.perCategory?.structure,
                          report.grades,
                          report.tier,
                          report.url
                        )}
                      </div>
                      <div className="auditSlide" data-audit-slide="1">
                        {renderAuditDimension(
                          "How Strongly Your Brand Comes Through",
                          report.explanations?.perCategory?.aiReadiness || report.explanations?.perCategory?.aiClarity,
                          null,
                          report.grades,
                          report.tier,
                          report.url
                        )}
                      </div>
                    </div>
                    <div className="auditDots" aria-label="Audit dimension navigation">
                      {[0, 1, 2, 3].map((i) => (
                        <button
                          key={i}
                          type="button"
                          className={`auditDotBtn ${i === activeSlide ? "auditDotActive" : ""}`}
                          onClick={() => scrollToSlide(i)}
                          aria-label={`Go to dimension ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 5. Package Capability Tables */}
                  <PackageCapabilityTable report={report} />

                  {/* 6. Growth Progression Tables */}
                  <GrowthProgressionTable />

                  {/* 7. Strategic Positioning */}
                  <div className="card" style={{ marginTop: 20 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>Which Package Fits Your Needs</h3>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>
                      <strong>Bronze</strong> establishes clarity and control.{" "}
                      <strong>Silver</strong> improves efficiency when ready.{" "}
                      <strong>Gold</strong> is a long-term option for category leadership — not a requirement.
                    </p>
                  </div>

                  {/* 8. 90-Day First Wins Roadmap */}
                  <RoadmapTimeline />

                  {/* 9. Evidence Appendix (Optional) */}
                  <EvidenceAppendix report={report} />

                  {/* 10. Final Close */}
                  <FinalClose report={report} />
                </div>
              )}
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

// Performance Summary Table Component
function PerformanceSummaryTable({ report }: { report: any }) {
  const [selectedTier, setSelectedTier] = useState<"Bronze" | "Silver" | "Gold">("Bronze");
  const g = report?.grades || {};
  const s = report?.scores || {};

  // Smarter grade calculation helper
  const calculateCompositeGrade = (grades: string[], scores: number[], weights: number[] = []) => {
    const gradeOrder = ["F", "D", "C", "B-", "B", "B+", "A-", "A", "A+"];
    const gradeValues: Record<string, number> = {
      "F": 0, "D": 1, "C": 2, "B-": 2.5, "B": 3, "B+": 3.5, "A-": 4, "A": 4.5, "A+": 5
    };
    
    // Use scores if available for more precision
    if (scores.length > 0 && scores.every(sc => typeof sc === "number")) {
      const avgScore = scores.reduce((a, b, i) => a + (b * (weights[i] || 1)), 0) / 
                      scores.reduce((a, _, i) => a + (weights[i] || 1), 0);
      if (avgScore >= 90) return "A";
      if (avgScore >= 80) return "B";
      if (avgScore >= 70) return "C";
      if (avgScore >= 60) return "D";
      return "F";
    }
    
    // Fall back to grade averaging
    const validGrades = grades.filter(gr => gradeOrder.includes(gr));
    if (validGrades.length === 0) return "C";
    
    const avgValue = validGrades.reduce((sum, gr) => sum + (gradeValues[gr] || 2), 0) / validGrades.length;
    if (avgValue >= 4.5) return "A";
    if (avgValue >= 3.5) return "B+";
    if (avgValue >= 3) return "B";
    if (avgValue >= 2.5) return "B-";
    if (avgValue >= 2) return "C";
    if (avgValue >= 1) return "D";
    return "F";
  };

  // Expected outcomes by package (matching GrowthProgressionTable)
  const expectedOutcomes: Record<"Bronze" | "Silver" | "Gold", string> = {
    "Bronze": "B-",
    "Silver": "B+",
    "Gold": "A"
  };

  // Calculate "With Package" grades based on tier - use expected outcomes as target
  const getWithPackageGrade = (currentGrade: string, dimension: string, tier: "Bronze" | "Silver" | "Gold", currentScore?: number) => {
    const gradeOrder = ["F", "D", "C", "B-", "B", "B+", "A-", "A", "A+"];
    const targetGrade = expectedOutcomes[tier];
    const currentIdx = gradeOrder.indexOf(currentGrade);
    const targetIdx = gradeOrder.indexOf(targetGrade);
    
    if (currentIdx === -1 || targetIdx === -1) return currentGrade;

    // If current grade is already at or above target, return current or target (whichever is better)
    if (currentIdx >= targetIdx) {
      return currentGrade; // Already at or above target
    }

    // Otherwise, return the target grade for that tier
    return targetGrade;
  };

  // Map dimensions with smarter calculations
  const seoCurrent = calculateCompositeGrade(
    [g.structure || "C", g.technicalReadiness || "C"],
    [s.structure || 0, s.technicalReadiness || 0],
    [0.5, 0.5]
  );
  const aiCurrent = g.aiReadiness || "C";
  const conversionCurrent = calculateCompositeGrade(
    [g.contentDepth || "C", g.structure || "C"],
    [s.contentDepth || 0, s.structure || 0],
    [0.6, 0.4]
  );
  const brandCurrent = g.overall || g.aiReadiness || calculateCompositeGrade(
    [g.aiReadiness || "C", g.contentDepth || "C"],
    [s.aiReadiness || 0, s.contentDepth || 0],
    [0.7, 0.3]
  );

  // Tier-specific detailed descriptions
  const getMeaning = (dimension: string, current: string, withPackage: string, tier: "Bronze" | "Silver" | "Gold") => {
    const tierDetails: Record<"Bronze" | "Silver" | "Gold", Record<string, Record<string, string>>> = {
      "Bronze": {
        "SEO Strength": {
          "D": "Essential schema markup on key pages helps AI systems understand your core services. Basic structure improvements make your site more discoverable.",
          "C": "Essential schema markup clarifies your services for AI systems. Refined messaging on top pages improves how you're found and understood.",
          "B": "Essential schema markup and refined messaging strengthen your AI visibility. Your site becomes clearer to AI systems searching for what you offer.",
          "A": "Essential schema markup fine-tunes your already strong foundation. Top-page messaging refinements optimize your AI discoverability."
        },
        "AI Discoverability": {
          "D": "Refined top-page messaging helps AI tools like ChatGPT explain your business. Essential schema markup provides clear signals about what you do.",
          "C": "Refined messaging ensures AI tools consistently understand your business. Essential schema markup helps them recommend you accurately.",
          "B": "Refined messaging and essential schema markup help AI tools explain your business more accurately. They'll recommend you more confidently.",
          "A": "Refined messaging and essential schema markup ensure AI tools always get your business right. Your visibility across AI platforms improves."
        },
        "Conversion Clarity": {
          "D": "Refined top-page messaging clarifies who you help and how. Visitors understand if you're right for them before they leave.",
          "C": "Refined messaging makes it clearer who you serve and what problems you solve. Visitors can better self-qualify.",
          "B": "Refined messaging enhances clarity so more qualified visitors take action. Your conversion flow becomes more effective.",
          "A": "Refined messaging optimizes your already clear site. Visitors arrive better-informed and more ready to engage."
        },
        "Brand Signal": {
          "D": "Refined messaging makes your unique value clear and consistent. Essential schema markup reinforces your brand signals.",
          "C": "Refined messaging ensures your brand message is consistent and strong. Essential schema markup helps AI systems recognize your brand.",
          "B": "Refined messaging strengthens your brand consistency. Essential schema markup ensures your brand is recognized across AI platforms.",
          "A": "Refined messaging and essential schema markup keep your strong brand consistent everywhere AI systems encounter you."
        }
      },
      "Silver": {
        "SEO Strength": {
          "D": "Full-site schema implementation (Organization, Service/Product, Local, FAQ) helps AI systems deeply understand your entire site structure and offerings.",
          "C": "Full-site schema implementation provides comprehensive signals to AI systems. Your entire site becomes more discoverable and understandable.",
          "B": "Full-site schema implementation strengthens your AI visibility across all pages. AI systems can better categorize and recommend your services.",
          "A": "Full-site schema implementation optimizes your strong foundation. Every page is perfectly structured for maximum AI discoverability."
        },
        "AI Discoverability": {
          "D": "Full-site schema implementation helps AI tools understand your complete business. Five-competitor analysis reveals how to improve your AI visibility.",
          "C": "Full-site schema implementation ensures AI tools understand your business comprehensively. Competitive insights guide improvements to your AI presence.",
          "B": "Full-site schema implementation helps AI tools explain your business more accurately. Competitive analysis shows how to stand out in AI recommendations.",
          "A": "Full-site schema implementation ensures AI tools always get your business right. Competitive insights help you maintain leadership in AI discovery."
        },
        "Conversion Clarity": {
          "D": "Full-site schema implementation and structured content improvements clarify your entire site. Visitors understand your value across all pages.",
          "C": "Full-site schema implementation makes your entire site clearer. Structured content improvements help visitors self-qualify more effectively.",
          "B": "Full-site schema implementation enhances clarity site-wide. Structured content improvements drive more qualified conversions.",
          "A": "Full-site schema implementation optimizes your already clear site. Structured content improvements maximize conversion potential."
        },
        "Brand Signal": {
          "D": "Full-site schema implementation reinforces your brand consistently across all pages. Competitive analysis reveals how to strengthen your brand signals.",
          "C": "Full-site schema implementation ensures your brand message is consistent everywhere. Competitive insights help you differentiate your brand.",
          "B": "Full-site schema implementation strengthens your brand consistency site-wide. Competitive analysis helps you maintain brand leadership.",
          "A": "Full-site schema implementation keeps your strong brand consistent everywhere. Competitive insights help you maintain brand dominance."
        }
      },
      "Gold": {
        "SEO Strength": {
          "D": "Dynamic schema adapts in real-time to search signals, ensuring AI systems always understand your latest offerings. Real-time optimization maximizes your visibility.",
          "C": "Dynamic schema and real-time optimization ensure AI systems always have the most current understanding of your business. Your visibility adapts to trends.",
          "B": "Dynamic schema and real-time optimization keep your AI visibility at peak performance. AI systems always have the latest information about your services.",
          "A": "Dynamic schema and real-time optimization maintain your leadership position. AI systems consistently recognize you as the top choice in your category."
        },
        "AI Discoverability": {
          "D": "Real-time optimization ensures AI tools always have current information about your business. 10-competitor mapping reveals how to dominate AI recommendations.",
          "C": "Real-time optimization keeps AI tools updated with your latest offerings. Advanced competitive intelligence guides your AI visibility strategy.",
          "B": "Real-time optimization ensures AI tools always recommend you accurately. Multi-market competitive analysis helps you lead in AI discovery.",
          "A": "Real-time optimization maintains your AI leadership. Advanced competitive intelligence ensures you stay ahead in AI tool recommendations."
        },
        "Conversion Clarity": {
          "D": "Real-time optimization adapts your site based on visitor behavior. AI-supported guidance improves how visitors understand and engage with your brand.",
          "C": "Real-time optimization enhances clarity based on actual visitor patterns. AI-supported improvements drive more qualified conversions.",
          "B": "Real-time optimization fine-tunes your site for maximum conversion. AI-supported insights optimize visitor experience continuously.",
          "A": "Real-time optimization maintains peak conversion performance. AI-supported insights ensure you stay ahead of visitor expectations."
        },
        "Brand Signal": {
          "D": "Real-time optimization ensures your brand signals adapt to market changes. 10-competitor mapping and AI-supported reputation building strengthen your brand authority.",
          "C": "Real-time optimization keeps your brand signals current and strong. Advanced competitive intelligence and reputation building maintain your brand leadership.",
          "B": "Real-time optimization ensures your brand stays ahead of competitors. Multi-market authority mapping and reputation building maintain your dominance.",
          "A": "Real-time optimization maintains your brand's elite position. Advanced competitive intelligence and reputation building ensure you stay the category leader."
        }
      }
    };
    
    const gradeKey = current === "F" || current === "D" ? "D" :
                    current === "C" || current === "B-" ? "C" :
                    current === "B" || current === "B+" ? "B" : "A";
    
    return tierDetails[tier]?.[dimension]?.[gradeKey] || tierDetails[tier]?.[dimension]?.["C"] || `${tier} package improves this dimension.`;
  };

  const dimensions = [
    {
      name: "AI System Visibility",
      current: seoCurrent,
      getWithPackage: (tier: "Bronze" | "Silver" | "Gold") => getWithPackageGrade(seoCurrent, "SEO Strength", tier, s.structure),
      getMeaning: (tier: "Bronze" | "Silver" | "Gold") => getMeaning("SEO Strength", seoCurrent, getWithPackageGrade(seoCurrent, "SEO Strength", tier, s.structure), tier)
    },
    {
      name: "AI Tool Understanding",
      current: aiCurrent,
      getWithPackage: (tier: "Bronze" | "Silver" | "Gold") => getWithPackageGrade(aiCurrent, "AI Discoverability", tier, s.aiReadiness),
      getMeaning: (tier: "Bronze" | "Silver" | "Gold") => getMeaning("AI Discoverability", aiCurrent, getWithPackageGrade(aiCurrent, "AI Discoverability", tier, s.aiReadiness), tier)
    },
    {
      name: "Website Clarity",
      current: conversionCurrent,
      getWithPackage: (tier: "Bronze" | "Silver" | "Gold") => getWithPackageGrade(conversionCurrent, "Conversion Clarity", tier, s.contentDepth),
      getMeaning: (tier: "Bronze" | "Silver" | "Gold") => getMeaning("Conversion Clarity", conversionCurrent, getWithPackageGrade(conversionCurrent, "Conversion Clarity", tier, s.contentDepth), tier)
    },
    {
      name: "Brand Recognition",
      current: brandCurrent,
      getWithPackage: (tier: "Bronze" | "Silver" | "Gold") => getWithPackageGrade(brandCurrent, "Brand Signal", tier, s.overall),
      getMeaning: (tier: "Bronze" | "Silver" | "Gold") => getMeaning("Brand Signal", brandCurrent, getWithPackageGrade(brandCurrent, "Brand Signal", tier, s.overall), tier)
    }
  ];

  const tiers: Array<"Bronze" | "Silver" | "Gold"> = ["Bronze", "Silver", "Gold"];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>Current vs. Potential Performance</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
        See how your site performs today and how much better it could be with each GPTO package. These scores show the direction of improvement, not exact promises.
      </p>
      
      {/* Tier selector */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tiers.map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: selectedTier === tier ? "2px solid var(--brand-red)" : "1px solid rgba(0,0,0,.15)",
              background: selectedTier === tier ? "rgba(194, 15, 44, 0.1)" : "white",
              color: selectedTier === tier ? "var(--brand-red)" : "#333",
              fontWeight: selectedTier === tier ? 700 : 600,
              cursor: "pointer",
              fontSize: 14,
              transition: "all 0.2s ease"
            }}
          >
            With {tier}
          </button>
        ))}
      </div>

      <div className="table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,.1)" }}>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>Performance Area</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>Current Status</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>With {selectedTier}</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 700 }}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dim, i) => {
              const withPackage = dim.getWithPackage(selectedTier);
              const meaning = dim.getMeaning(selectedTier);
              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                  <td style={{ padding: "12px", fontWeight: 600 }}>{dim.name}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>{dim.current}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>
                    {withPackage}
                    {dim.current !== withPackage && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: "#666" }}>→</span>
                    )}
                  </td>
                  <td style={{ padding: "12px", lineHeight: 1.5, color: "#333" }}>{meaning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Package Capability Table Component
function PackageCapabilityTable({ report }: { report: any }) {
  const capabilities = [
    { name: "Organize your website structure", bronze: true, silver: true, gold: true },
    { name: "Make your content readable by AI tools", bronze: true, silver: true, gold: true },
    { name: "Add helpful FAQs and guides", bronze: false, silver: true, gold: true },
    { name: "Expand and improve your content", bronze: false, silver: true, gold: true },
    { name: "Build your authority and expertise", bronze: false, silver: false, gold: true },
    { name: "Become the go-to leader in your space", bronze: false, silver: false, gold: true }
  ];

  const pricingHref = `/pricing?tier=${encodeURIComponent(report?.tier || "")}&url=${encodeURIComponent(report?.url || "")}`;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>What Each Package Includes</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
        Compare capabilities across our service tiers to find the right fit for your needs and goals.
      </p>
      <div className="table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,.15)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Service Capability</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Bronze</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Silver</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Gold</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((cap, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                <td style={{ padding: "10px 12px" }}>{cap.name}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>
                  {cap.bronze ? "✓" : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>
                  {cap.silver ? "✓" : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>
                  {cap.gold ? "✓" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <a
          className="btn"
          href={pricingHref}
          style={{ 
            display: "inline-block",
            fontSize: 16,
            padding: "14px 28px",
            fontWeight: 700,
            textDecoration: "none",
            width: "100%",
            maxWidth: "400px"
          }}
        >
          View Our Packages →
        </a>
      </div>
    </div>
  );
}

// Growth Progression Table Component
function GrowthProgressionTable() {
  const packages = [
    { package: "Bronze", outcome: "Signal clarity & noise reduction", grade: "B-" },
    { package: "Silver", outcome: "Discoverability & efficiency", grade: "B+" },
    { package: "Gold", outcome: "Authority & leadership", grade: "A" }
  ];

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>Expected Outcomes by Package</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
        Each package focuses on different improvements. These scores show what you can typically expect based on similar implementations.
      </p>
      <div className="table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,.15)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Package</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Primary Focus</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Expected Grade</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{pkg.package}</td>
                <td style={{ padding: "10px 12px" }}>{pkg.outcome}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{pkg.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Roadmap Timeline Component
function RoadmapTimeline() {
  const phases = [
    { weeks: "Weeks 1–2", focus: "Structural fixes & signal cleanup" },
    { weeks: "Weeks 3–6", focus: "AI readability & routing improvements" },
    { weeks: "Weeks 7–12", focus: "Refinement & optional expansion" }
  ];

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--brand-red)" }}>90-Day Implementation Timeline</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
        A simple timeline showing when you can expect to see improvements. We focus on the big picture, not detailed technical tasks.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {phases.map((phase, i) => (
          <div key={i} className="roadmap-item" style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: i < phases.length - 1 ? "1px solid rgba(0,0,0,.08)" : "none" }}>
            <div style={{ fontWeight: 700, minWidth: 100 }}>{phase.weeks}</div>
            <div>{phase.focus}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Evidence Appendix Component
function EvidenceAppendix({ report }: { report: any }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!report.pages || report.pages.length === 0) return null;

  const examplePages = report.pages
    .filter((p: any) => p.status > 0 && p.status < 400)
    .slice(0, 5)
    .map((p: any) => p.url);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 0, color: "var(--brand-red)" }}>Supporting Evidence</h3>
        <span style={{ fontSize: 20 }}>{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <strong>Example pages:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {examplePages.map((url: string, i: number) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {report.signals && (
            <div>
              <strong>What We Checked:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Pages with clear titles: {Math.round((report.signals.titleRate || 0) * 100)}%</li>
                <li>Pages with main headings: {Math.round((report.signals.h1Rate || 0) * 100)}%</li>
                <li>Pages with descriptions: {Math.round((report.signals.metaRate || 0) * 100)}%</li>
                <li>Pages with structured information: {Math.round((report.signals.jsonLdRate || 0) * 100)}%</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Final Close Component
function FinalClose({ report }: { report: any }) {
  const pricingHref = `/pricing?tier=${encodeURIComponent(report?.tier || "")}&url=${encodeURIComponent(report?.url || "")}`;
  const deliverables = getTierDeliverables(report?.tier);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";

  // Build Calendly URL with query parameters
  const buildCalendlyUrl = () => {
    if (!calendlyUrl) return "#";
    const url = new URL(calendlyUrl);
    if (report?.tier) url.searchParams.set("tier", String(report.tier));
    if (report?.url) url.searchParams.set("website", report.url);
    if (typeof window !== "undefined") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const returnUrl = report?.url ? `${siteUrl}/audit?url=${encodeURIComponent(report.url)}` : siteUrl;
      url.searchParams.set("redirect", returnUrl);
    }
    return url.toString();
  };
  
  return (
    <div 
      className="card" 
      style={{ 
        marginTop: 24,
        marginBottom: 20,
        border: "1px solid rgba(0,0,0,.1)"
      }}
    >
      <div style={{ 
        padding: "0 0 16px 0", 
        marginBottom: 20,
        borderBottom: "1px solid rgba(0,0,0,.1)"
      }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--brand-red)" }}>Ready to Improve Your AI Visibility?</h3>
      </div>
      
      <div style={{ lineHeight: 1.7, fontSize: 15 }}>
        <div style={{ 
          padding: "16px", 
          background: "rgba(0,0,0,.02)", 
          borderRadius: 6, 
          marginBottom: 16,
          border: "1px solid rgba(0,0,0,.06)"
        }}>
          <p style={{ margin: 0, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            Why This Matters Right Now
          </p>
          <p style={{ margin: 0, color: "#333", lineHeight: 1.6 }}>
            Over <strong>40% of search queries</strong> now happen through AI-powered tools like ChatGPT, Perplexity, and Google's AI Overview. 
            These systems are becoming the primary way people discover brands, compare options, and make decisions. 
            <strong> Without GPTO optimization, your site risks being overlooked, misunderstood, or incorrectly summarized</strong> by these critical discovery channels.
          </p>
        </div>

        <div style={{ 
          padding: "16px", 
          background: "rgba(0,0,0,.02)", 
          borderRadius: 6, 
          marginBottom: 16,
          border: "1px solid rgba(0,0,0,.06)"
        }}>
          <p style={{ margin: 0, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            What Success Looks Like
          </p>
          <p style={{ margin: 0, color: "#333", lineHeight: 1.6 }}>
            Your brand is <strong>correctly understood, easily found, and confidently recommended</strong> by AI tools. 
            Users arrive <strong>better-qualified and more informed</strong>, reducing wasted time and improving conversion rates. 
            Your core messages are <strong>consistently and accurately surfaced</strong> across all AI-driven discovery channels.
          </p>
        </div>

        {/* Combined Tier Deliverables */}
        {deliverables && (
          <div style={{ 
            padding: "20px", 
            background: "rgba(0,0,0,.02)", 
            borderRadius: 6, 
            marginBottom: 16,
            border: "1px solid rgba(0,0,0,.08)"
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>
                Your Recommended Starting Point: <span style={{ color: "var(--brand-red)" }}>{deliverables.tier}</span>
              </p>
              <div className="xlarge-text" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
                {deliverables.price}{" "}
                <span style={{ fontSize: 18, fontWeight: 800 }}>/ mo</span>
              </div>
              <p style={{ margin: 0, color: "#333", fontSize: 14 }}>
                {deliverables.subtitle}
              </p>
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,.1)", margin: "16px 0" }} />

            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 10 }}>
                What's Included:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
                {deliverables.deliverables.map((deliverable, index) => (
                  <li key={index} style={{ lineHeight: 1.6, color: "#333", fontSize: 14 }}>
                    {deliverable}
                  </li>
                ))}
              </ul>
            </div>

            <div className="final-close-buttons" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                className="btn"
                href={pricingHref}
                style={{ 
                  display: "inline-block",
                  fontSize: 16,
                  padding: "14px 28px",
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                View {deliverables.tier} Package Details →
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
                    textDecoration: "none"
                  }}
                >
                  Connect with Us
                </a>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: "12px 0", borderTop: "1px solid rgba(0,0,0,.1)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#666", textAlign: "center" }}>
            <strong>No pressure, no commitment.</strong> Review the assessment above, explore our packages, and choose what fits your timeline and goals.
          </p>
        </div>
      </div>
    </div>
  );
}

// New renderAuditDimension function matching template format
function renderAuditDimension(
  title: string,
  primaryBlock: any,
  secondaryBlock: any | null,
  grades: any,
  tier: string,
  websiteUrl: string
) {
  // Smarter grade calculation using composite logic
  const calculateCompositeGrade = (grade1: string, grade2?: string) => {
    const gradeOrder = ["F", "D", "C", "B-", "B", "B+", "A-", "A", "A+"];
    const gradeValues: Record<string, number> = {
      "F": 0, "D": 1, "C": 2, "B-": 2.5, "B": 3, "B+": 3.5, "A-": 4, "A": 4.5, "A+": 5
    };
    
    const val1 = gradeValues[grade1] || 2;
    if (!grade2) return grade1;
    const val2 = gradeValues[grade2] || 2;
    const avg = (val1 + val2) / 2;
    
    if (avg >= 4.5) return "A";
    if (avg >= 3.5) return "B+";
    if (avg >= 3) return "B";
    if (avg >= 2.5) return "B-";
    if (avg >= 2) return "C";
    if (avg >= 1) return "D";
    return "F";
  };

  // Determine current grade based on dimension (smarter)
  let currentGrade = "C";
  if (title.includes("AI Systems Can Find")) {
    const techGrade = grades?.technicalReadiness || "C";
    const structGrade = grades?.structure || "C";
    currentGrade = calculateCompositeGrade(techGrade, structGrade);
  } else if (title.includes("AI Tools Understand")) {
    currentGrade = grades?.aiReadiness || "C";
  } else if (title.includes("Clear Your Website")) {
    const contentGrade = grades?.contentDepth || "C";
    const structGrade = grades?.structure || "C";
    currentGrade = calculateCompositeGrade(contentGrade, structGrade);
  } else if (title.includes("Brand Comes Through")) {
    currentGrade = grades?.overall || grades?.aiReadiness || "B-";
  }

  // Combine strengths and gaps from blocks (smarter filtering)
  const allStrengths = [
    ...(primaryBlock?.strengths || []),
    ...(secondaryBlock?.strengths || [])
  ];
  
  const allGaps = [
    ...(primaryBlock?.gaps || []),
    ...(secondaryBlock?.gaps || [])
  ];

  // Prioritize more specific/actionable items
  const strengths = allStrengths
    .filter(s => s && s.length > 10) // Filter out very short/weak items
    .slice(0, 4);
  
  const gaps = allGaps
    .filter(g => g && g.length > 10)
    .slice(0, 4);

  // What we can see vs what we can't see (simplified language)
  const observed = strengths.length > 0 
    ? strengths.map(s => s.replace(/scanned pages/g, "pages we reviewed").replace(/scan depth/g, "review"))
    : currentGrade === "A" || currentGrade === "B+" || currentGrade === "B"
      ? ["Your website has a strong foundation."]
      : ["We found some areas that need attention."];
      
  const inferred = gaps.length > 0 
    ? gaps.map(g => g.replace(/scanned pages/g, "pages we reviewed").replace(/scan depth/g, "review"))
    : currentGrade === "A" || currentGrade === "B+"
      ? ["No major issues found — there are opportunities to make things even better."]
      : currentGrade === "B" || currentGrade === "C"
        ? ["There may be some areas we couldn't fully review — GPTO will help address both what we see and what might be hidden."]
        : ["There are likely several areas that need improvement — GPTO will help fix both visible issues and underlying problems."];

  // What GPTO Changes (simplified, plain English)
  const gptoChanges: string[] = [];
  const isLowGrade = currentGrade === "D" || currentGrade === "F" || currentGrade === "C";
  const isHighGrade = currentGrade === "A" || currentGrade === "A+" || currentGrade === "B+";
  
  if (title.includes("AI Systems Can Find")) {
    if (isLowGrade) {
      gptoChanges.push("GPTO makes sure AI systems can easily find and understand all your pages.");
      gptoChanges.push("We'll organize your website information in a way that AI systems love, so they can properly list and recommend your site.");
    } else {
      gptoChanges.push("GPTO makes your website even easier for AI systems to find and understand.");
      gptoChanges.push("We'll improve how your website information is organized so AI systems can better list and recommend your site.");
    }
  } else if (title.includes("AI Tools Understand")) {
    if (isLowGrade) {
      gptoChanges.push("GPTO rewrites your website content so AI tools like ChatGPT can clearly understand what you do, who you serve, and how you help.");
      gptoChanges.push("We'll use consistent, clear language throughout your site so AI tools can confidently recommend your business.");
    } else {
      gptoChanges.push("GPTO improves how AI tools understand and describe your business.");
      gptoChanges.push("We'll refine your website language so AI tools can more accurately recommend your business to people searching for what you offer.");
    }
  } else if (title.includes("Clear Your Website")) {
    if (isLowGrade) {
      gptoChanges.push("GPTO adds clear, helpful information so visitors immediately understand what you offer and whether it's right for them.");
      gptoChanges.push("Visitors will arrive better-informed, which means fewer people leave confused and more people take the actions you want.");
    } else {
      gptoChanges.push("GPTO makes your website even clearer and more helpful for visitors.");
      gptoChanges.push("Visitors will arrive better-informed, leading to more qualified leads and better results.");
    }
  } else if (title.includes("Brand Comes Through")) {
    if (isLowGrade) {
      gptoChanges.push("GPTO ensures your brand message comes through consistently everywhere people might find you.");
      gptoChanges.push("Your unique value and what makes you different will be clearly communicated, so people understand why to choose you.");
    } else {
      gptoChanges.push("GPTO makes sure your brand message is consistently and clearly communicated everywhere.");
      gptoChanges.push("Your unique value will be even more clearly communicated, helping people understand why to choose you.");
    }
  }

  // Expected Directional Outcome (smarter projection)
  const gradeOrder = ["F", "D", "C", "B-", "B", "B+", "A-", "A", "A+"];
  const currentIdx = gradeOrder.indexOf(currentGrade);
  const improvement = isLowGrade ? 2 : isHighGrade ? 0 : 1;
  const projectedIdx = Math.min(gradeOrder.length - 1, currentIdx + improvement);
  const projectedGrade = gradeOrder[projectedIdx];
  
  const expectedOutcome = currentGrade === projectedGrade
    ? `With GPTO, ${title.toLowerCase()} maintains excellence while optimizing for maximum impact and consistency.`
    : `With GPTO, ${title.toLowerCase()} improves from ${currentGrade} to ${projectedGrade} through structural improvements that enhance machine readability, consistency, and clarity.`;

  const pricingHref = `/pricing?tier=${encodeURIComponent(tier || "")}&url=${encodeURIComponent(websiteUrl || "")}`;

  return (
    <section className="card" style={{ height: "100%" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <div style={{ marginBottom: 20 }}>
        <strong style={{ display: "block", marginBottom: 8 }}>Your Current Score</strong>
        <div style={{ 
          display: "inline-flex", 
          alignItems: "baseline", 
          gap: 8,
          padding: "8px 16px",
          borderRadius: 6,
          background: "rgba(0,0,0,.03)",
          border: "1px solid rgba(0,0,0,.08)"
        }}>
          <div className="large-text scorecard-grade" style={{ fontSize: 28, fontWeight: 900 }}>{currentGrade}</div>
          <div style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
            {currentGrade === "A" || currentGrade === "A+" ? "Excellent" : 
             currentGrade === "B" || currentGrade === "B+" ? "Good" :
             currentGrade === "C" ? "Needs Improvement" : "Needs Significant Improvement"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong style={{ display: "block", marginBottom: 8 }}>What We Found</strong>
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>What's working well:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {observed.map((s: string, i: number) => (
              <li key={i} style={{ fontSize: 14 }}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: 14 }}>Areas for improvement:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {inferred.map((s: string, i: number) => (
              <li key={i} style={{ fontSize: 14 }}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong style={{ display: "block", marginBottom: 8 }}>How GPTO Will Help</strong>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          {gptoChanges.join(" ")}
        </p>
      </div>

      <div style={{ marginBottom: 0 }}>
        <strong style={{ display: "block", marginBottom: 8 }}>Expected Improvement</strong>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          {expectedOutcome.replace(/machine readability/g, "how easily systems can understand your site").replace(/structural improvements/g, "improvements to how your site is organized")}
        </p>
      </div>
    </section>
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
