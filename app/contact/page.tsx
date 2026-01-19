"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ContactPage() {
  const sp = useSearchParams();

  const prefillWebsite = useMemo(() => sp.get("url") || "", [sp]);
  const tier = useMemo(() => sp.get("tier") || "", [sp]);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState(prefillWebsite);
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          businessName,
          website,
          email,
          contactNumber,
          industry,
          message,
          tier
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send.");

      setDone("Thanks — your message has been sent. Our team will be in touch.");
      setName("");
      setBusinessName("");
      setEmail("");
      setContactNumber("");
      setIndustry("");
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="badge">Conversion Interactive Agency</span>
          <h1>
            Contact <span style={{ color: "var(--brand-red)" }}>Our Team</span>
          </h1>
          <p style={{ maxWidth: 720 }}>
            Send us your details and we’ll follow up with next steps for your GPTO plan.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Your details</h2>

            {tier ? (
              <p className="muted" style={{ marginTop: -6 }}>
                Recommended tier from audit: <strong>{tier}</strong>
              </p>
            ) : (
              <p className="muted" style={{ marginTop: -6 }}>
                If you came from the audit, your website should be prefilled below.
              </p>
            )}

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  Name
                  <input required value={name} onChange={(e) => setName(e.target.value)} />
                </label>

                <label>
                  Business Name
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Website
                <input
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  Email Address
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label>
                  Contact Number
                  <input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Industry
                <input value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </label>

              <label>
                Message (optional)
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you want to improve or what you’re aiming for."
                />
              </label>

              {error && <p style={{ color: "var(--brand-red)", margin: 0 }}>{error}</p>}
              {done && <p style={{ margin: 0, fontWeight: 800 }}>{done}</p>}

              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send to our team"}
              </button>

              <small className="muted">Spam protection (reCAPTCHA) will be added later.</small>
            </form>
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
