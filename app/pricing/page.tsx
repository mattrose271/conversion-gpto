import PricingCards from "./PricingCards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTier(t: string | undefined) {
  const v = (t || "").trim().toLowerCase();
  if (v === "bronze") return "Bronze" as const;
  if (v === "silver") return "Silver" as const;
  if (v === "gold") return "Gold" as const;
  return undefined;
}

export default function PricingPage({
  searchParams
}: {
  searchParams?: { tier?: string; url?: string };
}) {
  const highlightTier = normalizeTier(searchParams?.tier);
  const website = (searchParams?.url || "").toString();

  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="badge">Conversion Interactive Agency</span>
          <h1>
            Tier <span style={{ color: "var(--brand-red)" }}>Deliverables</span>
          </h1>
          <p className="muted" style={{ maxWidth: 820 }}>
            {highlightTier
              ? `Based on your audit, we recommend the ${highlightTier} tier. Review deliverables below and get started.`
              : "Browse our tiers below. Run the audit to receive a tailored recommendation."}
          </p>

          {!highlightTier && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <a className="btn" href="/audit">Run the Audit</a>
              <a className="btn alt" href="/contact">Contact Our Team</a>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--brand-gray-200)" }}>
        <div className="container">
          {/* Recommended badge ONLY appears if highlightTier exists (i.e., from audit) */}
          <PricingCards highlightTier={highlightTier} website={website} />

          {/* Deliverables anchors for your #gold-deliverables links */}
          <div style={{ marginTop: 28 }} />

          <div id="bronze-deliverables" className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Bronze Deliverables</h2>
            <p className="muted">Foundation package deliverables.</p>
            <a className="btn" href={`/contact?tier=Bronze&url=${encodeURIComponent(website || "")}`}>
              Get Started
            </a>
          </div>

          <div id="silver-deliverables" className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Silver Deliverables</h2>
            <p className="muted">Growth package deliverables.</p>
            <a className="btn" href={`/contact?tier=Silver&url=${encodeURIComponent(website || "")}`}>
              Get Started
            </a>
          </div>

          <div id="gold-deliverables" className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Gold Deliverables</h2>
            <p className="muted">Elite package deliverables.</p>
            <a className="btn" href={`/contact?tier=Gold&url=${encodeURIComponent(website || "")}`}>
              Get Started
            </a>
          </div>
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
