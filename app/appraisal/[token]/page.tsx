import { notFound } from "next/navigation";
import { getPublicAppraisalByToken } from "@/lib/appraisal/repository";
import AppraisalReportClient from "./AppraisalReportClient";

export const dynamic = "force-dynamic";

export default async function AppraisalPage({ params }: { params: { token: string } }) {
  const appraisal = await getPublicAppraisalByToken(params.token);
  if (!appraisal) notFound();
  return <AppraisalReportClient token={params.token} initial={appraisal} />;
}
