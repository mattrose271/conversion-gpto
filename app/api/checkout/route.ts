import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAuditRecipients, getCheckoutBaseUrl, getStripePriceDataForTier, PAYMENT_TIERS } from "@/lib/payments";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tier: z.enum(PAYMENT_TIERS),
  name: z.string().min(1, "Name is required"),
  businessName: z.string().min(1, "Business name is required"),
  website: z.string().min(1, "Website is required"),
  email: z.string().email("Valid email is required"),
  contactNumber: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  message: z.string().optional().default(""),
  auditId: z.string().uuid().optional(),
  source: z.string().optional().default("pricing"),
  minimumTermAccepted: z.boolean().refine((value) => value === true, {
    message: "You must accept the 3-month minimum policy",
  }),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return issue?.message || "Invalid request body";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create checkout session";
}

export async function POST(req: Request) {
  try {
    if (process.env.ENABLE_STRIPE_CHECKOUT !== "true") {
      return NextResponse.json(
        { ok: false, error: "Stripe checkout is currently unavailable. Please contact our team." },
        { status: 503 }
      );
    }

    const input = Body.parse(await req.json());

    const stripe = getStripeClient();
    const priceData = getStripePriceDataForTier(input.tier);
    const baseUrl = getCheckoutBaseUrl();
    const recipients = getAuditRecipients();

    const lead = await db.paymentLead.create({
      data: {
        tier: input.tier,
        name: input.name,
        businessName: input.businessName,
        website: input.website,
        email: input.email,
        contactNumber: input.contactNumber || null,
        industry: input.industry || null,
        message: input.message || null,
        minimumTermAccepted: true,
        minimumTermAcceptedAt: new Date(),
        auditId: input.auditId,
        source: input.source,
        stripePriceId: null,
        checkoutStatus: "initiated",
      },
    });

    if (recipients.length > 0) {
      const text = [
        "New Stripe checkout lead started",
        "",
        `Lead ID: ${lead.id}`,
        `Tier: ${input.tier}`,
        `Name: ${input.name}`,
        `Business: ${input.businessName}`,
        `Website: ${input.website}`,
        `Email: ${input.email}`,
        `Contact Number: ${input.contactNumber || "—"}`,
        `Industry: ${input.industry || "—"}`,
        `Audit ID: ${input.auditId || "—"}`,
        `Source: ${input.source || "pricing"}`,
        "",
        "Message:",
        input.message || "—",
      ].join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #C20F2C; margin-top: 0;">New Stripe Checkout Lead</h2>
          <div style="background: #f6f7f9; border: 1px solid #eceff3; border-radius: 10px; padding: 14px;">
            <p><strong>Lead ID:</strong> ${escapeHtml(lead.id)}</p>
            <p><strong>Tier:</strong> ${escapeHtml(input.tier)}</p>
            <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
            <p><strong>Business:</strong> ${escapeHtml(input.businessName)}</p>
            <p><strong>Website:</strong> ${escapeHtml(input.website)}</p>
            <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
            <p><strong>Contact Number:</strong> ${input.contactNumber ? escapeHtml(input.contactNumber) : "—"}</p>
            <p><strong>Industry:</strong> ${input.industry ? escapeHtml(input.industry) : "—"}</p>
            <p><strong>Audit ID:</strong> ${input.auditId ? escapeHtml(input.auditId) : "—"}</p>
            <p><strong>Source:</strong> ${escapeHtml(input.source || "pricing")}</p>
          </div>
          <div style="margin-top: 14px;">
            <p style="margin: 0 0 8px;"><strong>Message</strong></p>
            <div style="background: #f9fafb; border-left: 3px solid #C20F2C; padding: 12px;">
              ${input.message ? escapeHtml(input.message) : "—"}
            </div>
          </div>
        </div>
      `;

      sendEmail({
        to: recipients,
        subject: `Stripe Lead Started: ${input.businessName} (${input.tier})`,
        text,
        html,
        replyTo: input.email,
      }).catch((err) => {
        console.error("Failed to send Stripe lead email:", err);
      });
    }

    const cancelParams = new URLSearchParams();
    cancelParams.set("tier", input.tier);
    cancelParams.set("canceled", "1");
    if (input.website) cancelParams.set("url", input.website);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price_data: priceData, quantity: 1 }],
      customer_email: input.email,
      client_reference_id: lead.id,
      locale: "en",
      metadata: {
        leadId: lead.id,
        tier: input.tier,
        businessName: input.businessName,
        website: input.website,
        email: input.email,
      },
      subscription_data: {
        metadata: {
          leadId: lead.id,
          tier: input.tier,
        },
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?${cancelParams.toString()}`,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    await db.paymentLead.update({
      where: { id: lead.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      },
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "Stripe checkout URL was not created" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      sessionUrl: session.url,
      sessionId: session.id,
      leadId: lead.id,
    });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json({ ok: false, error: formatError(error) }, { status: 400 });
  }
}
