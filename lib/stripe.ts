import Stripe from "stripe";

let cachedStripe: Stripe | null = null;
let cachedKey: string | null = null;

/**
 * Returns the Stripe secret key.
 * - STRIPE_USE_SANDBOX=true: always use STRIPE_SECRET_KEY (sandbox)
 * - Production (NEXT_PUBLIC_ENV=production): STRIPE_LIVE_SECRET_KEY if set, else STRIPE_SECRET_KEY
 * - Otherwise: STRIPE_SECRET_KEY (sandbox)
 */
function getStripeSecretKey(): string {
  const useSandbox = process.env.STRIPE_USE_SANDBOX === "true";
  const testKey = process.env.STRIPE_SECRET_KEY;
  const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;
  const isProduction = process.env.NEXT_PUBLIC_ENV === "production";

  if (useSandbox) {
    if (testKey) return testKey;
    throw new Error("STRIPE_USE_SANDBOX is true but STRIPE_SECRET_KEY is not set.");
  }
  if (isProduction && liveKey) return liveKey;
  if (testKey) return testKey;
  throw new Error(
    "Stripe is not configured. Set STRIPE_SECRET_KEY in .env (sandbox key is enough to start)."
  );
}

export function getStripeClient(): Stripe {
  const stripeKey = getStripeSecretKey();

  if (!cachedStripe || cachedKey !== stripeKey) {
    cachedStripe = new Stripe(stripeKey);
    cachedKey = stripeKey;
  }

  return cachedStripe;
}
