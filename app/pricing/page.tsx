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
            Plans & <span style={{ color: "var(--brand-red)" }}>Pricing</span>
          </h1>

          <p className="muted" style={{ maxWidth: "100%" }}>
            {highlightTier
              ? `Based on your audit, we recommend the ${highlightTier} tier. Review the package below and click Get Started to contact our team.`
              : "Browse our tiers below. Run the audit to receive a tailored recommendation."}
          </p>

          {!highlightTier && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <a className="btn" href="/audit" style={{ minWidth: "min(100%, 200px)" }}>
                Run the Audit
              </a>
              <a className="btn alt" href="/contact" style={{ minWidth: "min(100%, 200px)" }}>
                Contact Our Team
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--brand-gray-200)" }}>
        <div className="container">
          {/* Recommended badge ONLY appears when arriving from audit via ?tier= */}
          <PricingCards allowHighlight={true} website={website} />
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
