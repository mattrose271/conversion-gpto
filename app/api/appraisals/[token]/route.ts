import { NextResponse } from "next/server";
import { getPublicAppraisalByToken } from "@/lib/appraisal/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const appraisal = await getPublicAppraisalByToken(params.token);
  if (!appraisal) {
    return NextResponse.json({ error: "Appraisal link is invalid or expired." }, { status: 404 });
  }
  return NextResponse.json(appraisal, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
