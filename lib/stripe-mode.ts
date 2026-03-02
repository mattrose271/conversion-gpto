import { cookies } from "next/headers";

export const STRIPE_MODE_COOKIE = "gpto_stripe_mode";

export type StripeMode = "auto" | "test" | "live";

function normalizeMode(value: string | undefined | null): StripeMode {
  if (value === "test" || value === "live") return value;
  return "auto";
}

export function getDefaultStripeMode(): "test" | "live" {
  const explicitLive = process.env.STRIPE_USE_LIVE === "true";
  const explicitTest = process.env.STRIPE_USE_LIVE === "false";
  const isProduction = process.env.NEXT_PUBLIC_ENV === "production";

  if (explicitLive || (isProduction && !explicitTest)) return "live";
  return "test";
}

export function resolveStripeMode(mode: StripeMode): "live" | "test" {
  if (mode === "live" || mode === "test") return mode;
  return getDefaultStripeMode();
}

export async function getStripeModeFromCookie(): Promise<StripeMode> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STRIPE_MODE_COOKIE)?.value;
  return normalizeMode(raw);
}

export function parseStripeMode(value: unknown): StripeMode {
  return normalizeMode(typeof value === "string" ? value : undefined);
}
