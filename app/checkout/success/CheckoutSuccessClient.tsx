"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SessionSummary = {
  id: string;
  status: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  currency: string | null;
  amountTotal: number | null;
  tier: string | null;
  lead?: {
    id: string;
    name: string;
    businessName: string;
    website: string;
    email: string;
    tier: string;
    checkoutStatus?: string | null;
    subscriptionStatus?: string | null;
  } | null;
};

function formatMoney(amount: number | null, currency: string | null): string {
  if (typeof amount !== "number") return "—";
  const safeCurrency = currency || "usd";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency.toUpperCase(),
  }).format(amount / 100);
}

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") || "";

  const [loading, setLoading] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.session) {
          throw new Error(data?.error || "Unable to load checkout details");
        }
        if (!cancelled) {
          setSessionSummary(data.session);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || "Unable to load checkout details");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function openBillingPortal() {
    if (!sessionId) return;
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Unable to open billing portal");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Unable to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1>
            Payment <span style={{ color: "var(--brand-red)" }}>Received</span>
          </h1>
          <p className="muted" style={{ maxWidth: "100%" }}>
            Your GPTO subscription is active. Next step: schedule onboarding and share any implementation priorities.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="card">
            {loading && <p>Loading order details...</p>}
            {!loading && !sessionId && (
              <p style={{ margin: 0 }}>
                Missing checkout session ID. Please check your email confirmation or contact support.
              </p>
            )}

            {!loading && sessionSummary && (
              <div style={{ display: "grid", gap: 8 }}>
                <h2 style={{ margin: 0 }}>Order Summary</h2>
                <p style={{ margin: 0 }}>
                  <strong>Plan:</strong> {sessionSummary.tier || "—"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Customer Email:</strong> {sessionSummary.customerEmail || "—"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Amount:</strong> {formatMoney(sessionSummary.amountTotal, sessionSummary.currency)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Payment Status:</strong> {sessionSummary.paymentStatus || "—"}
                </p>
                {sessionSummary.lead?.businessName && (
                  <p style={{ margin: 0 }}>
                    <strong>Business:</strong> {sessionSummary.lead.businessName}
                  </p>
                )}
                {sessionSummary.lead?.website && (
                  <p style={{ margin: 0 }}>
                    <strong>Website:</strong> {sessionSummary.lead.website}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p style={{ color: "var(--brand-red)", marginBottom: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              {calendlyUrl && (
                <a className="btn" href={calendlyUrl} target="_blank" rel="noopener noreferrer">
                  Schedule Onboarding
                </a>
              )}
              <button
                type="button"
                className="btn alt"
                onClick={openBillingPortal}
                disabled={!sessionId || portalLoading}
                style={{ border: "none", cursor: !sessionId || portalLoading ? "not-allowed" : "pointer" }}
              >
                {portalLoading ? "Opening Billing Portal..." : "Manage Billing"}
              </button>
              <a className="btn alt" href="/contact">
                Contact Our Team
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
