"use client";

import { useState, useEffect } from "react";

interface Config {
  webhookSecret: {
    configured: boolean;
    value: string | null;
  };
  stripeKeys: {
    secretKey: {
      configured: boolean;
      test: boolean;
      live: boolean;
    };
  };
  endpoint: {
    url: string;
    reachable: boolean;
    registered?: boolean;
    statusCode?: number;
    error?: string;
  };
  environment: {
    mode: string;
    useLive: boolean;
  };
  stripeMode: {
    selected: "auto" | "test" | "live";
    effective: "test" | "live";
    default: "test" | "live";
  };
  webhookEndpoints: Array<{
    id: string;
    url: string;
    status: string;
    enabled: boolean;
    apiVersion: string | null;
    events: string[];
    created: number;
  }>;
  webhookEndpointsError?: string;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedStripeMode, setSelectedStripeMode] = useState<"auto" | "test" | "live">("auto");
  const [savingStripeMode, setSavingStripeMode] = useState(false);
  const [stripeModeMessage, setStripeModeMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data.config);
        setSelectedStripeMode(data.config?.stripeMode?.selected || "auto");
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const saveStripeMode = async () => {
    setSavingStripeMode(true);
    setStripeModeMessage("");
    try {
      const res = await fetch("/api/admin/config/stripe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedStripeMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update Stripe mode");
      }

      const refreshed = await fetch("/api/admin/config");
      const refreshedData = await refreshed.json();
      setConfig(refreshedData.config);
      setSelectedStripeMode(refreshedData.config?.stripeMode?.selected || selectedStripeMode);
      setStripeModeMessage("Stripe mode updated.");
    } catch (error: any) {
      setStripeModeMessage(error?.message || "Failed to update Stripe mode");
    } finally {
      setSavingStripeMode(false);
    }
  };

  if (loading) {
    return (
      <div className="adminConfig">
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="adminConfig">
        <p>Failed to load configuration</p>
      </div>
    );
  }

  return (
    <div className="adminConfig">
      <h1>Webhook Configuration</h1>
      <p className="adminConfigSubtitle">Monitor your Stripe webhook configuration status</p>

      <div className="adminConfigGrid">
        <div className="adminConfigCard">
          <h2>Webhook Secret</h2>
          <div className="adminConfigStatus">
            <span className={config.webhookSecret.configured ? "adminConfigStatusOk" : "adminConfigStatusError"}>
              {config.webhookSecret.configured ? "✓ Configured" : "✗ Not Configured"}
            </span>
            {config.webhookSecret.value && (
              <code className="adminConfigValue">{config.webhookSecret.value}</code>
            )}
          </div>
          <p className="adminConfigDescription">
            Set <code>STRIPE_WEBHOOK_SECRET</code> in your environment variables
          </p>
        </div>

        <div className="adminConfigCard">
          <h2>Stripe API Keys</h2>
          <div className="adminConfigStatus">
            <span className={config.stripeKeys.secretKey.configured ? "adminConfigStatusOk" : "adminConfigStatusError"}>
              {config.stripeKeys.secretKey.configured ? "✓ Configured" : "✗ Not Configured"}
            </span>
            <div className="adminConfigKeys">
              <div>
                Test Key: {config.stripeKeys.secretKey.test ? "✓" : "✗"}
              </div>
              <div>
                Live Key: {config.stripeKeys.secretKey.live ? "✓" : "✗"}
              </div>
            </div>
          </div>
          <p className="adminConfigDescription">
            Set <code>STRIPE_SECRET_KEY</code> (test) and <code>STRIPE_LIVE_SECRET_KEY</code> (production)
          </p>
        </div>

        <div className="adminConfigCard">
          <h2>Webhook Endpoint</h2>
          <div className="adminConfigStatus">
            <span className={config.endpoint.reachable ? "adminConfigStatusOk" : "adminConfigStatusError"}>
              {config.endpoint.reachable ? "✓ Reachable" : "✗ Not Reachable"}
            </span>
            {config.endpoint.statusCode && (
              <span className="adminConfigStatusCode">HTTP {config.endpoint.statusCode}</span>
            )}
            <span className={config.endpoint.registered ? "adminConfigStatusOk" : "adminConfigStatusError"}>
              {config.endpoint.registered ? "✓ Registered in Stripe" : "✗ Not found in Stripe endpoints"}
            </span>
            {config.endpoint.error && <span className="adminConfigError">{config.endpoint.error}</span>}
          </div>
          <p className="adminConfigDescription">
            <code>{config.endpoint.url}</code>
          </p>
        </div>

        <div className="adminConfigCard">
          <h2>Environment</h2>
          <div className="adminConfigStatus">
            <span className="adminConfigStatusInfo">
              Mode: {config.environment.mode}
            </span>
            <div>
              Using Live Mode: {config.environment.useLive ? "Yes" : "No"}
            </div>
          </div>
          <p className="adminConfigDescription">
            Current environment configuration
          </p>
        </div>

        <div className="adminConfigCard">
          <h2>Stripe Mode Override</h2>
          <div className="adminConfigStatus">
            <div className="adminConfigKeys">
              <div>Effective Mode: {config.stripeMode.effective === "live" ? "Production" : "Sandbox"}</div>
              <div>Default Mode: {config.stripeMode.default === "live" ? "Production" : "Sandbox"}</div>
            </div>
            <div className="adminConfigModeControls">
              <select
                value={selectedStripeMode}
                onChange={(e) => setSelectedStripeMode(e.target.value as "auto" | "test" | "live")}
                className="adminConfigModeSelect"
              >
                <option value="auto">Auto (follow env default)</option>
                <option value="test">Sandbox (test keys)</option>
                <option value="live">Production (live keys)</option>
              </select>
              <button
                type="button"
                onClick={saveStripeMode}
                className="adminConfigModeButton"
                disabled={savingStripeMode}
              >
                {savingStripeMode ? "Saving..." : "Save Mode"}
              </button>
            </div>
            {stripeModeMessage && <span className="adminConfigStatusInfo">{stripeModeMessage}</span>}
          </div>
          <p className="adminConfigDescription">
            Use Sandbox mode for card testing. This affects checkout and billing requests made from this browser session.
          </p>
        </div>
      </div>

      <div className="adminConfigCard">
        <h2>Registered Webhook Endpoints</h2>
        {config.webhookEndpointsError ? (
          <div className="adminConfigError">{config.webhookEndpointsError}</div>
        ) : config.webhookEndpoints.length === 0 ? (
          <p>No webhook endpoints found</p>
        ) : (
          <div className="adminConfigEndpoints">
            {config.webhookEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="adminConfigEndpoint">
                <div className="adminConfigEndpointHeader">
                  <div>
                    <strong>{endpoint.url}</strong>
                    <span className={`adminConfigEndpointStatus adminConfigEndpointStatus-${endpoint.status}`}>
                      {endpoint.status}
                    </span>
                  </div>
                  <div className="adminConfigEndpointMeta">
                    {endpoint.apiVersion && <span>API: {endpoint.apiVersion}</span>}
                    <span>Created: {new Date(endpoint.created * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="adminConfigEndpointEvents">
                  <strong>Events ({endpoint.events.length}):</strong>
                  <div className="adminConfigEndpointEventsList">
                    {endpoint.events.slice(0, 10).map((event, idx) => (
                      <code key={idx} className="adminConfigEventType">
                        {event}
                      </code>
                    ))}
                    {endpoint.events.length > 10 && (
                      <span className="adminConfigMoreEvents">+{endpoint.events.length - 10} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .adminConfig h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 900;
        }
        .adminConfigSubtitle {
          margin: 0 0 32px 0;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminConfigGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .adminConfigCard {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .adminConfigCard h2 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
        }
        .adminConfigStatus {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .adminConfigStatusOk {
          color: #155724;
          font-weight: 700;
        }
        .adminConfigStatusError {
          color: #c00;
          font-weight: 700;
        }
        .adminConfigStatusInfo {
          color: rgba(0, 0, 0, 0.8);
          font-weight: 600;
        }
        .adminConfigValue {
          font-family: monospace;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .adminConfigKeys {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 14px;
        }
        .adminConfigModeControls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .adminConfigModeSelect {
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 14px;
          min-width: 240px;
        }
        .adminConfigModeButton {
          padding: 10px 14px;
          background: var(--brand-red, #c20f2c);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .adminConfigModeButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .adminConfigStatusCode {
          font-family: monospace;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminConfigError {
          color: #c00;
          font-size: 14px;
        }
        .adminConfigDescription {
          margin: 0;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminConfigDescription code {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .adminConfigEndpoints {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .adminConfigEndpoint {
          padding: 16px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
        }
        .adminConfigEndpointHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .adminConfigEndpointHeader strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }
        .adminConfigEndpointStatus {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          margin-left: 8px;
        }
        .adminConfigEndpointStatus-enabled {
          background: #d4edda;
          color: #155724;
        }
        .adminConfigEndpointStatus-disabled {
          background: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.6);
        }
        .adminConfigEndpointMeta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }
        .adminConfigEndpointEvents {
          margin-top: 12px;
        }
        .adminConfigEndpointEvents strong {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .adminConfigEndpointEventsList {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .adminConfigEventType {
          font-family: monospace;
          font-size: 11px;
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .adminConfigMoreEvents {
          font-size: 11px;
          color: rgba(0, 0, 0, 0.6);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
