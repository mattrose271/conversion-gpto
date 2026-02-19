"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { PaymentTier } from "@/lib/payments";

interface CheckoutLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: PaymentTier | null;
  website: string;
}

export default function CheckoutLeadModal({ isOpen, onClose, tier, website }: CheckoutLeadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [websiteInput, setWebsiteInput] = useState(website || "");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [message, setMessage] = useState("");
  const [minimumTermAccepted, setMinimumTermAccepted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (website && !websiteInput) {
      setWebsiteInput(website);
    }

    if (typeof window !== "undefined" && !email) {
      const savedEmail =
        window.localStorage.getItem("gpto_modal_email") ||
        window.localStorage.getItem("gpto_saved_email") ||
        "";
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, website]);

  const contactFallbackHref = useMemo(() => {
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (websiteInput) params.set("url", websiteInput);
    return `/contact?${params.toString()}`;
  }, [tier, websiteInput]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tier) return;

    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        tier,
        name,
        businessName,
        website: websiteInput,
        email,
        contactNumber,
        industry,
        message,
        source: "pricing",
        minimumTermAccepted,
      };

      if (typeof window !== "undefined") {
        const auditId = window.localStorage.getItem("gpto_latest_audit_id");
        if (auditId) {
          payload.auditId = auditId;
        }
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.sessionUrl) {
        throw new Error(data?.error || "Unable to start checkout. Please contact our team.");
      }

      window.location.href = data.sessionUrl;
    } catch (err: any) {
      setError(err?.message || "Unable to start checkout. Please contact our team.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !isOpen || !tier) return null;

  const submitDisabled =
    loading ||
    !name.trim() ||
    !businessName.trim() ||
    !websiteInput.trim() ||
    !email.trim() ||
    !minimumTermAccepted;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0,0,0,0.58)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.28)",
          padding: 20,
          position: "relative",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close checkout lead form"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "none",
            background: "transparent",
            fontSize: 24,
            color: "#666",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: 8 }}>
          Start {tier} Checkout
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Complete these details first, then we will open secure Stripe checkout.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div className="form-row" style={{ display: "grid", gap: 12 }}>
            <label>
              Name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
              />
            </label>

            <label>
              Business Name
              <input
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <label>
            Website
            <input
              required
              value={websiteInput}
              onChange={(event) => setWebsiteInput(event.target.value)}
              disabled={loading}
              placeholder="https://example.com"
            />
          </label>

          <div className="form-row" style={{ display: "grid", gap: 12 }}>
            <label>
              Email Address
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </label>

            <label>
              Contact Number (optional)
              <input
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <label>
            Industry (optional)
            <input value={industry} onChange={(event) => setIndustry(event.target.value)} disabled={loading} />
          </label>

          <label>
            Message (optional)
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={loading}
              placeholder="Anything we should know before onboarding?"
            />
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={minimumTermAccepted}
              onChange={(event) => setMinimumTermAccepted(event.target.checked)}
              disabled={loading}
              style={{ width: 18, height: 18, marginTop: 2 }}
            />
            <span style={{ fontWeight: 500 }}>
              I understand this subscription has a minimum 3-month commitment.
            </span>
          </label>

          {error && (
            <p style={{ margin: 0, color: "var(--brand-red)" }}>
              {error}{" "}
              <a href={contactFallbackHref} style={{ fontWeight: 700 }}>
                Contact our team instead
              </a>
              .
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              className="btn"
              disabled={submitDisabled}
              style={{ minWidth: "min(100%, 220px)", opacity: submitDisabled ? 0.7 : 1 }}
            >
              {loading ? "Opening Stripe..." : "Continue to Secure Checkout"}
            </button>
            <a className="btn alt" href={contactFallbackHref} style={{ minWidth: "min(100%, 180px)" }}>
              Talk to Our Team
            </a>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
