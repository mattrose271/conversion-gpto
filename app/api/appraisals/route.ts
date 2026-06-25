import { NextResponse } from "next/server";
import { z } from "zod";
import { start } from "workflow/api";
import { db } from "@/lib/db";
import {
  APPRAISAL_STAGE_DEFINITIONS,
  AppraisalBriefSchema,
  EvidenceBundleSchema,
} from "@/lib/appraisal/types";
import {
  createAppraisalAccessToken,
  hashRateLimitValue,
} from "@/lib/appraisal/token";
import { sendAppraisalStartedEmail } from "@/lib/appraisal/email";
import { evaluateAppraisalRateLimit } from "@/lib/appraisal/rate-limit";
import { appraisalWorkflow } from "@/workflows/appraisal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  auditId: z.string().uuid(),
  email: z.string().email(),
  brief: AppraisalBriefSchema,
});

function requestIp(req: Request) {
  return (
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  try {
    const input = Body.parse(await req.json());
    const audit = await db.audit.findUnique({
      where: { id: input.auditId },
      select: {
        id: true,
        url: true,
        domain: true,
        evidence: true,
        primarySignals: true,
        competitorSignals: true,
      },
    });
    if (!audit) {
      return NextResponse.json({ error: "Run the preliminary audit again before requesting a full appraisal." }, { status: 404 });
    }
    if (!audit.evidence) {
      return NextResponse.json({ error: "This audit predates full-appraisal evidence capture. Run a new preliminary audit." }, { status: 409 });
    }

    const evidence = EvidenceBundleSchema.parse(audit.evidence);
    const email = input.email.trim().toLowerCase();
    const emailHash = hashRateLimitValue(email);
    const ipHash = hashRateLimitValue(requestIp(req));
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sameLead, ipCount] = await Promise.all([
      db.appraisal.findFirst({
        where: { emailHash, domain: audit.domain, createdAt: { gte: since } },
        select: { id: true },
      }),
      db.appraisal.count({ where: { ipHash, createdAt: { gte: since } } }),
    ]);

    const limit = evaluateAppraisalRateLimit({
      hasRecentEmailDomainRequest: Boolean(sameLead),
      recentIpRequestCount: ipCount,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const access = createAppraisalAccessToken();
    const appraisal = await db.appraisal.create({
      data: {
        auditId: audit.id,
        url: audit.url,
        domain: audit.domain,
        email,
        emailHash,
        ipHash,
        accessTokenHash: access.tokenHash,
        tokenExpiresAt: access.expiresAt,
        status: "queued",
        brief: input.brief as any,
        evidence: evidence as any,
        promptVersion: "gpto-appraisal-v1",
        stages: {
          create: APPRAISAL_STAGE_DEFINITIONS.map((stage) => ({
            stageKey: stage.key,
            stageOrder: stage.order,
            title: stage.title,
          })),
        },
      },
    });

    try {
      const run = await start(appraisalWorkflow, [appraisal.id]);
      await db.appraisal.update({
        where: { id: appraisal.id },
        data: { workflowRunId: run.runId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start the appraisal workflow.";
      await db.appraisal.update({
        where: { id: appraisal.id },
        data: { status: "failed", error: message, completedAt: new Date() },
      });
      throw error;
    }

    try {
      await sendAppraisalStartedEmail({
        email,
        token: access.token,
        websiteUrl: audit.url,
      });
    } catch (error) {
      console.error("Failed to send appraisal start email", error);
    }

    return NextResponse.json(
      {
        ok: true,
        reportUrl: `/appraisal/${encodeURIComponent(access.token)}`,
        expiresAt: access.expiresAt.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid appraisal request." }, { status: 400 });
    }
    console.error("Failed to create appraisal", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create appraisal." },
      { status: 500 }
    );
  }
}
