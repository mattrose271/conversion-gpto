"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PaymentLead {
  id: string;
  tier: string;
  name: string;
  businessName: string;
  website: string;
  email: string;
  checkoutStatus: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PaymentLeadsPage() {
  const [leads, setLeads] = useState<PaymentLead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (tierFilter) params.append("tier", tierFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/payment-leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, tierFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="adminPaymentLeads">
      <div className="adminPaymentLeadsHeader">
        <h1>Payment Leads</h1>
        <p className="adminPaymentLeadsSubtitle">View and manage payment leads and subscriptions</p>
      </div>

      <div className="adminPaymentLeadsFilters">
        <form onSubmit={handleSearch} className="adminPaymentLeadsSearch">
          <input
            type="text"
            placeholder="Search by email, name, business, or website..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adminPaymentLeadsSearchInput"
          />
          <button type="submit" className="adminPaymentLeadsSearchButton">
            Search
          </button>
        </form>

        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setPage(1);
          }}
          className="adminPaymentLeadsFilter"
        >
          <option value="">All Tiers</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="adminPaymentLeadsFilter"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {loading ? (
        <div className="adminPaymentLeadsLoading">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="adminPaymentLeadsEmpty">No leads found</div>
      ) : (
        <>
          <div className="adminPaymentLeadsTable">
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Contact</th>
                  <th>Tier</th>
                  <th>Checkout Status</th>
                  <th>Subscription Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="adminLeadBusiness">
                        <strong>{lead.businessName}</strong>
                        <span className="adminLeadWebsite">{lead.website}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adminLeadContact">
                        <div>{lead.name}</div>
                        <div className="adminLeadEmail">{lead.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className="adminLeadTier">{lead.tier}</span>
                    </td>
                    <td>
                      <span className={`adminLeadStatus adminLeadStatus-${lead.checkoutStatus || "pending"}`}>
                        {lead.checkoutStatus || "pending"}
                      </span>
                    </td>
                    <td>
                      <span className={`adminLeadStatus adminLeadStatus-${lead.subscriptionStatus || "none"}`}>
                        {lead.subscriptionStatus || "none"}
                      </span>
                    </td>
                    <td>{formatDate(lead.createdAt)}</td>
                    <td>
                      <Link href={`/admin/payment-leads/${lead.id}`} className="adminLeadLink">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="adminPaymentLeadsPagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="adminPaginationButton"
              >
                Previous
              </button>
              <span className="adminPaginationInfo">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="adminPaginationButton"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .adminPaymentLeads h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminPaymentLeadsSubtitle {
          margin: 0 0 24px 0;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminPaymentLeadsFilters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .adminPaymentLeadsSearch {
          display: flex;
          gap: 8px;
          flex: 1;
          min-width: 300px;
        }
        .adminPaymentLeadsSearchInput {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
        }
        .adminPaymentLeadsSearchButton {
          padding: 10px 20px;
          background: var(--brand-red, #c20f2c);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .adminPaymentLeadsFilter {
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
          min-width: 150px;
        }
        .adminPaymentLeadsTable {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow-x: auto;
        }
        .adminPaymentLeadsTable table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        .adminPaymentLeadsTable thead {
          background: rgba(0, 0, 0, 0.05);
        }
        .adminPaymentLeadsTable th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 700;
          font-size: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .adminPaymentLeadsTable td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 14px;
        }
        .adminPaymentLeadsTable tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .adminLeadBusiness strong {
          display: block;
          margin-bottom: 4px;
        }
        .adminLeadWebsite {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminLeadContact {
          font-size: 14px;
        }
        .adminLeadEmail {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
          margin-top: 4px;
        }
        .adminLeadTier {
          text-transform: capitalize;
          font-weight: 600;
          color: var(--brand-red, #c20f2c);
        }
        .adminLeadStatus {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .adminLeadStatus-completed,
        .adminLeadStatus-active {
          background: #d4edda;
          color: #155724;
        }
        .adminLeadStatus-past_due {
          background: #fff3cd;
          color: #856404;
        }
        .adminLeadStatus-canceled,
        .adminLeadStatus-none,
        .adminLeadStatus-pending {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(0, 0, 0, 0.6);
        }
        .adminLeadLink {
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-weight: 600;
        }
        .adminLeadLink:hover {
          text-decoration: underline;
        }
        .adminPaymentLeadsLoading,
        .adminPaymentLeadsEmpty {
          padding: 48px;
          text-align: center;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminPaymentLeadsPagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }
        .adminPaginationButton {
          padding: 8px 16px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .adminPaginationButton:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
        }
        .adminPaginationButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .adminPaginationInfo {
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
