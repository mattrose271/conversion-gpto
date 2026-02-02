"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PricingCards from "./PricingCards";
import EmailModal from "../components/EmailModal";

function normalizeTier(t: string | undefined) {
  const v = (t || "").trim().toLowerCase();
  if (v === "bronze") return "Bronze" as const;
  if (v === "silver") return "Silver" as const;
  if (v === "gold") return "Gold" as const;
  return undefined;
}

function PricingPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightTier = normalizeTier(searchParams?.get("tier") || undefined);
  const website = (searchParams?.get("url") || "").toString();

  function handleAuditClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setIsModalOpen(true);
  }

  function handleModalSuccess() {
    setIsModalOpen(false);
    router.push("/audit");
  }

  return (
    <div>
      <EmailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <section className="hero">
        <div className="container">
          <a href="/audit" className="badge" onClick={handleAuditClick}>Run the Free Audit</a>
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
              <a className="btn" href="/audit" style={{ minWidth: "min(100%, 200px)" }} onClick={handleAuditClick}>
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

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div>
        <section className="hero">
          <div className="container">
            <h1>Plans & <span style={{ color: "var(--brand-red)" }}>Pricing</span></h1>
            <p className="muted">Loading...</p>
          </div>
        </section>
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
