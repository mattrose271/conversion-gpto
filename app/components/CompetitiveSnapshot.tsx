"use client";

import type { StructuralSignals } from "@/lib/types/audit";

interface CompetitiveSnapshotProps {
  primarySignals: StructuralSignals | null;
  competitorSignals: Array<{ signals: StructuralSignals; url?: string }>;
}

function formatAuthority(s: StructuralSignals["authoritySignals"]): string {
  const parts: string[] = [];
  if (s.testimonials) parts.push("Testimonials");
  if (s.caseStudies) parts.push("Case studies");
  if (s.press) parts.push("Press");
  if (s.certifications) parts.push("Certifications");
  return parts.length ? parts.join(", ") : "—";
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function CompetitiveSnapshot({ primarySignals, competitorSignals }: CompetitiveSnapshotProps) {
  if (!competitorSignals?.length) return null;

  const allRows = [
    { label: "Your site", signals: primarySignals },
    ...competitorSignals.map((c) => ({
      label: c.url ? hostLabel(c.url) : "Competitor",
      signals: c.signals,
    })),
  ].filter((r) => r.signals);

  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        marginBottom: 20,
        border: "1px solid rgba(0,0,0,.1)",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "var(--brand-red)" }}>
        Competitive Signal Snapshot
      </h3>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
        Observable structural patterns across your site and selected competitors. Qualitative only.
      </p>

      <div className="table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 500,
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,.1)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Site</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                Service Definition
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                Schema Coverage
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                FAQ Coverage
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                Authority Signals
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                Messaging Consistency
              </th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "10px 12px" }}>{row.signals?.serviceSegmentation || "—"}</td>
                <td style={{ padding: "10px 12px" }}>{row.signals?.schemaCoverage || "—"}</td>
                <td style={{ padding: "10px 12px" }}>{row.signals?.faqCoverage || "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {row.signals?.authoritySignals
                    ? formatAuthority(row.signals.authoritySignals)
                    : "—"}
                </td>
                <td style={{ padding: "10px 12px" }}>{row.signals?.messagingClarity || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#666",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        This comparison reflects observable structural signal patterns only and does not assess
        ranking position, traffic levels, or business performance.
      </p>
    </div>
  );
}
