import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  userEmail: z.string().min(1),
  url: z.string().min(1),
  auditId: z.string().uuid().optional(),
  tier: z.string().optional(),
  scores: z.record(z.number()).optional(),
  grades: z.record(z.string()).optional(),
  tierWhy: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  businessInfo: z.object({
    businessName: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  executiveSummary: z.string().optional(),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildAuditResultsHTML(data: z.infer<typeof Body>): string {
  const metricDefinitions = [
    { key: "overall", label: "Overall Score" },
    { key: "aiReadiness", label: "AI Readiness" },
    { key: "contentDepth", label: "Content Depth" },
    { key: "structure", label: "Structure" },
    { key: "technicalReadiness", label: "Technical Readiness" }
  ];

  const metricLines = metricDefinitions
    .map(({ key, label }) => {
      const rawScore = data.scores?.[key];
      const score = typeof rawScore === "number" ? rawScore : null;
      const grade = data.grades?.[key];
      const detailParts: string[] = [];
      if (score !== null) {
        detailParts.push(`${Math.round(score)} / 100`);
      }
      if (grade) {
        detailParts.push(`(${grade})`);
      }
      if (!detailParts.length) {
        return null;
      }
      return { label, detail: detailParts.join(" ") };
    })
    .filter((line): line is { label: string; detail: string } => line !== null);

  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations.filter(
        (rec): rec is string => typeof rec === "string" && rec.trim().length > 0
      )
    : [];
  const highlightedRecommendations = recommendations.slice(0, 5);

  const metricHtml = metricLines.length
    ? metricLines
        .map(
          (line) =>
            `<p style="margin: 6px 0; font-size: 14px; color: #111111;"><strong>${escapeHtml(
              String(line.label)
            )}:</strong> ${escapeHtml(String(line.detail))}</p>`
        )
        .join("")
    : "<p style='color: #666;'>No scores available</p>";

  const recommendationHtml = highlightedRecommendations.length
    ? `<div style="margin-top: 12px;"><strong style="font-size: 14px; color: #111111;">Top Recommendations:</strong><ul style="margin: 8px 0 0; padding-left: 18px; color: #111111;">${highlightedRecommendations
        .map((rec) => `<li style="margin-bottom: 4px;">${escapeHtml(String(rec))}</li>`)
        .join("")}</ul></div>`
    : "";

  const tierWhyText = data.tierWhy?.trim();
  const tierWhyHtml = tierWhyText
    ? `<div style="margin-top: 12px;"><strong style="font-size: 14px; color: #111111;">Tier Recommendation:</strong><p style="margin: 6px 0 0; font-size: 13px; color: #333;">${escapeHtml(
        String(tierWhyText)
      )}</p></div>`
    : "";

  const businessInfoHtml = data.businessInfo && (data.businessInfo.businessName || data.businessInfo.website)
    ? `<div style="margin-top: 12px;"><strong style="font-size: 14px; color: #111111;">Business Information:</strong><ul style="margin: 8px 0 0; padding-left: 18px; color: #111111;">${data.businessInfo.businessName ? `<li><strong>Business Name:</strong> ${escapeHtml(String(data.businessInfo.businessName))}</li>` : ""}${data.businessInfo.website ? `<li><strong>Website:</strong> <a href="${escapeHtml(String(data.businessInfo.website))}">${escapeHtml(String(data.businessInfo.website))}</a></li>` : ""}</ul></div>`
    : "";

  const executiveSummaryHtml = data.executiveSummary
    ? `<div style="margin-top: 12px;"><strong style="font-size: 14px; color: #111111;">Executive Summary:</strong><p style="margin: 6px 0 0; font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(String(data.executiveSummary))}</p></div>`
    : "";

  return `
    <div style="margin-top: 24px;">
      <div style="padding: 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); background: #FCFCFC;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #111111;">Audit Results</h3>
        ${metricHtml}
        ${recommendationHtml}
        ${tierWhyHtml}
        ${businessInfoHtml}
        ${executiveSummaryHtml}
      </div>
    </div>
  `.trim();
}

function buildAuditResultsText(data: z.infer<typeof Body>): string {
  const metricDefinitions = [
    { key: "overall", label: "Overall Score" },
    { key: "aiReadiness", label: "AI Readiness" },
    { key: "contentDepth", label: "Content Depth" },
    { key: "structure", label: "Structure" },
    { key: "technicalReadiness", label: "Technical Readiness" }
  ];

  const metricLines = metricDefinitions
    .map(({ key, label }) => {
      const rawScore = data.scores?.[key];
      const score = typeof rawScore === "number" ? rawScore : null;
      const grade = data.grades?.[key];
      const detailParts: string[] = [];
      if (score !== null) {
        detailParts.push(`${Math.round(score)} / 100`);
      }
      if (grade) {
        detailParts.push(`(${String(grade)})`);
      }
      if (!detailParts.length) {
        return null;
      }
      return `${label}: ${detailParts.join(" ")}`;
    })
    .filter((line): line is string => line !== null);

  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations.filter(
        (rec): rec is string => typeof rec === "string" && rec.trim().length > 0
      )
    : [];
  const highlightedRecommendations = recommendations.slice(0, 5);

  let text = "Audit Results:\n\n";
  
  if (metricLines.length) {
    text += metricLines.join("\n") + "\n\n";
  }

  if (highlightedRecommendations.length) {
    text += "Top Recommendations:\n";
    highlightedRecommendations.forEach((rec) => {
      text += `• ${String(rec)}\n`;
    });
    text += "\n";
  }

  if (data.tierWhy?.trim()) {
    text += `Tier Recommendation: ${String(data.tierWhy.trim())}\n\n`;
  }

  if (data.businessInfo && (data.businessInfo.businessName || data.businessInfo.website)) {
    text += "Business Information:\n";
    if (data.businessInfo.businessName) {
      text += `Business Name: ${String(data.businessInfo.businessName)}\n`;
    }
    if (data.businessInfo.website) {
      text += `Website: ${String(data.businessInfo.website)}\n`;
    }
    text += "\n";
  }

  if (data.executiveSummary) {
    text += `Executive Summary: ${String(data.executiveSummary)}\n\n`;
  }

  return text.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Normalize URL if needed
    if (body.url && typeof body.url === "string") {
      let url = body.url.trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
      }
      body.url = url;
    }
    
    // Normalize recommendations: convert objects to strings
    if (Array.isArray(body.recommendations)) {
      body.recommendations = body.recommendations.map((rec: any) => {
        if (typeof rec === "string") {
          return rec;
        } else if (rec && typeof rec === "object" && rec.title) {
          return rec.title;
        } else {
          return String(rec);
        }
      });
    }
    
    const input = Body.parse(body);

    // Get recipients from environment variable
    const recipientsEnv = process.env.AUDIT_EMAIL_RECIPIENTS || "jlethgo@conversionia.com";
    const recipients = recipientsEnv
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (recipients.length === 0) {
      console.error("No email recipients configured");
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const auditResultsHtml = buildAuditResultsHTML(input);
    const auditResultsText = buildAuditResultsText(input);

    // Send email to internal team
    try {
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.userEmail);
      
      await sendEmail({
        to: recipients,
        subject: `New GPTO Audit Completed: ${input.userEmail}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #C20F2C; margin-top: 0;">New GPTO Audit Completed</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #111111;">
              A user has completed a GPTO audit.
            </p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>User Email:</strong> ${escapeHtml(input.userEmail)}</p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Audited URL:</strong> <a href="${escapeHtml(input.url)}">${escapeHtml(input.url)}</a></p>
              ${input.auditId ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>Audit ID:</strong> ${escapeHtml(input.auditId)}</p>` : ""}
              ${input.tier ? `<p style="margin: 0; font-size: 14px;"><strong>Recommended Tier:</strong> ${escapeHtml(input.tier)}</p>` : ""}
            </div>
            ${auditResultsHtml}
          </div>
        `,
        text: `New GPTO Audit Completed\n\nA user has completed a GPTO audit.\n\nUser Email: ${input.userEmail}\nAudited URL: ${input.url}\n${input.auditId ? `Audit ID: ${input.auditId}\n` : ""}${input.tier ? `Recommended Tier: ${input.tier}\n` : ""}\n\n${auditResultsText}`,
        replyTo: isValidEmail ? input.userEmail : undefined,
      });

      return NextResponse.json({ success: true });
    } catch (emailError: any) {
      const errorMessage = emailError?.message || String(emailError) || "Unknown error";
      console.error("Failed to send notification email:", errorMessage);
      return NextResponse.json(
        { error: "Failed to send notification email", details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "Invalid request";
    console.error("Audit notification error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
