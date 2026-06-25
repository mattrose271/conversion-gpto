import type { CanonicalTier } from "@/lib/tiers";
import type {
  ModuleOutput,
  PackageRationale,
  UnifiedOutput,
} from "@/lib/appraisal/types";

export function selectAppraisalPackage(
  modules: ModuleOutput[],
  unified: UnifiedOutput
): PackageRationale {
  const weakCount = modules.filter((module) => module.rating === "Weak").length;
  const belowStrongCount = modules.filter((module) => module.rating !== "Strong").length;
  const criticalDependencies = unified.crossLayerDependencies.filter((item) => item.critical);
  const complexityCount = new Set(unified.complexityTriggers).size;

  const needsGrowth =
    weakCount >= 2 || belowStrongCount >= 3 || criticalDependencies.length > 0;
  const tier: CanonicalTier =
    needsGrowth && complexityCount >= 2
      ? "Elite"
      : needsGrowth
        ? "Growth"
        : "Foundation";

  const whyThisTier: string[] = [];
  if (weakCount) whyThisTier.push(`${weakCount} appraisal layer${weakCount === 1 ? " is" : "s are"} rated Weak.`);
  if (belowStrongCount) whyThisTier.push(`${belowStrongCount} of five layers require strengthening.`);
  if (criticalDependencies.length) {
    whyThisTier.push(`${criticalDependencies.length} critical cross-layer dependenc${criticalDependencies.length === 1 ? "y" : "ies"} must be coordinated.`);
  }
  if (complexityCount) whyThisTier.push(`${complexityCount} verified delivery complexity trigger${complexityCount === 1 ? " is" : "s are"} present.`);
  if (!whyThisTier.length) whyThisTier.push("The evidence supports a focused foundational scope.");

  const whyNotLower =
    tier === "Foundation"
      ? []
      : [
          "A lower package would not cover the number of weak or interdependent layers identified.",
          ...(criticalDependencies.length
            ? ["Critical cross-layer dependencies require coordinated implementation."]
            : []),
        ];

  const whyNotHigher =
    tier === "Elite"
      ? []
      : tier === "Growth"
        ? ["Fewer than two verified complexity triggers support avoiding the Elite scope."]
        : ["The evidence does not show enough weak layers, critical dependencies, or delivery complexity for Growth or Elite."];

  return {
    tier,
    whyThisTier: whyThisTier.slice(0, 6),
    whyNotLower: whyNotLower.slice(0, 5),
    whyNotHigher: whyNotHigher.slice(0, 5),
  };
}
