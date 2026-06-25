"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ModuleOutput,
  ProposalOutput,
  PublicAppraisal,
  StrategyOutput,
  UnifiedOutput,
} from "@/lib/appraisal/types";

function ratingColor(rating: string) {
  if (rating === "Strong") return "#18794e";
  if (rating === "Adequate") return "#8a5a00";
  return "#b42318";
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="muted" style={{ margin: 0 }}>None identified.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 7 }}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}

function ModuleSection({ output }: { output: ModuleOutput }) {
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <h2 style={{ margin: 0 }}>{output.title}</h2>
        <span style={{
          color: ratingColor(output.rating),
          border: `1px solid ${ratingColor(output.rating)}`,
          borderRadius: 999,
          padding: "5px 10px",
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}>
          {output.rating}
        </span>
      </div>
      <p style={{ lineHeight: 1.7 }}>{output.summary}</p>

      <div className="grid cols-2" style={{ gap: 18, alignItems: "start" }}>
        <div>
          <h3>Observed findings</h3>
          {output.observedFindings.length ? output.observedFindings.map((finding, index) => (
            <div key={index} style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 5px" }}>{finding.summary}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {finding.evidenceUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    Evidence
                  </a>
                ))}
              </div>
            </div>
          )) : <p className="muted">No supported observations were returned.</p>}
        </div>
        <div>
          <h3>Inferred findings</h3>
          {output.inferredFindings.length ? output.inferredFindings.map((finding, index) => (
            <div key={index} style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 5px" }}>{finding.summary}</p>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Confidence: {finding.confidence}. Basis: {finding.basis}
              </p>
            </div>
          )) : <p className="muted">No material inferences were required.</p>}
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 18, marginTop: 12 }}>
        <div><h3>Priorities</h3><List items={output.priorities} /></div>
        <div><h3>Unknowns</h3><List items={output.unknowns} /></div>
      </div>
      {output.blockers.length > 0 && <div><h3>Blockers</h3><List items={output.blockers} /></div>}
    </div>
  );
}

function UnifiedSection({ output }: { output: UnifiedOutput }) {
  return (
    <div className="card" style={{ marginTop: 18, border: "2px solid rgba(194,15,44,.18)" }}>
      <h2 style={{ marginTop: 0 }}>{output.title}</h2>
      <p style={{ lineHeight: 1.7 }}>{output.executiveSummary}</p>
      <div className="grid cols-2" style={{ gap: 18 }}>
        <div>
          <h3>Cross-layer dependencies</h3>
          <List items={output.crossLayerDependencies.map((item) => `${item.critical ? "Critical: " : ""}${item.summary}`)} />
        </div>
        <div><h3>Unified priorities</h3><List items={output.priorities} /></div>
        <div><h3>Blockers</h3><List items={output.blockers} /></div>
        <div><h3>Unresolved unknowns</h3><List items={output.unknowns} /></div>
      </div>
    </div>
  );
}

function StrategySection({ output }: { output: StrategyOutput }) {
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>{output.title}</h2>
      <p style={{ lineHeight: 1.7 }}>{output.strategicThesis}</p>
      <h3>Objectives</h3>
      <List items={output.objectives} />
      <h3>Coordinated workstreams</h3>
      <div style={{ display: "grid", gap: 14 }}>
        {output.workstreams.map((workstream) => (
          <div key={workstream.name} style={{ border: "1px solid rgba(0,0,0,.1)", borderRadius: 8, padding: 14 }}>
            <strong>{workstream.name}</strong>
            <p>{workstream.rationale}</p>
            <List items={workstream.actions} />
          </div>
        ))}
      </div>
      <h3>First 90 days</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {output.first90Days.map((phase) => (
          <div key={phase.phase}>
            <strong>{phase.phase}</strong>
            <p style={{ margin: "5px 0" }}>{phase.focus}</p>
            <List items={phase.deliverables} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProposalSection({ output }: { output: ProposalOutput }) {
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>{output.title}</h2>
      <h3>Executive summary</h3>
      <p style={{ lineHeight: 1.7 }}>{output.executiveSummary}</p>
      <h3>Current state</h3>
      <p style={{ lineHeight: 1.7 }}>{output.currentState}</p>
      <h3>Recommended approach</h3>
      <p style={{ lineHeight: 1.7 }}>{output.recommendedApproach}</p>
      <h3>Scope</h3>
      <List items={output.scope} />
      <h3>Expected direction</h3>
      <List items={output.expectedDirection} />
      <div style={{ marginTop: 18, padding: 14, background: "#fff8f8", border: "1px solid rgba(194,15,44,.2)", borderRadius: 8 }}>
        <strong>Important clarification</strong>
        <p style={{ marginBottom: 0 }}>{output.importantClarification}</p>
      </div>
      <h3>Next step</h3>
      <p>{output.nextStep}</p>
    </div>
  );
}

export default function AppraisalReportClient({
  token,
  initial,
}: {
  token: string;
  initial: PublicAppraisal;
}) {
  const [appraisal, setAppraisal] = useState(initial);

  useEffect(() => {
    if (initial.status === "completed" || initial.status === "failed") return;
    const source = new EventSource(`/api/appraisals/${encodeURIComponent(token)}/events`);
    source.onmessage = (event) => {
      try {
        setAppraisal(JSON.parse(event.data));
      } catch {}
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [initial.status, token]);

  const completedCount = appraisal.stages.filter((stage) => stage.status === "completed").length;
  const progress = Math.round((completedCount / appraisal.stages.length) * 100);
  const modules = useMemo(
    () => appraisal.stages.filter((stage) => stage.order <= 5 && stage.output),
    [appraisal.stages]
  );

  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="badge">Private GPTO Appraisal</span>
          <h1>Eight-Stage <span style={{ color: "var(--brand-red)" }}>GPTO Appraisal</span></h1>
          <p>{appraisal.websiteUrl}</p>
          <div style={{ maxWidth: 700, marginTop: 18 }}>
            <div style={{ height: 12, background: "rgba(0,0,0,.1)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--brand-red)", transition: "width .3s" }} />
            </div>
            <p style={{ fontSize: 13 }}>{completedCount} of {appraisal.stages.length} stages complete</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Stage progress</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {appraisal.stages.map((stage) => (
                <div key={stage.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(0,0,0,.07)", paddingBottom: 9 }}>
                  <span>{stage.order}. {stage.title}</span>
                  <strong>{stage.status}</strong>
                </div>
              ))}
            </div>
            {appraisal.status === "failed" && (
              <p style={{ color: "var(--brand-red)", marginBottom: 0 }}>
                The workflow stopped: {appraisal.error || "An appraisal stage failed."}
              </p>
            )}
          </div>

          {modules.map((stage) => (
            <ModuleSection key={stage.key} output={stage.output as ModuleOutput} />
          ))}

          {appraisal.stages.find((stage) => stage.key === "unified")?.output && (
            <UnifiedSection output={appraisal.stages.find((stage) => stage.key === "unified")!.output as UnifiedOutput} />
          )}

          {appraisal.packageRationale && (
            <div className="card" style={{ marginTop: 18 }}>
              <h2 style={{ marginTop: 0 }}>Recommended Package: {appraisal.packageRationale.tier}</h2>
              <div className="grid cols-2" style={{ gap: 18 }}>
                <div><h3>Why this tier</h3><List items={appraisal.packageRationale.whyThisTier} /></div>
                <div><h3>Why not lower</h3><List items={appraisal.packageRationale.whyNotLower} /></div>
                <div><h3>Why not higher</h3><List items={appraisal.packageRationale.whyNotHigher} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <a className="btn" href={`/pricing?tier=${encodeURIComponent(appraisal.packageRationale.tier)}&url=${encodeURIComponent(appraisal.websiteUrl)}`}>
                  View {appraisal.packageRationale.tier}
                </a>
                <a className="btn alt" href={`/api/appraisals/${encodeURIComponent(token)}/pdf`}>
                  Download Full Appraisal PDF
                </a>
              </div>
            </div>
          )}

          {appraisal.stages.find((stage) => stage.key === "strategy")?.output && (
            <StrategySection output={appraisal.stages.find((stage) => stage.key === "strategy")!.output as StrategyOutput} />
          )}

          {appraisal.stages.find((stage) => stage.key === "proposal")?.output && (
            <ProposalSection output={appraisal.stages.find((stage) => stage.key === "proposal")!.output as ProposalOutput} />
          )}

          <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
            This private report link expires on {new Date(appraisal.expiresAt).toLocaleDateString()}.
          </p>
        </div>
      </section>
    </div>
  );
}
