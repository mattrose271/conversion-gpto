import { normalizeTier, type CanonicalTier } from "@/lib/tiers";

export type Tier = CanonicalTier;

export const TIER_PRICING: Record<Tier, number> = {
  Foundation: 999,
  Growth: 2499,
  Elite: 4999,
};

export interface TierDeliverable {
  tier: Tier;
  title: string;
  price: string;
  priceNote?: string;
  subtitle: string;
  deliverables: string[];
  calendlyUrl?: string;
}

export const tierDeliverables: TierDeliverable[] = [
  {
    tier: "Foundation",
    title: "Foundation",
    price: "$999",
    priceNote: "Per month pricing. Minimum 3-month subscription.",
    subtitle: "Corrects core issues and establishes your AI-visibility performance baseline.",
    deliverables: [
      "Essential schema markup added to your most important pages.",
      "AI-powered technical + content audit with clear action steps.",
      "Refinement of your top on-page messaging.",
      "Competitor snapshot covering search signals and basic sentiment.",
      "Content recommendations: 4–6 content ideas monthly.",
      "A clean PDF scorecard summarizing findings and opportunities."
    ]
  },
  {
    tier: "Growth",
    title: "Growth",
    price: "$2,499",
    priceNote: "Per month pricing. Minimum 3-month subscription.",
    subtitle: "Strengthens your authority and provides competitive insight.",
    deliverables: [
      "Full-site schema implementation (Organization, Service/Product, Local, FAQ).",
      "Five-competitor analysis revealing search gaps, strengths, and opportunities.",
      "Structured authority + content improvement plan built from GPTO's framework.",
      "Lightweight telemetry module to track engagement on key pages.",
      "Quarterly re-audit to measure progress and adjust strategy."
    ]
  },
  {
    tier: "Elite",
    title: "Elite",
    price: "$4,999",
    priceNote: "Per month pricing. Minimum 3-month subscription.",
    subtitle: "Automates optimization and delivers advanced competitive intelligence.",
    deliverables: [
      "Complete real-time optimization for live search, intent, and behavior signals.",
      "Dynamic schema and adaptive SEO updated based on real-time data.",
      "10-competitor, multi-market authority + sentiment mapping.",
      "AI-supported reputation and link-building guidance.",
      "Monthly telemetry insights + executive performance dashboard."
    ]
  }
];

export function getTierDeliverables(tier: Tier | string | null | undefined): TierDeliverable | null {
  const normalizedTier = normalizeTier(tier);
  return normalizedTier
    ? tierDeliverables.find((td) => td.tier === normalizedTier) || null
    : null;
}
