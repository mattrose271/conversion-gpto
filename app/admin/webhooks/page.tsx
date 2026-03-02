"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  processedAt: string;
  createdAt: string;
  payload: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (eventTypeFilter) params.append("eventType", eventTypeFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/webhooks?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="adminWebhooks">
      <div className="adminWebhooksHeader">
        <h1>Webhook Events</h1>
        <p className="adminWebhooksSubtitle">View and manage Stripe webhook events</p>
      </div>

      <div className="adminWebhooksFilters">
        <form onSubmit={handleSearch} className="adminWebhooksSearch">
          <input
            type="text"
            placeholder="Search by event ID or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adminWebhooksSearchInput"
          />
          <button type="submit" className="adminWebhooksSearchButton">
            Search
          </button>
        </form>

        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="adminWebhooksFilter"
        >
          <option value="">All Event Types</option>
          <option value="checkout.session.completed">checkout.session.completed</option>
          <option value="customer.subscription.created">customer.subscription.created</option>
          <option value="customer.subscription.updated">customer.subscription.updated</option>
          <option value="customer.subscription.deleted">customer.subscription.deleted</option>
          <option value="invoice.payment_succeeded">invoice.payment_succeeded</option>
          <option value="invoice.payment_failed">invoice.payment_failed</option>
        </select>
      </div>

      {loading ? (
        <div className="adminWebhooksLoading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="adminWebhooksEmpty">No events found</div>
      ) : (
        <>
          <div className="adminWebhooksTable">
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Type</th>
                  <th>Processed At</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <code className="adminWebhookId">{event.stripeEventId}</code>
                    </td>
                    <td>
                      <span className="adminWebhookType">{event.eventType}</span>
                    </td>
                    <td>{formatDate(event.processedAt)}</td>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>
                      <Link href={`/admin/webhooks/${event.id}`} className="adminWebhookLink">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="adminWebhooksPagination">
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
        .adminWebhooks h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminWebhooksSubtitle {
          margin: 0 0 24px 0;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminWebhooksFilters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .adminWebhooksSearch {
          display: flex;
          gap: 8px;
          flex: 1;
          min-width: 300px;
        }
        .adminWebhooksSearchInput {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
        }
        .adminWebhooksSearchButton {
          padding: 10px 20px;
          background: var(--brand-red, #c20f2c);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .adminWebhooksFilter {
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
          min-width: 200px;
        }
        .adminWebhooksTable {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .adminWebhooksTable table {
          width: 100%;
          border-collapse: collapse;
        }
        .adminWebhooksTable thead {
          background: rgba(0, 0, 0, 0.05);
        }
        .adminWebhooksTable th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 700;
          font-size: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .adminWebhooksTable td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 14px;
        }
        .adminWebhooksTable tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .adminWebhookId {
          font-family: monospace;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .adminWebhookType {
          font-family: monospace;
          font-size: 13px;
          color: var(--brand-red, #c20f2c);
        }
        .adminWebhookLink {
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-weight: 600;
        }
        .adminWebhookLink:hover {
          text-decoration: underline;
        }
        .adminWebhooksLoading,
        .adminWebhooksEmpty {
          padding: 48px;
          text-align: center;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminWebhooksPagination {
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
