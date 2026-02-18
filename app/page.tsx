"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PricingCards from "./pricing/PricingCards";
import EmailModal from "./components/EmailModal";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

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

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <a href="/audit" className="badge" onClick={handleAuditClick}>Run the Free Audit</a>

          <h1>
            BE SEEN <span style={{ color: "var(--brand-red)" }}>ONLINE</span>
            <br />
            WITH <span style={{ color: "var(--brand-red)" }}>AI VISIBILITY OPTIMIZATION</span>
          </h1>

          <p style={{ maxWidth: "100%", fontSize: "inherit" }}>
            GPTO helps your website perform in AI-driven search and answer engines — improving clarity,
            structure, content depth, and machine-readability so your brand is easier to understand,
            trust, and recommend.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <a href="/audit" className="btn" style={{ minWidth: "min(100%, 200px)" }} onClick={handleAuditClick}>
              Run the Free Audit
            </a>
            <a href="#pricing" className="btn alt" style={{ minWidth: "min(100%, 200px)" }}>
              See Plans
            </a>
            <a href="/contact" className="btn alt" style={{ minWidth: "min(100%, 200px)" }}>
              Contact Our Team
            </a>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="section">
        <div className="container grid cols-3">
          <div className="card">
            <h3>AI Visibility</h3>
            <p>
              Improve how AI systems interpret what you do, who it’s for, and how it works — so they
              can confidently surface and recommend you.
            </p>
          </div>

          <div className="card">
            <h3>Authority Signals</h3>
            <p>
              Strengthen trust signals (structure, proof, consistency) that support higher-quality
              summaries and citations.
            </p>
          </div>

          <div className="card">
            <h3>Technical Readiness</h3>
            <p>
              Machine-readable foundations like schema, crawlability, canonicals, and clean indexing
              that make your site easier for systems to parse.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container grid cols-2">
          <div className="card">
            <h3>How GPTO helps</h3>
            <ul>
              <li>Run an AI Readiness Audit (scorecard + PDF)</li>
              <li>Implement priority fixes (structure, content depth, technical signals)</li>
              <li>Strengthen authority and expand coverage vs competitor gaps</li>
              <li>Track improvements over time with repeat audits</li>
            </ul>

            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <a className="btn" href="/audit" style={{ minWidth: "min(100%, 200px)" }} onClick={handleAuditClick}>
                Start with the Audit
              </a>
              <a className="btn alt" href="#pricing" style={{ minWidth: "min(100%, 200px)" }}>
                View Packages
              </a>
            </div>
          </div>

          <div className="card">
            <h3>What you get</h3>
            <ul>
              <li>Clear scorecard across AI clarity, structure, content depth, and technical readiness</li>
              <li>Specific recommendations mapped to what your site is missing</li>
              <li>PDF report you can share internally</li>
              <li>Direct link to our team to discuss GPTO packages</li>
            </ul>

            <small className="muted">
              Our approach focuses on observable, AI-readable signals — not vague “SEO tips.”
            </small>
          </div>
        </div>
      </section>

      {/* PRICING (this is what powers /#pricing) */}
      <section id="pricing" className="section" style={{ background: "var(--brand-gray-200)" }}>
  <div className="container">
    <h2 style={{ marginBottom: 10 }}>Plans & Pricing</h2>
    <p className="muted" style={{ maxWidth: "100%", marginTop: 0 }}>
      Choose the tier that fits your goals.
      <br />
      <strong>Prices are per month with a minimum 3-month subscription.</strong>
    </p>

    {/* NO recommended banner on homepage */}
    <PricingCards allowHighlight={false} />
 
  </div>
</section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="card" style={{ textAlign: "center" }}>
            <h2 style={{ marginTop: 0 }}>
              Want us to implement the recommendations for you?
            </h2>
            <p className="muted" style={{ maxWidth: "100%", margin: "0 auto" }}>
              Run the audit, then contact our team to review the results and choose the right tier.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <a href="/audit" className="btn" style={{ minWidth: "min(100%, 200px)" }} onClick={handleAuditClick}>
                Run the Audit
              </a>
              <a href="/contact" className="btn alt" style={{ minWidth: "min(100%, 200px)" }}>
                Contact Our Team
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Conversion Interactive Agency — All rights reserved.
        </div>
      </footer>
    </div>
  );
}
