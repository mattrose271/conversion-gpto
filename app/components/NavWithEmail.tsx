"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmailModal from "./EmailModal";

export default function NavWithEmail() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  function handleAuditClick(e: React.MouseEvent) {
    e.preventDefault();
    setIsModalOpen(true);
  }

  function handleModalSuccess() {
    setIsModalOpen(false);
    router.push("/audit");
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="navDesktop" aria-label="Primary navigation">
        <a href="/">HOME</a>
        <a href="/pricing">PRICING</a>
        <a href="/contact">CONTACT</a>
        <a href="/audit" className="btn navCta" onClick={handleAuditClick}>
          FREE GPTO AUDIT
        </a>
      </nav>

      {/* Mobile menu (no JS) */}
      <details className="navMobile">
        <summary aria-label="Open menu" className="burger">
          <span className="burgerIcon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </summary>

        <div className="mobilePanel" role="menu" aria-label="Mobile menu">
          <a role="menuitem" href="/">
            HOME
          </a>
          <a role="menuitem" href="/pricing">
            PRICING
          </a>
          <a role="menuitem" href="/contact">
            CONTACT
          </a>

          <a
            role="menuitem"
            href="/audit"
            className="btn mobileCta"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAuditClick(e);
            }}
          >
            FREE GPTO AUDIT
          </a>
        </div>
      </details>

      <EmailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
