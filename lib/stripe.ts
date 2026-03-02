import Stripe from "stripe";
import { resolveStripeMode, StripeMode } from "./stripe-mode";

let cachedStripe: Stripe | null = null;
let cachedKey: string | null = null;

/**
 * Returns the Stripe secret key.
 * - STRIPE_USE_LIVE=true or NEXT_PUBLIC_ENV=production: use STRIPE_LIVE_SECRET_KEY (production)
 * - STRIPE_USE_LIVE=false: force test mode even in production
 * - Otherwise: use STRIPE_SECRET_KEY (sandbox)
 */
function getStripeSecretKey(mode: StripeMode = "auto"): string {
  const resolvedMode = resolveStripeMode(mode);
  const testKey = process.env.STRIPE_SECRET_KEY;
  const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;

  if (resolvedMode === "live") {
    if (liveKey) return liveKey;
    throw new Error("Production mode requires STRIPE_LIVE_SECRET_KEY. Set it in .env");
  }
  if (testKey) return testKey;
  throw new Error(
    "Stripe is not configured. Set STRIPE_SECRET_KEY in .env (sandbox key is enough to start)."
  );
}

export function getStripeClient(mode: StripeMode = "auto"): Stripe {
  const stripeKey = getStripeSecretKey(mode);

  if (!cachedStripe || cachedKey !== stripeKey) {
    cachedStripe = new Stripe(stripeKey);
    cachedKey = stripeKey;
  }

  return cachedStripe;
}
