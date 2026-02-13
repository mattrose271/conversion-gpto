"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FOCUS_AREA_OPTIONS } from "@/lib/types/audit";

const MAX_COMPETITORS = 5;
const COMPETITOR_URL_REGEX = /^https?:\/\/.+/i;

export interface AuditPrepData {
  focusArea: string | null;
  competitors: string[];
}

interface AuditPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: AuditPrepData) => void;
}

function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export default function AuditPrepModal({ isOpen, onClose, onSuccess }: AuditPrepModalProps) {
  const [focusArea, setFocusArea] = useState<string>("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("gpto_focus_area") : null;
      if (stored) setFocusArea(stored);
      const storedComp = typeof window !== "undefined" ? window.localStorage.getItem("gpto_competitors") : null;
      if (storedComp) {
        try {
          const parsed = JSON.parse(storedComp) as string[];
          if (Array.isArray(parsed)) setCompetitors(parsed.slice(0, MAX_COMPETITORS));
        } catch {}
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  function addCompetitor() {
    const url = normalizeUrl(competitorInput);
    if (!url || competitors.length >= MAX_COMPETITORS) return;
    try {
      new URL(url);
    } catch {
      return;
    }
    if (competitors.some((c) => c.toLowerCase() === url.toLowerCase())) return;
    const next = [...competitors, url];
    setCompetitors(next);
    setCompetitorInput("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gpto_competitors", JSON.stringify(next));
    }
  }

  function removeCompetitor(index: number) {
    const next = competitors.filter((_, i) => i !== index);
    setCompetitors(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gpto_competitors", JSON.stringify(next));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data: AuditPrepData = {
        focusArea: focusArea.trim() || null,
        competitors: [...competitors],
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("gpto_focus_area", data.focusArea || "");
        window.localStorage.setItem("gpto_competitors", JSON.stringify(data.competitors));
      }
      onSuccess(data);
    } finally {
      setLoading(false);
    }
  }

  const modalContent = (
    <>
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
          margin: 0,
        }}
        onClick={onClose}
      >
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
            zIndex: 100000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
            }}
            aria-label="Close modal"
          >
            ×
          </button>

          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "12px",
                fontSize: "24px",
                fontWeight: 900,
                lineHeight: "1.2",
                color: "var(--brand-gray-900)",
              }}
            >
              Optional: Focus Area & Competitors
            </h2>
            <p
              style={{
                marginBottom: 0,
                color: "#666",
                fontSize: "15px",
                lineHeight: "1.5",
              }}
            >
              Help us tailor your audit. Select a focus area and optionally add competitor URLs (max 5) for structural context only.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="focus-area"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--brand-gray-900)",
              }}
            >
              Focus Area
            </label>
            <select
              id="focus-area"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "2px solid #e0e0e0",
                borderRadius: "12px",
                fontSize: "16px",
                marginBottom: "20px",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select...</option>
              {FOCUS_AREA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <label
              htmlFor="competitor-input"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--brand-gray-900)",
              }}
            >
              Competitor URLs (optional, max {MAX_COMPETITORS})
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                id="competitor-input"
                type="url"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                placeholder="https://competitor.com"
                disabled={loading || competitors.length >= MAX_COMPETITORS}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={addCompetitor}
                disabled={loading || competitors.length >= MAX_COMPETITORS || !competitorInput.trim()}
                className="btn alt"
                style={{ minWidth: "80px" }}
              >
                Add
              </button>
            </div>
            {competitors.length > 0 && (
              <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
                {competitors.map((url, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "#f9f9f9",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                    <button
                      type="button"
                      onClick={() => removeCompetitor(i)}
                      disabled={loading}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#999",
                        cursor: "pointer",
                        padding: "4px",
                        fontSize: "18px",
                      }}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                marginTop: "24px",
              }}
            >
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
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn"
                style={{ minWidth: "140px" }}
              >
                {loading ? "Submitting..." : "Run Audit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
