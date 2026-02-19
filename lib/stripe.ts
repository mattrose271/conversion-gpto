import Stripe from "stripe";

let cachedStripe: Stripe | null = null;
let cachedKey: string | null = null;

/**
 * Returns the Stripe secret key.
 * - STRIPE_USE_LIVE=true: use STRIPE_LIVE_SECRET_KEY (real payments)
 * - Otherwise: always use STRIPE_SECRET_KEY (sandbox) — default for dev and production until you opt in
 */
function getStripeSecretKey(): string {
  const useLive = process.env.STRIPE_USE_LIVE === "true";
  const testKey = process.env.STRIPE_SECRET_KEY;
  const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;

  if (useLive) {
    if (liveKey) return liveKey;
    throw new Error("STRIPE_USE_LIVE is true but STRIPE_LIVE_SECRET_KEY is not set.");
  }
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
