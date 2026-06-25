import { z } from "zod";
import type { CanonicalTier } from "@/lib/tiers";

export const APPRAISAL_STAGE_DEFINITIONS = [
  { key: "intent", order: 1, title: "Intent Intelligence & Content Plan" },
  { key: "technical", order: 2, title: "Technical Readiness" },
  { key: "ai_search", order: 3, title: "AI/Search Signal Clarity" },
  { key: "growth_conversion", order: 4, title: "Growth Readiness & Conversion Architecture" },
  { key: "authority_trust", order: 5, title: "Content Authority & Trust Signals" },
  { key: "unified", order: 6, title: "Unified Five-Layer Appraisal" },
  { key: "strategy", order: 7, title: "Knit-Together Strategy" },
  { key: "proposal", order: 8, title: "Written Proposal" },
] as const;

export type AppraisalStageKey = (typeof APPRAISAL_STAGE_DEFINITIONS)[number]["key"];
export type AppraisalStatus = "queued" | "running" | "completed" | "failed";
export type StageStatus = "pending" | "running" | "completed" | "failed";

export const AppraisalBriefSchema = z.object({
  primaryOffer: z.string().trim().min(3).max(500),
  targetAudience: z.string().trim().min(3).max(500),
  marketGeography: z.string().trim().min(2).max(300),
  commercialGoal: z.string().trim().min(3).max(500),
  focusArea: z.string().trim().max(300).nullable().optional(),
  competitors: z.array(z.string().url()).max(5).default([]),
});

export type AppraisalBrief = z.infer<typeof AppraisalBriefSchema>;

export const PageEvidenceSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  headings: z.array(z.string()).max(20),
  excerpt: z.string().max(2500),
  schemaTypes: z.array(z.string()).max(30),
  hasFaq: z.boolean(),
  authoritySignals: z.array(z.string()).max(20),
  serviceSignals: z.array(z.string()).max(20),
  ctaSignals: z.array(z.string()).max(20),
  status: z.number().int(),
});

export const EvidenceBundleSchema = z.object({
  websiteUrl: z.string().url(),
  scannedAt: z.string(),
  scannedPages: z.number().int().nonnegative(),
  usedSitemap: z.boolean(),
  pages: z.array(PageEvidenceSchema).max(40),
  structuralSignals: z.unknown().nullable().optional(),
  competitorSignals: z.array(z.unknown()).max(5).default([]),
});

export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

export const ReadinessRatingSchema = z.enum(["Weak", "Adequate", "Strong"]);
export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

// OpenAI Structured Outputs rejects JSON Schema's `format: "uri"`, which
// z.string().url() emits. A pattern keeps evidence links constrained to safe
// web URLs while remaining compatible with the response-format schema.
export const EvidenceUrlSchema = z
  .string()
  .max(2048)
  .regex(/^https?:\/\/[^\s]+$/, "Evidence URLs must be absolute HTTP(S) URLs.");

export const ObservedFindingSchema = z.object({
  summary: z.string().min(1).max(700),
  evidenceUrls: z.array(EvidenceUrlSchema).max(8),
});

export const InferredFindingSchema = z.object({
  summary: z.string().min(1).max(700),
  confidence: ConfidenceSchema,
  basis: z.string().min(1).max(700),
});

export const ModuleOutputSchema = z.object({
  title: z.string().min(1).max(160),
  rating: ReadinessRatingSchema,
  summary: z.string().min(1).max(1600),
  observedFindings: z.array(ObservedFindingSchema).max(8),
  inferredFindings: z.array(InferredFindingSchema).max(6),
  blockers: z.array(z.string().min(1).max(500)).max(6),
  unknowns: z.array(z.string().min(1).max(500)).max(6),
  priorities: z.array(z.string().min(1).max(500)).max(8),
  packageImplications: z.array(z.string().min(1).max(500)).max(6),
});

export type ModuleOutput = z.infer<typeof ModuleOutputSchema>;

export const ComplexityTriggerSchema = z.enum([
  "multi-market",
  "multi-offer",
  "large-site",
  "advanced-telemetry",
  "reputation-operations",
]);

export const UnifiedOutputSchema = z.object({
  title: z.literal("Unified Five-Layer Appraisal"),
  overallRating: ReadinessRatingSchema,
  executiveSummary: z.string().min(1).max(2400),
  strongestFindings: z.array(ObservedFindingSchema).max(10),
  crossLayerDependencies: z.array(
    z.object({
      summary: z.string().min(1).max(700),
      critical: z.boolean(),
      evidenceUrls: z.array(EvidenceUrlSchema).max(8),
    })
  ).max(8),
  blockers: z.array(z.string().min(1).max(500)).max(8),
  unknowns: z.array(z.string().min(1).max(500)).max(8),
  priorities: z.array(z.string().min(1).max(500)).max(10),
  complexityTriggers: z.array(ComplexityTriggerSchema).max(5),
});

export type UnifiedOutput = z.infer<typeof UnifiedOutputSchema>;

export const PackageRationaleSchema = z.object({
  tier: z.enum(["Foundation", "Growth", "Elite"]),
  whyThisTier: z.array(z.string().min(1).max(500)).min(1).max(6),
  whyNotLower: z.array(z.string().min(1).max(500)).max(5),
  whyNotHigher: z.array(z.string().min(1).max(500)).max(5),
});

export type PackageRationale = z.infer<typeof PackageRationaleSchema>;

export const StrategyOutputSchema = z.object({
  title: z.literal("Knit-Together Strategy"),
  strategicThesis: z.string().min(1).max(2200),
  objectives: z.array(z.string().min(1).max(500)).min(1).max(8),
  workstreams: z.array(
    z.object({
      name: z.string().min(1).max(160),
      rationale: z.string().min(1).max(900),
      actions: z.array(z.string().min(1).max(500)).min(1).max(8),
      dependencies: z.array(z.string().min(1).max(400)).max(6),
    })
  ).min(1).max(8),
  first90Days: z.array(
    z.object({
      phase: z.string().min(1).max(120),
      focus: z.string().min(1).max(700),
      deliverables: z.array(z.string().min(1).max(500)).max(8),
    })
  ).min(1).max(4),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

export const ProposalOutputSchema = z.object({
  title: z.literal("GPTO Appraisal & Proposal"),
  executiveSummary: z.string().min(1).max(2400),
  currentState: z.string().min(1).max(2200),
  recommendedApproach: z.string().min(1).max(2600),
  scope: z.array(z.string().min(1).max(600)).min(1).max(12),
  expectedDirection: z.array(z.string().min(1).max(600)).min(1).max(8),
  importantClarification: z.string().min(1).max(900),
  nextStep: z.string().min(1).max(700),
});

export type ProposalOutput = z.infer<typeof ProposalOutputSchema>;

export type AppraisalStageOutput =
  | ModuleOutput
  | UnifiedOutput
  | StrategyOutput
  | ProposalOutput;

export type PublicAppraisalStage = {
  key: AppraisalStageKey;
  order: number;
  title: string;
  status: StageStatus;
  output: AppraisalStageOutput | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type PublicAppraisal = {
  status: AppraisalStatus;
  websiteUrl: string;
  email: string;
  brief: AppraisalBrief;
  recommendedTier: CanonicalTier | null;
  packageRationale: PackageRationale | null;
  stages: PublicAppraisalStage[];
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  error: string | null;
};
