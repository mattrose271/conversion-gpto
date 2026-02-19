export const PAYMENT_TIERS = ["Bronze", "Silver", "Gold"] as const;

export type PaymentTier = (typeof PAYMENT_TIERS)[number];

export const PAYMENT_TIER_TITLES: Record<PaymentTier, string> = {
  Bronze: "Foundation",
  Silver: "Growth",
  Gold: "Elite",
};

/**
 * Monthly prices in cents — sourced from package details (PricingCards).
 * Used for Stripe Checkout when no STRIPE_PRICE_* env vars are set.
 */
export const TIER_PRICES_CENTS: Record<PaymentTier, number> = {
  Bronze: 99900,   // $999
  Silver: 249900,  // $2,499
  Gold: 499900,    // $4,999
};

/** Stripe price_data for subscription — no env vars needed. */
export function getStripePriceDataForTier(tier: PaymentTier) {
  const amount = TIER_PRICES_CENTS[tier];
  const title = PAYMENT_TIER_TITLES[tier];
  return {
    currency: "usd" as const,
    product_data: {
      name: `GPTO ${tier} (${title}) — Monthly`,
      description: `GPTO ${tier} package, billed monthly. Minimum 3-month commitment.`,
    },
    unit_amount: amount,
    recurring: { interval: "month" as const },
  };
}

/** Resolve tier from session metadata, amount, or price ID (when using env price IDs). */
export function getTierFromSession(
  metadataTier: string | null | undefined,
  amountTotal: number | null | undefined,
  priceId: string | null | undefined
): PaymentTier | null {
  // Prefer metadata (always set on our checkout sessions)
  if (metadataTier && ["Bronze", "Silver", "Gold"].includes(metadataTier)) {
    return metadataTier as PaymentTier;
  }

  // Fallback: amount in cents
  if (typeof amountTotal === "number") {
    if (amountTotal === TIER_PRICES_CENTS.Bronze) return "Bronze";
    if (amountTotal === TIER_PRICES_CENTS.Silver) return "Silver";
    if (amountTotal === TIER_PRICES_CENTS.Gold) return "Gold";
  }

  // Legacy: env-based price ID (optional)
  if (priceId) {
    const envVars = {
      Bronze: process.env.STRIPE_PRICE_BRONZE_MONTHLY,
      Silver: process.env.STRIPE_PRICE_SILVER_MONTHLY,
      Gold: process.env.STRIPE_PRICE_GOLD_MONTHLY,
    };
    for (const [tier, envVal] of Object.entries(envVars)) {
      if (envVal === priceId) return tier as PaymentTier;
    }
  }

  return null;
}

export function getCheckoutBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
}

export function getAuditRecipients(): string[] {
  const recipientsEnv = process.env.AUDIT_EMAIL_RECIPIENTS || "jlethgo@conversionia.com";
  return recipientsEnv
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
