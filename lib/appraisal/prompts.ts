import type {
  AppraisalBrief,
  AppraisalStageKey,
  EvidenceBundle,
  ModuleOutput,
  PackageRationale,
  StrategyOutput,
  UnifiedOutput,
} from "@/lib/appraisal/types";

const SHARED_RULES = `
Use only the supplied public-site evidence and business brief.
Keep observed findings separate from inferences.
Every observed finding must cite one or more supplied evidence URLs.
Never invent traffic, ranking, backlink, conversion, lead, revenue, ROI, hiring, or competitor-performance data.
Unknown or unsupported facts must be listed as unknowns, not presented as findings.
Do not promise or guarantee rankings, traffic, leads, hires, revenue, ROI, or placement in AI answers.
Use commercial language that says strengthens, supports, reinforces, clarifies, or reduces ambiguity.
Return only the requested structured output.
`.trim();

const MODULE_FOCUS: Record<Exclude<AppraisalStageKey, "unified" | "strategy" | "proposal">, string> = {
  intent:
    "Assess intent alignment, offer/audience clarity, topic coverage, content gaps, and create priorities for a practical content plan.",
  technical:
    "Assess crawlability, canonical and sitemap signals, schema coverage, page-template consistency, response failures, and machine readability.",
  ai_search:
    "Assess entity clarity, explicit what/who/how language, extractability, answerability, service definitions, and AI/search signal consistency.",
  growth_conversion:
    "Assess conversion architecture, calls to action, commercial journey clarity, offer segmentation, decision-support content, and measurement readiness.",
  authority_trust:
    "Assess proof, case studies, testimonials, credentials, authorship, expertise, FAQ support, and authority/trust signal distribution.",
};

export function buildModulePrompt(input: {
  key: Exclude<AppraisalStageKey, "unified" | "strategy" | "proposal">;
  title: string;
  brief: AppraisalBrief;
  evidence: EvidenceBundle;
}) {
  return {
    instructions: `You are the GPTO ${input.title} appraiser.\n${SHARED_RULES}`,
    input: JSON.stringify({
      task: MODULE_FOCUS[input.key],
      requiredTitle: input.title,
      ratingRubric: {
        Weak: "Material gaps or blockers limit reliable interpretation or execution.",
        Adequate: "Core signals exist but are inconsistent, incomplete, or not coordinated.",
        Strong: "Signals are clear, consistent, well-supported, and require refinement rather than repair.",
      },
      businessBrief: input.brief,
      evidence: input.evidence,
    }),
  };
}

export function buildUnifiedPrompt(input: {
  brief: AppraisalBrief;
  modules: ModuleOutput[];
}) {
  return {
    instructions: `You synthesize the five GPTO modules into one evidence-disciplined appraisal.\n${SHARED_RULES}`,
    input: JSON.stringify({
      task: "Identify the strongest supported findings, cross-layer dependencies, blockers, unknowns, priorities, and verified delivery-complexity triggers.",
      complexityTriggerRules: {
        "multi-market": "The brief or evidence explicitly identifies multiple geographic markets.",
        "multi-offer": "The brief or evidence explicitly identifies multiple materially different offers or service lines.",
        "large-site": "The evidence shows a large or operationally complex site, not merely a weak site.",
        "advanced-telemetry": "The brief or evidence explicitly requires advanced measurement, experimentation, or telemetry.",
        "reputation-operations": "The brief or evidence explicitly requires ongoing reputation, review, or authority operations.",
      },
      businessBrief: input.brief,
      modules: input.modules,
    }),
  };
}

export function buildStrategyPrompt(input: {
  brief: AppraisalBrief;
  unified: UnifiedOutput;
  modules: ModuleOutput[];
  packageRationale: PackageRationale;
}) {
  return {
    instructions: `You create a coordinated GPTO implementation strategy from the completed appraisal.\n${SHARED_RULES}`,
    input: JSON.stringify({
      task: "Create a concise strategic thesis, objectives, coordinated workstreams, dependencies, and a practical first-90-days sequence.",
      businessBrief: input.brief,
      unifiedAppraisal: input.unified,
      modules: input.modules,
      deterministicPackageDecision: input.packageRationale,
    }),
  };
}

export function buildProposalPrompt(input: {
  brief: AppraisalBrief;
  unified: UnifiedOutput;
  strategy: StrategyOutput;
  packageRationale: PackageRationale;
}) {
  return {
    instructions: `You write the final client-facing GPTO appraisal proposal.\n${SHARED_RULES}`,
    input: JSON.stringify({
      task: "Write a clear commercial proposal grounded in the appraisal and strategy. Explain the current state, recommended approach, scope, directional outcomes, package rationale, and next step.",
      requiredClarification:
        "GPTO strengthens structural visibility conditions, authority signals, and conversion readiness. It does not independently generate or guarantee rankings, traffic, leads, hires, revenue, or ROI.",
      businessBrief: input.brief,
      unifiedAppraisal: input.unified,
      strategy: input.strategy,
      deterministicPackageDecision: input.packageRationale,
    }),
  };
}
