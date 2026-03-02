"use client";

import { useState } from "react";

export default function TestWebhookPage() {
  const [eventType, setEventType] = useState("checkout.session.completed");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to test webhook" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminTestWebhook">
      <h1>Test Webhook</h1>
      <p className="adminTestWebhookSubtitle">Test your Stripe webhook endpoint</p>

      <div className="adminTestWebhookCard">
        <h2>Test Event</h2>
        <form onSubmit={handleTest} className="adminTestWebhookForm">
          <div className="adminTestWebhookField">
            <label htmlFor="eventType">Event Type</label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="adminTestWebhookSelect"
            >
              <option value="checkout.session.completed">checkout.session.completed</option>
              <option value="checkout.session.async_payment_succeeded">checkout.session.async_payment_succeeded</option>
              <option value="checkout.session.async_payment_failed">checkout.session.async_payment_failed</option>
              <option value="customer.subscription.created">customer.subscription.created</option>
              <option value="customer.subscription.updated">customer.subscription.updated</option>
              <option value="customer.subscription.deleted">customer.subscription.deleted</option>
              <option value="invoice.payment_succeeded">invoice.payment_succeeded</option>
              <option value="invoice.payment_failed">invoice.payment_failed</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="adminTestWebhookButton">
            {loading ? "Testing..." : "Get Test Instructions"}
          </button>
        </form>

        {result && (
          <div className="adminTestWebhookResult">
            {result.error ? (
              <div className="adminTestWebhookError">{result.error}</div>
            ) : (
              <>
                <h3>Test Instructions</h3>
                <div className="adminTestWebhookInstructions">
                  <p>
                    <strong>Webhook Secret:</strong> {result.webhookSecret}
                  </p>
                  <ol>
                    {result.instructions?.map((instruction: string, index: number) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="adminTestWebhookCard">
        <h2>Local Testing Setup</h2>
        <div className="adminTestWebhookInfo">
          <p>
            To test webhooks locally, you need to use the Stripe CLI to forward events to your local development
            server.
          </p>
          <h3>Steps:</h3>
          <ol>
            <li>
              Install Stripe CLI:{" "}
              <a href="https://stripe.com/docs/stripe-cli" target="_blank" rel="noopener noreferrer">
                https://stripe.com/docs/stripe-cli
              </a>
            </li>
            <li>
              Authenticate: <code>stripe login</code>
            </li>
            <li>
              Forward events (local): <code>stripe listen --forward-to localhost:3000/api/stripe-webhook</code>
            </li>
            <li>
              Production endpoint: <code>{result?.productionUrl || "https://your-domain.com/api/stripe-webhook"}</code>
            </li>
            <li>
              Trigger test events: <code>stripe trigger checkout.session.completed</code>
            </li>
          </ol>
          <p>
            The webhook secret will be displayed when you run <code>stripe listen</code>. Use this secret in your{" "}
            <code>STRIPE_WEBHOOK_SECRET</code> environment variable for local testing.
          </p>
          <p>
            <strong>Production Webhook URL:</strong>{" "}
            <code>{result?.productionUrl || "https://your-domain.com/api/stripe-webhook"}</code>
          </p>
          <p>
            Make sure this URL is registered in your Stripe Dashboard under Webhooks. The webhook secret for production
            is different from the local testing secret.
          </p>
        </div>
      </div>

      <style jsx>{`
        .adminTestWebhook h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminTestWebhookSubtitle {
          margin: 0 0 32px 0;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminTestWebhookCard {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .adminTestWebhookCard h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
        }
        .adminTestWebhookForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .adminTestWebhookField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .adminTestWebhookField label {
          font-weight: 600;
          font-size: 14px;
        }
        .adminTestWebhookSelect {
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
        }
        .adminTestWebhookButton {
          padding: 12px 24px;
          background: var(--brand-red, #c20f2c);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .adminTestWebhookButton:hover:not(:disabled) {
          background: var(--brand-red-dark, #a00d24);
        }
        .adminTestWebhookButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .adminTestWebhookResult {
          margin-top: 24px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 6px;
        }
        .adminTestWebhookResult h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 700;
        }
        .adminTestWebhookError {
          padding: 12px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          color: #c00;
        }
        .adminTestWebhookInstructions {
          font-size: 14px;
          line-height: 1.6;
        }
        .adminTestWebhookInstructions code {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .adminTestWebhookInstructions ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .adminTestWebhookInstructions li {
          margin-bottom: 8px;
        }
        .adminTestWebhookInfo {
          font-size: 14px;
          line-height: 1.6;
        }
        .adminTestWebhookInfo h3 {
          margin: 20px 0 12px 0;
          font-size: 16px;
          font-weight: 700;
        }
        .adminTestWebhookInfo ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .adminTestWebhookInfo li {
          margin-bottom: 8px;
        }
        .adminTestWebhookInfo code {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .adminTestWebhookInfo a {
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
        }
        .adminTestWebhookInfo a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
