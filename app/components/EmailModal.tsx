"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailModal({ isOpen, onClose, onSuccess }: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Try to get audit ID from localStorage if available
      const auditId = typeof window !== "undefined" 
        ? window.localStorage.getItem("gpto_latest_audit_id") 
        : null;

      const res = await fetch("/api/audit/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email,
          auditId: auditId || undefined
        })
      });

      // Try to parse response, but don't block on errors
      try {
        const data = await res.json();
        if (!res.ok) {
          console.warn("Email submission warning:", data?.error || "Unknown error");
        }
      } catch {
        // If response parsing fails, log but continue
        console.warn("Email submission warning: Could not parse response");
      }

      // Always proceed to audit page regardless of email submission result
      onSuccess();
    } catch (err: any) {
      // Log error but still proceed
      console.warn("Email submission error:", err?.message || "Unknown error");
      // Still redirect to audit page even if there's an error
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          overflowY: "auto",
          margin: 0
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "440px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            position: "relative",
            margin: "auto",
            zIndex: 100000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "transparent",
              border: "none",
              fontSize: "24px",
              lineHeight: "1",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#999",
              padding: "4px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#f5f5f5";
                e.currentTarget.style.color = "#333";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#999";
            }}
            aria-label="Close modal"
          >
            ×
          </button>

          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: "12px",
              fontSize: "28px",
              fontWeight: 900,
              lineHeight: "1.2",
              color: "var(--brand-gray-900)"
            }}>
              Get Your Free GPTO Audit
            </h2>
            <p style={{ 
              marginBottom: 0, 
              color: "#666",
              fontSize: "16px",
              lineHeight: "1.5"
            }}>
              Enter your email address to access your free AI visibility audit.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label 
              htmlFor="email-input"
              style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--brand-gray-900)"
              }}
            >
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "2px solid #e0e0e0",
                borderRadius: "12px",
                fontSize: "16px",
                marginBottom: "16px",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-red)";
                e.currentTarget.style.outline = "none";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
              }}
            />

            {error && (
              <div style={{ 
                color: "var(--brand-red)", 
                marginBottom: "16px", 
                fontSize: "14px",
                padding: "12px",
                background: "#fff5f5",
                borderRadius: "8px",
                border: "1px solid #ffebee"
              }}>
                {error}
              </div>
            )}

            <div style={{ 
              display: "flex", 
              gap: "12px", 
              justifyContent: "flex-end",
              marginTop: "24px"
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  background: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#666",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = "#ccc";
                    e.currentTarget.style.background = "#f9f9f9";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.background = "white";
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn"
                style={{ 
                  minWidth: "140px",
                  opacity: (!email.trim() || loading) ? 0.6 : 1,
                  cursor: (!email.trim() || loading) ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Submitting..." : "Get Started"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
