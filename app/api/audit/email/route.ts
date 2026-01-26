import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

const Body = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = Body.parse(body);

    // Send email notification
    const to = "jlethgo@conversionia.com";
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY environment variable");
      return NextResponse.json(
        { error: "Email service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    try {
      await resend.emails.send({
        from: "GPTO Audit <no-reply@conversionia.com>",
        to: [to],
        reply_to: input.email,
        subject: `New GPTO Audit Request: ${input.email}`,
        text: `A new user has requested a free GPTO audit.\n\nEmail: ${input.email}\n\nThey will now be redirected to the audit page.`
      });
    } catch (emailError: any) {
      console.error("Failed to send email:", emailError);
      // Still return success to user even if email fails
      // Log the error for admin review
    }

    return NextResponse.json({ ok: true, message: "Email recorded." });
  } catch (e: any) {
    // Handle validation errors
    if (e.name === "ZodError") {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    
    // Handle JSON parse errors
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    console.error("API error:", e);
    return NextResponse.json(
      { error: e?.message || "An error occurred. Please try again." },
      { status: 400 }
    );
  }
}
