"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setEmail(data.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/webhooks", label: "Webhook Events" },
    { href: "/admin/payment-leads", label: "Payment Leads" },
    { href: "/admin/test-webhook", label: "Test Webhook" },
    { href: "/admin/config", label: "Configuration" },
  ];

  return (
    <nav className="adminNav">
      <div className="adminNavContainer">
        <div className="adminNavBrand">
          <a href="/admin">GPTO Admin</a>
        </div>
        <div className="adminNavLinks">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <a key={item.href} href={item.href} className={isActive ? "active" : ""}>
                {item.label}
              </a>
            );
          })}
        </div>
        <div className="adminNavUser">
          {email && <span className="adminNavUsername">{email}</span>}
          <button onClick={handleLogout} className="adminNavLogout">
            Logout
          </button>
        </div>
      </div>
      <style jsx>{`
        .adminNav {
          background: white;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0;
        }
        .adminNavContainer {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 24px;
          height: 60px;
        }
        .adminNavBrand {
          font-weight: 900;
          font-size: 18px;
        }
        .adminNavBrand a {
          text-decoration: none;
          color: var(--brand-red, #c20f2c);
        }
        .adminNavLinks {
          display: flex;
          gap: 8px;
          flex: 1;
        }
        .adminNavLinks a {
          padding: 8px 16px;
          text-decoration: none;
          color: rgba(0, 0, 0, 0.7);
          font-weight: 600;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .adminNavLinks a:hover {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(0, 0, 0, 0.9);
        }
        .adminNavLinks a.active {
          background: rgba(194, 15, 44, 0.1);
          color: var(--brand-red, #c20f2c);
        }
        .adminNavUser {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .adminNavUsername {
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }
        .adminNavLogout {
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }
        .adminNavLogout:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
          .adminNavContainer {
            flex-wrap: wrap;
            height: auto;
            padding: 12px 16px;
          }
          .adminNavLinks {
            order: 3;
            width: 100%;
            flex-wrap: wrap;
          }
          .adminNavUser {
            margin-left: auto;
          }
        }
      `}</style>
    </nav>
  );
}
