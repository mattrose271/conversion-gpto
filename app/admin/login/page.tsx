"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch("/api/admin/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          const redirect = searchParams.get("redirect") || "/admin";
          router.push(redirect);
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      const redirect = searchParams.get("redirect") || "/admin";
      router.push(redirect);
    } catch (err: any) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="adminLogin">
      <div className="adminLoginCard">
        <h1>Admin Login</h1>
        <p className="adminLoginSubtitle">Stripe Webhook Admin Portal</p>

        <form onSubmit={handleSubmit} className="adminLoginForm">
          {error && <div className="adminLoginError">{error}</div>}

          <div className="adminLoginField">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="adminLoginField">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="adminLoginButton">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .adminLogin {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f9fafb;
        }
        .adminLoginCard {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 40px;
          width: 100%;
          max-width: 400px;
        }
        .adminLoginCard h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 900;
          color: var(--brand-red, #c20f2c);
        }
        .adminLoginSubtitle {
          margin: 0 0 32px 0;
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }
        .adminLoginForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .adminLoginError {
          padding: 12px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          color: #c00;
          font-size: 14px;
        }
        .adminLoginField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .adminLoginField label {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.8);
        }
        .adminLoginField input {
          padding: 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        .adminLoginField input:focus {
          outline: none;
          border-color: var(--brand-red, #c20f2c);
        }
        .adminLoginField input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        .adminLoginButton {
          padding: 12px 24px;
          background: var(--brand-red, #c20f2c);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .adminLoginButton:hover:not(:disabled) {
          background: var(--brand-red-dark, #a00d24);
        }
        .adminLoginButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="adminLogin">
        <div className="adminLoginCard">
          <h1>Admin Login</h1>
          <p className="adminLoginSubtitle">Loading...</p>
        </div>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
