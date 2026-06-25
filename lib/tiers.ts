export const CANONICAL_TIERS = ["Foundation", "Growth", "Elite"] as const;
export type CanonicalTier = (typeof CANONICAL_TIERS)[number];

export const LEGACY_TIER_ALIASES = {
  Bronze: "Foundation",
  Silver: "Growth",
  Gold: "Elite",
} as const;

export type LegacyTier = keyof typeof LEGACY_TIER_ALIASES;
export type TierInput = CanonicalTier | LegacyTier | string;

export function normalizeTier(value: TierInput | null | undefined): CanonicalTier | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;

  if (["foundation", "bronze", "starter"].includes(normalized)) return "Foundation";
  if (["growth", "silver"].includes(normalized)) return "Growth";
  if (["elite", "gold", "pro", "enterprise"].includes(normalized)) return "Elite";
  return null;
}

export function legacyTierFor(tier: CanonicalTier): LegacyTier {
  if (tier === "Foundation") return "Bronze";
  if (tier === "Growth") return "Silver";
  return "Gold";
}

export function isCanonicalTier(value: string): value is CanonicalTier {
  return CANONICAL_TIERS.includes(value as CanonicalTier);
}
