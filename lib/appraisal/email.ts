import { sendEmail } from "@/lib/email";
import { getCheckoutBaseUrl } from "@/lib/payments";
import type { PackageRationale } from "@/lib/appraisal/types";

function reportUrl(token: string) {
  return `${getCheckoutBaseUrl()}/appraisal/${encodeURIComponent(token)}`;
}

export async function sendAppraisalStartedEmail(input: {
  email: string;
  token: string;
  websiteUrl: string;
}) {
  const url = reportUrl(input.token);
  const text = [
    "Your GPTO full appraisal has started.",
    "",
    `Website: ${input.websiteUrl}`,
    `View progress and your completed report: ${url}`,
    "",
    "This private link expires in 90 days.",
  ].join("\n");

  return sendEmail({
    to: input.email,
    subject: "Your GPTO full appraisal is underway",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px">
        <h1 style="color:#C20F2C">Your GPTO appraisal is underway</h1>
        <p>We are processing the eight-stage appraisal for <strong>${input.websiteUrl}</strong>.</p>
        <p><a href="${url}" style="display:inline-block;background:#C20F2C;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">View appraisal progress</a></p>
        <p style="font-size:12px;color:#666">This private link expires in 90 days.</p>
      </div>
    `,
  });
}

export async function sendAppraisalCompletedEmail(input: {
  email: string;
  websiteUrl: string;
  packageRationale: PackageRationale;
}) {
  const text = [
    "Your GPTO full appraisal is complete.",
    "",
    `Website: ${input.websiteUrl}`,
    `Recommended package: ${input.packageRationale.tier}`,
    "Open the private report link sent when your appraisal started.",
  ].join("\n");

  return sendEmail({
    to: input.email,
    subject: "Your GPTO full appraisal is complete",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px">
        <h1 style="color:#C20F2C">Your GPTO appraisal is complete</h1>
        <p>The eight-stage appraisal for <strong>${input.websiteUrl}</strong> is ready.</p>
        <p>Recommended package: <strong>${input.packageRationale.tier}</strong></p>
        <p>Open the private report link sent when your appraisal started.</p>
      </div>
    `,
  });
}
