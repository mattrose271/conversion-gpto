import { normalizeSiteUrl } from "./site-url";
import {
  CANONICAL_TIERS,
  legacyTierFor,
  normalizeTier,
  type CanonicalTier,
} from "./tiers";

export const PAYMENT_TIERS = CANONICAL_TIERS;

export type PaymentTier = CanonicalTier;

export const PAYMENT_TIER_TITLES: Record<PaymentTier, string> = {
  Foundation: "Foundation",
  Growth: "Growth",
  Elite: "Elite",
};

export function normalizePaymentTier(value: string | null | undefined): PaymentTier | null {
  return normalizeTier(value);
}

/**
 * Monthly prices in cents — sourced from package details (PricingCards).
 * Used for Stripe Checkout when no STRIPE_PRICE_* env vars are set.
 */
export const TIER_PRICES_CENTS: Record<PaymentTier, number> = {
  Foundation: 99900,
  Growth: 249900,
  Elite: 499900,
};

/** Stripe price_data for subscription — no env vars needed. */
export function getStripePriceDataForTier(tier: PaymentTier) {
  const amount = TIER_PRICES_CENTS[tier];
  return {
    currency: "usd" as const,
    product_data: {
      name: `GPTO ${tier} — Monthly`,
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
  const metadataCanonical = normalizePaymentTier(metadataTier);
  if (metadataCanonical) return metadataCanonical;

  // Fallback: amount in cents
  if (typeof amountTotal === "number") {
    if (amountTotal === TIER_PRICES_CENTS.Foundation) return "Foundation";
    if (amountTotal === TIER_PRICES_CENTS.Growth) return "Growth";
    if (amountTotal === TIER_PRICES_CENTS.Elite) return "Elite";
  }

  // Legacy: env-based price ID (optional)
  if (priceId) {
    const envVars: Record<PaymentTier, string | undefined> = {
      Foundation:
        process.env.STRIPE_PRICE_FOUNDATION_MONTHLY ||
        process.env.STRIPE_PRICE_BRONZE_MONTHLY,
      Growth:
        process.env.STRIPE_PRICE_GROWTH_MONTHLY ||
        process.env.STRIPE_PRICE_SILVER_MONTHLY,
      Elite:
        process.env.STRIPE_PRICE_ELITE_MONTHLY ||
        process.env.STRIPE_PRICE_GOLD_MONTHLY,
    };
    for (const [tier, envVal] of Object.entries(envVars)) {
      if (envVal === priceId) return tier as PaymentTier;
    }
  }

  return null;
}

export function getLegacyPaymentTier(tier: PaymentTier) {
  return legacyTierFor(tier);
}

export function getCheckoutBaseUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL);
}

export function getStripeWebhookUrl(): string {
  return `${getCheckoutBaseUrl()}/api/stripe-webhook`;
}

export function getAuditRecipients(): string[] {
  const recipientsEnv = process.env.AUDIT_EMAIL_RECIPIENTS || "jlethgo@conversionia.com";
  return recipientsEnv
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
