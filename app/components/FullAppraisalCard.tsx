"use client";

import { useState } from "react";

type Props = {
  auditId: string | null;
  websiteUrl: string;
  initialEmail?: string;
  focusArea?: string | null;
  competitors?: string[];
};

export function FullAppraisalCard({
  auditId,
  websiteUrl,
  initialEmail = "",
  focusArea = null,
  competitors = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [primaryOffer, setPrimaryOffer] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [marketGeography, setMarketGeography] = useState("");
  const [commercialGoal, setCommercialGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!auditId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email,
          brief: {
            primaryOffer,
            targetAudience,
            marketGeography,
            commercialGoal,
            focusArea,
            competitors,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to start the full appraisal.");
      window.location.assign(data.reportUrl);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to start the full appraisal."
      );
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24, border: "2px solid rgba(194,15,44,.22)" }}>
      <p style={{ margin: "0 0 6px", color: "var(--brand-red)", fontWeight: 800 }}>
        Next step
      </p>
      <h2 style={{ margin: "0 0 10px" }}>Generate Your Full GPTO Appraisal</h2>
      <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
        The scorecard above is preliminary. The full appraisal runs eight persisted stages covering
        intent, technical readiness, AI/search clarity, conversion architecture, authority, unified
        strategy, and a written proposal.
      </p>

      {!expanded ? (
        <button
          className="btn"
          type="button"
          disabled={!auditId}
          onClick={() => setExpanded(true)}
        >
          Generate Full Appraisal
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Primary offer</span>
            <textarea
              required
              value={primaryOffer}
              onChange={(event) => setPrimaryOffer(event.target.value)}
              placeholder="What is the main service, product, or outcome you sell?"
              rows={3}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Target audience</span>
            <textarea
              required
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="Who is the primary buyer or user?"
              rows={3}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Market or geography</span>
            <input
              required
              value={marketGeography}
              onChange={(event) => setMarketGeography(event.target.value)}
              placeholder="Example: United States, regional, or global"
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Main commercial goal</span>
            <textarea
              required
              value={commercialGoal}
              onChange={(event) => setCommercialGoal(event.target.value)}
              placeholder="What should the website help the business accomplish?"
              rows={3}
              style={{ width: "100%" }}
            />
          </label>
          {error && <p style={{ margin: 0, color: "var(--brand-red)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="submit" disabled={loading || !auditId}>
              {loading ? "Starting appraisal…" : "Start Eight-Stage Appraisal"}
            </button>
            <button className="btn alt" type="button" onClick={() => setExpanded(false)} disabled={loading}>
              Cancel
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            A private 90-day report link will be emailed to you. One request per email and domain is
            allowed every 24 hours.
          </p>
        </form>
      )}

      {!auditId && (
        <p style={{ color: "var(--brand-red)", marginBottom: 0 }}>
          The audit could not be persisted. Run it again before requesting the full appraisal.
        </p>
      )}
    </div>
  );
}
