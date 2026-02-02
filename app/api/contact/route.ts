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

export async function POST(req: Request) {
  try {
    const input = Body.parse(await req.json());

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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C20F2C;">New GPTO Contact Request</h2>
        <p><strong>Name:</strong> ${input.name}</p>
        <p><strong>Business:</strong> ${input.businessName}</p>
        <p><strong>Website:</strong> ${input.website}</p>
        <p><strong>Email:</strong> ${input.email}</p>
        <p><strong>Contact Number:</strong> ${input.contactNumber || "—"}</p>
        <p><strong>Industry:</strong> ${input.industry || "—"}</p>
        <p><strong>Recommended Tier:</strong> ${input.tier || "—"}</p>
        <p><strong>Message:</strong></p>
        <p>${input.message || "—"}</p>
      </div>
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
