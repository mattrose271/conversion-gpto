import { db } from "@/lib/db";
import { hashAppraisalToken } from "@/lib/appraisal/token";
import {
  APPRAISAL_STAGE_DEFINITIONS,
  AppraisalBriefSchema,
  type PublicAppraisal,
  type PublicAppraisalStage,
} from "@/lib/appraisal/types";
import { normalizeTier } from "@/lib/tiers";

export async function getAppraisalRecordByToken(token: string) {
  if (!token || token.length < 24) return null;
  const appraisal = await db.appraisal.findUnique({
    where: { accessTokenHash: hashAppraisalToken(token) },
    include: { stages: { orderBy: { stageOrder: "asc" } } },
  });
  if (!appraisal || appraisal.tokenExpiresAt.getTime() <= Date.now()) return null;
  return appraisal;
}

export async function getPublicAppraisalByToken(token: string): Promise<PublicAppraisal | null> {
  const appraisal = await getAppraisalRecordByToken(token);
  if (!appraisal) return null;

  return {
    status: appraisal.status as PublicAppraisal["status"],
    websiteUrl: appraisal.url,
    email: appraisal.email,
    brief: AppraisalBriefSchema.parse(appraisal.brief),
    recommendedTier: normalizeTier(appraisal.recommendedTier),
    packageRationale: (appraisal.packageRationale as PublicAppraisal["packageRationale"]) || null,
    stages: appraisal.stages.map(
      (stage): PublicAppraisalStage => ({
        key: stage.stageKey as PublicAppraisalStage["key"],
        order: stage.stageOrder,
        title: stage.title,
        status: stage.status as PublicAppraisalStage["status"],
        output: (stage.output as PublicAppraisalStage["output"]) || null,
        error: stage.error,
        startedAt: stage.startedAt?.toISOString() || null,
        completedAt: stage.completedAt?.toISOString() || null,
      })
    ),
    createdAt: appraisal.createdAt.toISOString(),
    completedAt: appraisal.completedAt?.toISOString() || null,
    expiresAt: appraisal.tokenExpiresAt.toISOString(),
    error: appraisal.error,
  };
}

export function buildStageCreateRows() {
  return APPRAISAL_STAGE_DEFINITIONS.map((stage) => ({
    stageKey: stage.key,
    stageOrder: stage.order,
    title: stage.title,
    status: "pending",
  }));
}
