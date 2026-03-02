"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
  totalEvents: number;
  recentEvents: number;
  totalLeads: number;
  activeSubscriptions: number;
  recentEventTypes: Array<{ type: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="adminDashboard">
        <h1>Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="adminDashboard">
      <h1>Dashboard</h1>
      <p className="adminDashboardSubtitle">Stripe Webhook Admin Portal Overview</p>

      <div className="adminStatsGrid">
        <div className="adminStatCard">
          <div className="adminStatValue">{stats?.totalEvents || 0}</div>
          <div className="adminStatLabel">Total Webhook Events</div>
          <Link href="/admin/webhooks" className="adminStatLink">
            View Events →
          </Link>
        </div>

        <div className="adminStatCard">
          <div className="adminStatValue">{stats?.recentEvents || 0}</div>
          <div className="adminStatLabel">Events (Last 24h)</div>
          <Link href="/admin/webhooks" className="adminStatLink">
            View Recent →
          </Link>
        </div>

        <div className="adminStatCard">
          <div className="adminStatValue">{stats?.totalLeads || 0}</div>
          <div className="adminStatLabel">Payment Leads</div>
          <Link href="/admin/payment-leads" className="adminStatLink">
            View Leads →
          </Link>
        </div>

        <div className="adminStatCard">
          <div className="adminStatValue">{stats?.activeSubscriptions || 0}</div>
          <div className="adminStatLabel">Active Subscriptions</div>
          <Link href="/admin/payment-leads" className="adminStatLink">
            View Subscriptions →
          </Link>
        </div>
      </div>

      {stats?.recentEventTypes && stats.recentEventTypes.length > 0 && (
        <div className="adminDashboardSection">
          <h2>Recent Event Types</h2>
          <div className="adminEventTypesList">
            {stats.recentEventTypes.map((item) => (
              <div key={item.type} className="adminEventTypeItem">
                <span className="adminEventTypeName">{item.type}</span>
                <span className="adminEventTypeCount">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adminDashboardActions">
        <Link href="/admin/test-webhook" className="adminActionButton">
          Test Webhook
        </Link>
        <Link href="/admin/config" className="adminActionButton">
          View Configuration
        </Link>
      </div>

      <style jsx>{`
        .adminDashboard h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminDashboardSubtitle {
          margin: 0 0 32px 0;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminStatsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-bottom: 48px;
        }
        .adminStatCard {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .adminStatValue {
          font-size: 36px;
          font-weight: 900;
          color: var(--brand-red, #c20f2c);
          margin-bottom: 8px;
        }
        .adminStatLabel {
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
          margin-bottom: 12px;
        }
        .adminStatLink {
          color: var(--brand-red, #c20f2c);
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
        }
        .adminStatLink:hover {
          text-decoration: underline;
        }
        .adminDashboardSection {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }
        .adminDashboardSection h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
        }
        .adminEventTypesList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .adminEventTypeItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 6px;
        }
        .adminEventTypeName {
          font-family: monospace;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.8);
        }
        .adminEventTypeCount {
          font-weight: 700;
          color: var(--brand-red, #c20f2c);
        }
        .adminDashboardActions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .adminActionButton {
          padding: 12px 24px;
          background: var(--brand-red, #c20f2c);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 700;
          transition: background 0.2s;
        }
        .adminActionButton:hover {
          background: var(--brand-red-dark, #a00d24);
        }
      `}</style>
    </div>
  );
}
