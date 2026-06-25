import { FatalError, RetryableError } from "workflow";
import { db } from "@/lib/db";
import {
  ModuleOutputSchema,
  ProposalOutputSchema,
  StrategyOutputSchema,
  UnifiedOutputSchema,
  type AppraisalBrief,
  type AppraisalStageKey,
  type EvidenceBundle,
  type ModuleOutput,
  type PackageRationale,
  type ProposalOutput,
  type StrategyOutput,
  type UnifiedOutput,
} from "@/lib/appraisal/types";
import {
  buildModulePrompt,
  buildProposalPrompt,
  buildStrategyPrompt,
  buildUnifiedPrompt,
} from "@/lib/appraisal/prompts";
import {
  generateStructuredAppraisalOutput,
  getAppraisalModel,
} from "@/lib/appraisal/openai";
import { selectAppraisalPackage } from "@/lib/appraisal/package-selection";
import { sendAppraisalCompletedEmail } from "@/lib/appraisal/email";

const PROMPT_VERSION = "gpto-appraisal-v1";

export async function appraisalWorkflow(
  appraisalId: string
): Promise<{ appraisalId: string; tier: string }> {
  "use workflow";

  await beginAppraisal(appraisalId);

  const intent = await runModuleStage(appraisalId, "intent");
  const technical = await runModuleStage(appraisalId, "technical");
  const aiSearch = await runModuleStage(appraisalId, "ai_search");
  const growthConversion = await runModuleStage(appraisalId, "growth_conversion");
  const authorityTrust = await runModuleStage(appraisalId, "authority_trust");
  const modules = [intent, technical, aiSearch, growthConversion, authorityTrust];

  const unified = await runUnifiedStage(appraisalId, modules);
  const packageRationale = await determinePackage(appraisalId, modules, unified);
  const strategy = await runStrategyStage(appraisalId, modules, unified, packageRationale);
  await runProposalStage(appraisalId, unified, strategy, packageRationale);
  await completeAppraisal(appraisalId, packageRationale);

  return { appraisalId, tier: packageRationale.tier };
}

async function beginAppraisal(appraisalId: string) {
  "use step";
  console.log(`[appraisal] START appraisalId=${appraisalId}`);
  await db.appraisal.update({
    where: { id: appraisalId },
    data: { status: "running", startedAt: new Date(), error: null },
  });
}

async function loadContext(appraisalId: string): Promise<{
  brief: AppraisalBrief;
  evidence: EvidenceBundle;
}> {
  const appraisal = await db.appraisal.findUnique({
    where: { id: appraisalId },
    select: { brief: true, evidence: true },
  });
  if (!appraisal) throw new FatalError(`Appraisal ${appraisalId} was not found.`);
  return {
    brief: appraisal.brief as AppraisalBrief,
    evidence: appraisal.evidence as EvidenceBundle,
  };
}

async function readCompletedStage<T>(
  appraisalId: string,
  stageKey: AppraisalStageKey,
  parser: { parse(value: unknown): T }
): Promise<T | null> {
  const stage = await db.appraisalStage.findUnique({
    where: { appraisalId_stageKey: { appraisalId, stageKey } },
    select: { status: true, output: true },
  });
  return stage?.status === "completed" && stage.output ? parser.parse(stage.output) : null;
}

async function markStageRunning(
  appraisalId: string,
  stageKey: AppraisalStageKey,
  input: unknown
) {
  await db.appraisalStage.update({
    where: { appraisalId_stageKey: { appraisalId, stageKey } },
    data: {
      status: "running",
      input: input as any,
      output: undefined,
      error: null,
      modelVersion: getAppraisalModel(),
      promptVersion: PROMPT_VERSION,
      startedAt: new Date(),
      completedAt: null,
    },
  });
}

async function markStageCompleted(
  appraisalId: string,
  stageKey: AppraisalStageKey,
  output: unknown
) {
  await db.appraisalStage.update({
    where: { appraisalId_stageKey: { appraisalId, stageKey } },
    data: {
      status: "completed",
      output: output as any,
      error: null,
      completedAt: new Date(),
    },
  });
}

async function handleStageError(
  appraisalId: string,
  stageKey: AppraisalStageKey,
  error: unknown
): Promise<never> {
  const message = error instanceof Error ? error.message : "Appraisal stage failed.";
  const status = Number((error as any)?.status || 0);
  const retryable = status === 408 || status === 409 || status === 429 || status >= 500;

  await db.appraisalStage.update({
    where: { appraisalId_stageKey: { appraisalId, stageKey } },
    data: {
      status: retryable ? "pending" : "failed",
      error: message.slice(0, 2000),
      completedAt: retryable ? null : new Date(),
    },
  });

  if (retryable) {
    console.warn(`[appraisal] RETRY appraisalId=${appraisalId} stage=${stageKey} error=${message}`);
    throw new RetryableError(message, { retryAfter: status === 429 ? "30s" : "5s" });
  }

  await db.appraisal.update({
    where: { id: appraisalId },
    data: { status: "failed", error: message.slice(0, 2000), completedAt: new Date() },
  });
  console.error(`[appraisal] FAIL appraisalId=${appraisalId} stage=${stageKey} error=${message}`);
  throw new FatalError(message);
}

async function runModuleStage(
  appraisalId: string,
  stageKey: "intent" | "technical" | "ai_search" | "growth_conversion" | "authority_trust"
): Promise<ModuleOutput> {
  "use step";
  console.log(`[appraisal:${stageKey}] START appraisalId=${appraisalId}`);
  const completed = await readCompletedStage(appraisalId, stageKey, ModuleOutputSchema);
  if (completed) {
    console.log(`[appraisal:${stageKey}] REUSE appraisalId=${appraisalId}`);
    return completed;
  }

  try {
    const { brief, evidence } = await loadContext(appraisalId);
    const stage = await db.appraisalStage.findUniqueOrThrow({
      where: { appraisalId_stageKey: { appraisalId, stageKey } },
      select: { title: true },
    });
    await markStageRunning(appraisalId, stageKey, {
      brief,
      evidenceReference: "appraisals.evidence",
    });
    const prompt = buildModulePrompt({ key: stageKey, title: stage.title, brief, evidence });
    const output = await generateStructuredAppraisalOutput({
      schema: ModuleOutputSchema,
      schemaName: `gpto_${stageKey}_module`,
      instructions: prompt.instructions,
      content: prompt.input,
    });
    await markStageCompleted(appraisalId, stageKey, output);
    console.log(`[appraisal:${stageKey}] DONE appraisalId=${appraisalId}`);
    return output;
  } catch (error) {
    return handleStageError(appraisalId, stageKey, error);
  }
}

async function runUnifiedStage(
  appraisalId: string,
  modules: ModuleOutput[]
): Promise<UnifiedOutput> {
  "use step";
  const stageKey = "unified";
  console.log(`[appraisal:${stageKey}] START appraisalId=${appraisalId}`);
  const completed = await readCompletedStage(appraisalId, stageKey, UnifiedOutputSchema);
  if (completed) return completed;

  try {
    const { brief } = await loadContext(appraisalId);
    await markStageRunning(appraisalId, stageKey, { brief, modules });
    const prompt = buildUnifiedPrompt({ brief, modules });
    const output = await generateStructuredAppraisalOutput({
      schema: UnifiedOutputSchema,
      schemaName: "gpto_unified_appraisal",
      instructions: prompt.instructions,
      content: prompt.input,
    });
    await markStageCompleted(appraisalId, stageKey, output);
    console.log(`[appraisal:${stageKey}] DONE appraisalId=${appraisalId}`);
    return output;
  } catch (error) {
    return handleStageError(appraisalId, stageKey, error);
  }
}

async function determinePackage(
  appraisalId: string,
  modules: ModuleOutput[],
  unified: UnifiedOutput
): Promise<PackageRationale> {
  "use step";
  const packageRationale = selectAppraisalPackage(modules, unified);
  await db.appraisal.update({
    where: { id: appraisalId },
    data: {
      recommendedTier: packageRationale.tier,
      packageRationale: packageRationale as any,
    },
  });
  return packageRationale;
}

async function runStrategyStage(
  appraisalId: string,
  modules: ModuleOutput[],
  unified: UnifiedOutput,
  packageRationale: PackageRationale
): Promise<StrategyOutput> {
  "use step";
  const stageKey = "strategy";
  console.log(`[appraisal:${stageKey}] START appraisalId=${appraisalId}`);
  const completed = await readCompletedStage(appraisalId, stageKey, StrategyOutputSchema);
  if (completed) return completed;

  try {
    const { brief } = await loadContext(appraisalId);
    await markStageRunning(appraisalId, stageKey, {
      brief,
      unified,
      moduleRatings: modules.map(({ title, rating }) => ({ title, rating })),
      packageRationale,
    });
    const prompt = buildStrategyPrompt({ brief, unified, modules, packageRationale });
    const output = await generateStructuredAppraisalOutput({
      schema: StrategyOutputSchema,
      schemaName: "gpto_knit_together_strategy",
      instructions: prompt.instructions,
      content: prompt.input,
    });
    await markStageCompleted(appraisalId, stageKey, output);
    console.log(`[appraisal:${stageKey}] DONE appraisalId=${appraisalId}`);
    return output;
  } catch (error) {
    return handleStageError(appraisalId, stageKey, error);
  }
}

async function runProposalStage(
  appraisalId: string,
  unified: UnifiedOutput,
  strategy: StrategyOutput,
  packageRationale: PackageRationale
): Promise<ProposalOutput> {
  "use step";
  const stageKey = "proposal";
  console.log(`[appraisal:${stageKey}] START appraisalId=${appraisalId}`);
  const completed = await readCompletedStage(appraisalId, stageKey, ProposalOutputSchema);
  if (completed) return completed;

  try {
    const { brief } = await loadContext(appraisalId);
    await markStageRunning(appraisalId, stageKey, {
      brief,
      unified,
      strategy,
      packageRationale,
    });
    const prompt = buildProposalPrompt({ brief, unified, strategy, packageRationale });
    const output = await generateStructuredAppraisalOutput({
      schema: ProposalOutputSchema,
      schemaName: "gpto_written_proposal",
      instructions: prompt.instructions,
      content: prompt.input,
    });
    await markStageCompleted(appraisalId, stageKey, output);
    console.log(`[appraisal:${stageKey}] DONE appraisalId=${appraisalId}`);
    return output;
  } catch (error) {
    return handleStageError(appraisalId, stageKey, error);
  }
}

async function completeAppraisal(
  appraisalId: string,
  packageRationale: PackageRationale
) {
  "use step";
  const appraisal = await db.appraisal.update({
    where: { id: appraisalId },
    data: {
      status: "completed",
      recommendedTier: packageRationale.tier,
      packageRationale: packageRationale as any,
      modelVersion: getAppraisalModel(),
      completedAt: new Date(),
      error: null,
    },
    select: { email: true, url: true },
  });

  try {
    await sendAppraisalCompletedEmail({
      email: appraisal.email,
      websiteUrl: appraisal.url,
      packageRationale,
    });
  } catch (error) {
    console.error(`[appraisal] completion email failed appraisalId=${appraisalId}`, error);
  }
  console.log(`[appraisal] DONE appraisalId=${appraisalId} tier=${packageRationale.tier}`);
}
