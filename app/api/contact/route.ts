import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(1),
  businessName: z.string().min(1),
  website: z.string().min(1),
  email: z.string().email(),
  contactNumber: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  message: z.string().optional().default(""),
  tier: z.string().optional().default("")
});

function sanitize(str: string, maxLen = 500): string {
  return String(str || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = Body.parse(raw);
    const input = {
      name: sanitize(parsed.name),
      businessName: sanitize(parsed.businessName),
      website: sanitize(parsed.website),
      email: parsed.email.trim().toLowerCase(),
      contactNumber: sanitize(parsed.contactNumber),
      industry: sanitize(parsed.industry),
      message: sanitize(parsed.message, 5000),
      tier: sanitize(parsed.tier),
    };

    // Get recipients from environment variable or use default
    const recipientsEnv = process.env.AUDIT_EMAIL_RECIPIENTS || "jlethgo@conversionia.com";
    const recipients = recipientsEnv
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const subject = `GPTO Audit Enquiry: ${input.businessName} (${input.website})`;

    const text = [
      `New GPTO contact request`,
      ``,
      `Name: ${input.name}`,
      `Business: ${input.businessName}`,
      `Website: ${input.website}`,
      `Email: ${input.email}`,
      `Contact Number: ${input.contactNumber || "—"}`,
      `Industry: ${input.industry || "—"}`,
      `Recommended Tier: ${input.tier || "—"}`,
      ``,
      `Message:`,
      `${input.message || "—"}`
    ].join("\n");

    function escapeHtml(value: string): string {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"></head>
      <body>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #C20F2C; margin-top: 0;">New GPTO Contact Request</h2>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>Name:</strong> ${escapeHtml(input.name)}</p>
          <p style="margin: 8px 0;"><strong>Business:</strong> ${escapeHtml(input.businessName)}</p>
          <p style="margin: 8px 0;"><strong>Website:</strong> <a href="${escapeHtml(input.website)}">${escapeHtml(input.website)}</a></p>
          <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></p>
          <p style="margin: 8px 0;"><strong>Contact Number:</strong> ${input.contactNumber ? escapeHtml(input.contactNumber) : "—"}</p>
          <p style="margin: 8px 0;"><strong>Industry:</strong> ${input.industry ? escapeHtml(input.industry) : "—"}</p>
          <p style="margin: 8px 0;"><strong>Recommended Tier:</strong> ${input.tier ? escapeHtml(input.tier) : "—"}</p>
        </div>
        ${input.message ? `
          <div style="margin-top: 16px;">
            <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; border-left: 3px solid #C20F2C;">
              <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(input.message)}</p>
            </div>
          </div>
        ` : ""}
      </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      replyTo: input.email,
    });

    return NextResponse.json({ ok: true, message: "Sent." });
  } catch (e: any) {
    console.error("Contact form error:", e);
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}
