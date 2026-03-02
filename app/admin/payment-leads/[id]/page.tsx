"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PaymentLead {
  id: string;
  tier: string;
  name: string;
  businessName: string;
  website: string;
  email: string;
  contactNumber: string | null;
  industry: string | null;
  message: string | null;
  checkoutStatus: string | null;
  subscriptionStatus: string | null;
  lastInvoiceStatus: string | null;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
  audit: any;
}

export default function PaymentLeadDetailsPage() {
  const params = useParams();
  const [lead, setLead] = useState<PaymentLead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/admin/payment-leads/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setLead(data.lead);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="adminPaymentLeadDetails">
        <p>Loading...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="adminPaymentLeadDetails">
        <p>Payment lead not found</p>
        <Link href="/admin/payment-leads">← Back to Leads</Link>
      </div>
    );
  }

  return (
    <div className="adminPaymentLeadDetails">
      <div className="adminPaymentLeadDetailsHeader">
        <Link href="/admin/payment-leads" className="adminPaymentLeadDetailsBack">
          ← Back to Leads
        </Link>
        <h1>Payment Lead Details</h1>
      </div>

      <div className="adminPaymentLeadDetailsCard">
        <div className="adminPaymentLeadDetailsSection">
          <h2>Business Information</h2>
          <div className="adminPaymentLeadDetailsGrid">
            <div className="adminPaymentLeadDetailsField">
              <label>Business Name</label>
              <span className="adminPaymentLeadDetailsValue">{lead.businessName}</span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Website</label>
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="adminPaymentLeadDetailsLink">
                {lead.website}
              </a>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Tier</label>
              <span className="adminPaymentLeadDetailsValue adminPaymentLeadTier">{lead.tier}</span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Industry</label>
              <span className="adminPaymentLeadDetailsValue">{lead.industry || "—"}</span>
            </div>
          </div>
        </div>

        <div className="adminPaymentLeadDetailsSection">
          <h2>Contact Information</h2>
          <div className="adminPaymentLeadDetailsGrid">
            <div className="adminPaymentLeadDetailsField">
              <label>Name</label>
              <span className="adminPaymentLeadDetailsValue">{lead.name}</span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Email</label>
              <a href={`mailto:${lead.email}`} className="adminPaymentLeadDetailsLink">
                {lead.email}
              </a>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Contact Number</label>
              <span className="adminPaymentLeadDetailsValue">{lead.contactNumber || "—"}</span>
            </div>
          </div>
          {lead.message && (
            <div className="adminPaymentLeadDetailsField">
              <label>Message</label>
              <div className="adminPaymentLeadDetailsMessage">{lead.message}</div>
            </div>
          )}
        </div>

        <div className="adminPaymentLeadDetailsSection">
          <h2>Stripe Information</h2>
          <div className="adminPaymentLeadDetailsGrid">
            <div className="adminPaymentLeadDetailsField">
              <label>Checkout Status</label>
              <span className={`adminPaymentLeadStatus adminPaymentLeadStatus-${lead.checkoutStatus || "pending"}`}>
                {lead.checkoutStatus || "pending"}
              </span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Subscription Status</label>
              <span className={`adminPaymentLeadStatus adminPaymentLeadStatus-${lead.subscriptionStatus || "none"}`}>
                {lead.subscriptionStatus || "none"}
              </span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Last Invoice Status</label>
              <span className="adminPaymentLeadDetailsValue">{lead.lastInvoiceStatus || "—"}</span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Stripe Customer ID</label>
              {lead.stripeCustomerId ? (
                <code className="adminPaymentLeadDetailsCode">{lead.stripeCustomerId}</code>
              ) : (
                <span className="adminPaymentLeadDetailsValue">—</span>
              )}
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Stripe Subscription ID</label>
              {lead.stripeSubscriptionId ? (
                <code className="adminPaymentLeadDetailsCode">{lead.stripeSubscriptionId}</code>
              ) : (
                <span className="adminPaymentLeadDetailsValue">—</span>
              )}
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Checkout Session ID</label>
              {lead.stripeCheckoutSessionId ? (
                <code className="adminPaymentLeadDetailsCode">{lead.stripeCheckoutSessionId}</code>
              ) : (
                <span className="adminPaymentLeadDetailsValue">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="adminPaymentLeadDetailsSection">
          <h2>Timestamps</h2>
          <div className="adminPaymentLeadDetailsGrid">
            <div className="adminPaymentLeadDetailsField">
              <label>Created At</label>
              <span className="adminPaymentLeadDetailsValue">{new Date(lead.createdAt).toLocaleString()}</span>
            </div>
            <div className="adminPaymentLeadDetailsField">
              <label>Updated At</label>
              <span className="adminPaymentLeadDetailsValue">{new Date(lead.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .adminPaymentLeadDetails h1 {
          margin: 0 0 24px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminPaymentLeadDetailsHeader {
          margin-bottom: 24px;
        }
        .adminPaymentLeadDetailsBack {
          display: inline-block;
          margin-bottom: 16px;
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-weight: 600;
        }
        .adminPaymentLeadDetailsBack:hover {
          text-decoration: underline;
        }
        .adminPaymentLeadDetailsCard {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .adminPaymentLeadDetailsSection {
          margin-bottom: 32px;
        }
        .adminPaymentLeadDetailsSection:last-child {
          margin-bottom: 0;
        }
        .adminPaymentLeadDetailsSection h2 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
        }
        .adminPaymentLeadDetailsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        .adminPaymentLeadDetailsField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .adminPaymentLeadDetailsField label {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminPaymentLeadDetailsValue {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.9);
        }
        .adminPaymentLeadDetailsLink {
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-size: 14px;
        }
        .adminPaymentLeadDetailsLink:hover {
          text-decoration: underline;
        }
        .adminPaymentLeadDetailsCode {
          font-family: monospace;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .adminPaymentLeadTier {
          text-transform: capitalize;
          font-weight: 600;
          color: var(--brand-red, #c20f2c);
        }
        .adminPaymentLeadStatus {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .adminPaymentLeadStatus-completed,
        .adminPaymentLeadStatus-active {
          background: #d4edda;
          color: #155724;
        }
        .adminPaymentLeadStatus-past_due {
          background: #fff3cd;
          color: #856404;
        }
        .adminPaymentLeadStatus-canceled,
        .adminPaymentLeadStatus-none,
        .adminPaymentLeadStatus-pending {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(0, 0, 0, 0.6);
        }
        .adminPaymentLeadDetailsMessage {
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
