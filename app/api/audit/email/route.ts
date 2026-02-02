import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { getTierDeliverables, tierDeliverables } from "@/lib/data/tierDeliverables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email(),
  auditId: z.string().uuid().optional()
});

function generateWelcomeEmailHTML(
  userEmail: string,
  tier: string | null,
  contactEmails: string[]
): string {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "";
  
  // Build Calendly URL with redirect to return to website
  const buildCalendlyUrlWithRedirect = () => {
    if (!calendlyUrl) return calendlyUrl;
    if (!siteUrl) return calendlyUrl; // If no site URL configured, return original
    try {
      const url = new URL(calendlyUrl);
      url.searchParams.set("redirect", siteUrl);
      return url.toString();
    } catch {
      return calendlyUrl;
    }
  };
  
  const calendlyUrlWithRedirect = buildCalendlyUrlWithRedirect();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ConversionGPTO</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F8EDEE;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,.12); border: 1px solid #eee;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 32px; line-height: 1.1; color: #111111;">
                Welcome to <span style="color: #C20F2C;">ConversionGPTO</span>
              </h1>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #111111;">
                Thank you for requesting your free GPTO audit! We're excited to help you improve your AI visibility and search performance.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #111111;">
                <strong style="color: #C20F2C;">What is GPTO?</strong> GPTO (GPT Optimization) helps your website perform in AI-driven search and answer engines. We improve clarity, structure, content depth, and machine-readability so your brand is easier to understand, trust, and recommend.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #111111;">
                Your audit is being processed. Once complete, you'll receive detailed insights about your website's AI readiness and discover opportunities to optimize your online presence.
              </p>
            </td>
          </tr>

          <!-- All Tier Deliverables Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; line-height: 1.3; color: #111111; text-align: center;">
                Our Service Tiers
              </h2>
              ${tierDeliverables.map((deliverable) => `
              <div style="background: linear-gradient(180deg, #FDFDFD 0%, #F8EDEE 100%); border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px; font-size: 20px; line-height: 1.3; color: #111111;">
                  ${deliverable.tier} Tier - ${deliverable.title}
                </h3>
                <div style="margin: 12px 0;">
                  <div style="font-size: 28px; font-weight: 900; line-height: 1; margin-bottom: 4px; color: #111111;">
                    ${deliverable.price} <span style="font-size: 16px; font-weight: 800;">/ mo</span>
                  </div>
                  <div style="margin-top: 6px; color: #666; font-size: 14px;">
                    ${deliverable.subtitle}
                  </div>
                </div>
                <div style="height: 1px; background: rgba(0,0,0,.08); margin: 12px 0;"></div>
                <ul style="margin: 0; padding-left: 18px; display: grid; gap: 8px; color: #111111;">
                  ${deliverable.deliverables.map((item: string) => `
                    <li style="line-height: 1.5; font-size: 14px;">${item}</li>
                  `).join("")}
                </ul>
              </div>
              `).join("")}
            </td>
          </tr>

          <!-- Contact Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #111111; border-radius: 12px; padding: 24px; color: #FFFFFF;">
                <h3 style="margin: 0 0 12px; font-size: 20px; line-height: 1.3; color: #FFFFFF;">
                  Reach Out to Us
                </h3>
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,.9);">
                  Have questions? Schedule a call with our team to discuss your GPTO needs and get personalized recommendations.
                </p>
                ${calendlyUrl ? `
                <div style="text-align: center;">
                  <a href="${calendlyUrlWithRedirect}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #C20F2C; color: #FFFFFF; text-decoration: none; border-radius: 999px; font-weight: 600; text-align: center; min-width: 200px;">
                    Schedule a Call
                  </a>
                </div>
                ` : `
                <div style="display: grid; gap: 8px;">
                  ${contactEmails.map((email) => `
                    <a href="mailto:${email}" style="color: #FFFFFF; text-decoration: none; font-size: 14px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.1);">
                      ${email}
                    </a>
                  `).join("")}
                </div>
                `}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #eee; background-color: #F3F4F6;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
                <strong style="color: #111111;">ConversionGPTO</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                AI Visibility Optimization for Modern Businesses
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateWelcomeEmailText(
  userEmail: string,
  tier: string | null,
  contactEmails: string[]
): string {
  let text = `Welcome to ConversionGPTO\n\n`;
  text += `Thank you for requesting your free GPTO audit! We're excited to help you improve your AI visibility and search performance.\n\n`;
  text += `What is GPTO? GPTO (GPT Optimization) helps your website perform in AI-driven search and answer engines. We improve clarity, structure, content depth, and machine-readability so your brand is easier to understand, trust, and recommend.\n\n`;
  text += `Your audit is being processed. Once complete, you'll receive detailed insights about your website's AI readiness and discover opportunities to optimize your online presence.\n\n`;

  text += `Our Service Tiers\n\n`;
  tierDeliverables.forEach((deliverable) => {
    text += `${deliverable.tier} Tier - ${deliverable.title}\n`;
    text += `${deliverable.price} / mo\n`;
    text += `${deliverable.subtitle}\n\n`;
    deliverable.deliverables.forEach((item) => {
      text += `• ${item}\n`;
    });
    text += `\n`;
  });

  text += `Reach Out to Us\n`;
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";
  if (calendlyUrl) {
    text += `Have questions? Schedule a call with our team to discuss your GPTO needs and get personalized recommendations.\n\n`;
    text += `Schedule a Call: ${calendlyUrl}\n`;
  } else {
    text += `Have questions? Our team is here to help. Contact us at:\n`;
    contactEmails.forEach((email) => {
      text += `${email}\n`;
    });
  }

  text += `\n---\n`;
  text += `ConversionGPTO\n`;
  text += `AI Visibility Optimization for Modern Businesses\n`;

  return text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = Body.parse(body);

    // Get recipients from environment variable (for internal notifications)
    const recipientsEnv = process.env.AUDIT_EMAIL_RECIPIENTS || "jlethgo@conversionia.com";
    const recipients = recipientsEnv
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (recipients.length === 0) {
      console.error("No email recipients configured");
      return NextResponse.json(
        { error: "Email service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Save email submission to database
    let emailSubmission;
    let auditTier: string | null = null;
    try {
      emailSubmission = await db.emailSubmission.create({
        data: {
          email: input.email,
          auditId: input.auditId || null,
          source: "modal"
        }
      });

      // If auditId is provided, fetch the audit to get the tier
      if (input.auditId) {
        try {
          const audit = await db.audit.findUnique({
            where: { id: input.auditId },
            select: { tier: true }
          });
          if (audit?.tier) {
            auditTier = audit.tier;
          }
        } catch (auditError: any) {
          console.error("Failed to fetch audit tier:", auditError);
          // Continue without tier
        }
      }
    } catch (dbError: any) {
      console.error("Failed to save email submission to database:", dbError);
      // Continue even if database save fails
    }

    let welcomeEmailSent = false;
    let internalEmailSent = false;

    // Send welcome email to user
    try {
      const welcomeEmailResult = await sendEmail({
        to: input.email,
        subject: "Welcome to ConversionGPTO - Your GPTO Audit is Ready",
        html: generateWelcomeEmailHTML(input.email, auditTier, recipients),
        text: generateWelcomeEmailText(input.email, auditTier, recipients),
      });

      welcomeEmailSent = true;
      console.log("Welcome email sent successfully:", welcomeEmailResult.messageId);
    } catch (emailError: any) {
      console.error("Failed to send welcome email:", emailError);
      if (emailError?.message) {
        console.error("Welcome email error details:", emailError.message);
      }
    }

    // Send internal notification email to team
    try {
      const internalEmailResult = await sendEmail({
        to: recipients,
        subject: `New GPTO Audit Request: ${input.email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C20F2C;">New GPTO Audit Request</h2>
            <p>A new user has requested a free GPTO audit.</p>
            <p><strong>Email:</strong> ${input.email}</p>
            ${input.auditId ? `<p><strong>Audit ID:</strong> ${input.auditId}</p>` : ""}
            ${auditTier ? `<p><strong>Recommended Tier:</strong> ${auditTier}</p>` : ""}
            <p>They will now be redirected to the audit page.</p>
          </div>
        `,
        text: `A new user has requested a free GPTO audit.\n\nEmail: ${input.email}\n${input.auditId ? `Audit ID: ${input.auditId}\n` : ""}${auditTier ? `Recommended Tier: ${auditTier}\n` : ""}They will now be redirected to the audit page.`,
        replyTo: input.email,
      });

      internalEmailSent = true;
      console.log("Internal notification email sent successfully:", internalEmailResult.messageId);
    } catch (emailError: any) {
      console.error("Failed to send internal notification email:", emailError);
      if (emailError?.message) {
        console.error("Internal email error details:", emailError.message);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Email recorded.",
      welcomeEmailSent,
      internalEmailSent,
      emailSubmissionId: emailSubmission?.id
    });
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
