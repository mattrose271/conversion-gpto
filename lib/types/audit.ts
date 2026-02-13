export type GptoTier = "Bronze" | "Silver" | "Gold";

export interface AuditInput {
  url: string;
  email: string;
  focusArea?: string;
  competitors?: string[];
}

export type AxisRating = "Weak" | "Adequate" | "Strong";

export interface AuthoritySignals {
  testimonials: boolean;
  caseStudies: boolean;
  press: boolean;
  certifications: boolean;
}

export interface StructuralSignals {
  serviceSegmentation: "consistent" | "partial" | "inconsistent";
  schemaTypes: string[];
  schemaCoverage: "broad" | "partial" | "limited";
  faqCoverage: "distributed" | "centralized" | "minimal" | "none";
  authoritySignals: AuthoritySignals;
  messagingClarity: "clear" | "mixed" | "unclear";
}

export interface AuditResult {
  id: string;
  createdAtISO: string;
  input: AuditInput;
  scores: {
    aiClarity: number;
    structure: number;
    contentDepth: number;
    technical: number;
    overall: number;
  };
  axisRatings: {
    technicalReadiness: AxisRating;
    conversionArchitecture: AxisRating;
    contentSignalQuality: AxisRating;
    growthReadiness: AxisRating;
  };
  primarySignals: StructuralSignals;
  competitorSignals?: StructuralSignals[];
  recommendedTier: GptoTier;
}

export const FOCUS_AREA_OPTIONS = [
  "Improve Our AI Visibility",
  "Strengthen Our Website Structure for AI",
  "Clarify Our Messaging & Positioning",
  "Improve Our Competitive Position",
] as const;

export type FocusAreaOption = (typeof FOCUS_AREA_OPTIONS)[number];
