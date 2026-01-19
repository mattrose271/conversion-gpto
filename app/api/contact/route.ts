import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

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

    const to = "jlethgo@conversionia.com";
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Missing RESEND_API_KEY");

    const resend = new Resend(apiKey);

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

    await resend.emails.send({
      // IMPORTANT: This must be a verified sender in Resend.
      from: "GPTO Audit <no-reply@conversionia.com>",
      to: [to],
      reply_to: input.email,
      subject,
      text
    });

    return NextResponse.json({ ok: true, message: "Sent." });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}
