"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface WebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  processedAt: string;
  createdAt: string;
  payload: any;
}

export default function WebhookDetailsPage() {
  const params = useParams();
  const [event, setEvent] = useState<WebhookEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/admin/webhooks/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setEvent(data.event);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="adminWebhookDetails">
        <p>Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="adminWebhookDetails">
        <p>Event not found</p>
        <Link href="/admin/webhooks">← Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="adminWebhookDetails">
      <div className="adminWebhookDetailsHeader">
        <Link href="/admin/webhooks" className="adminWebhookDetailsBack">
          ← Back to Events
        </Link>
        <h1>Webhook Event Details</h1>
      </div>

      <div className="adminWebhookDetailsCard">
        <div className="adminWebhookDetailsSection">
          <h2>Event Information</h2>
          <div className="adminWebhookDetailsGrid">
            <div className="adminWebhookDetailsField">
              <label>Stripe Event ID</label>
              <code className="adminWebhookDetailsValue">{event.stripeEventId}</code>
            </div>
            <div className="adminWebhookDetailsField">
              <label>Event Type</label>
              <span className="adminWebhookDetailsValue adminWebhookType">{event.eventType}</span>
            </div>
            <div className="adminWebhookDetailsField">
              <label>Processed At</label>
              <span className="adminWebhookDetailsValue">{new Date(event.processedAt).toLocaleString()}</span>
            </div>
            <div className="adminWebhookDetailsField">
              <label>Created At</label>
              <span className="adminWebhookDetailsValue">{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="adminWebhookDetailsSection">
          <h2>Payload</h2>
          <pre className="adminWebhookDetailsPayload">{JSON.stringify(event.payload, null, 2)}</pre>
        </div>
      </div>

      <style jsx>{`
        .adminWebhookDetails h1 {
          margin: 0 0 24px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminWebhookDetailsHeader {
          margin-bottom: 24px;
        }
        .adminWebhookDetailsBack {
          display: inline-block;
          margin-bottom: 16px;
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-weight: 600;
        }
        .adminWebhookDetailsBack:hover {
          text-decoration: underline;
        }
        .adminWebhookDetailsCard {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .adminWebhookDetailsSection {
          margin-bottom: 32px;
        }
        .adminWebhookDetailsSection:last-child {
          margin-bottom: 0;
        }
        .adminWebhookDetailsSection h2 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
        }
        .adminWebhookDetailsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        .adminWebhookDetailsField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .adminWebhookDetailsField label {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminWebhookDetailsValue {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.9);
        }
        .adminWebhookDetailsValue code {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .adminWebhookType {
          font-family: monospace;
          color: var(--brand-red, #c20f2c);
          font-weight: 600;
        }
        .adminWebhookDetailsPayload {
          background: rgba(0, 0, 0, 0.05);
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
