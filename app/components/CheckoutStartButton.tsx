"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import CheckoutLeadModal from "@/app/pricing/CheckoutLeadModal";
import { normalizePaymentTier, type PaymentTier } from "@/lib/payments";

interface CheckoutStartButtonProps {
  tier: string | null | undefined;
  website?: string | null | undefined;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export default function CheckoutStartButton({
  tier,
  website,
  label = "Get Started",
  className = "btn",
  style,
}: CheckoutStartButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PaymentTier | null>(null);
  const resolvedTier = useMemo(() => normalizePaymentTier(tier), [tier]);

  const contactHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (tier) qs.set("tier", String(tier));
    if (website) qs.set("url", String(website));
    return `/contact?${qs.toString()}`;
  }, [tier, website]);

  function handleClick() {
    if (!resolvedTier) {
      window.location.href = contactHref;
      return;
    }
    setSelectedTier(resolvedTier);
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        style={{ border: "none", cursor: "pointer", ...style }}
      >
        {label}
      </button>

      <CheckoutLeadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tier={selectedTier}
        website={website || ""}
      />
    </>
  );
}
