import { NextResponse } from "next/server";
import { createSMTPTransporter } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/email-test
 * Verifies SMTP configuration and optionally sends a test email.
 * Use ?send=your@email.com to send a test message.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sendTo = searchParams.get("send");

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing SMTP configuration",
          config: {
            SMTP_HOST: smtpHost ? "✓" : "✗",
            SMTP_USER: smtpUser ? "✓" : "✗",
            SMTP_PASSWORD: smtpPassword ? "✓" : "✗",
          },
        },
        { status: 503 }
      );
    }

    const transporter = createSMTPTransporter();

    if (sendTo) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || smtpUser,
        to: sendTo,
        subject: "GPTO Test Email",
        text: "If you received this, your SMTP configuration is working.",
      });
      return NextResponse.json({
        ok: true,
        message: `Test email sent to ${sendTo}. Check your inbox (and spam).`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "SMTP config is set. Add ?send=your@email.com to send a test message.",
      config: { SMTP_HOST: smtpHost, SMTP_PORT: process.env.SMTP_PORT || "587" },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("Email test error:", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 503 }
    );
  }
}
