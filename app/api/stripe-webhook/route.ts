import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAuditRecipients, getCheckoutBaseUrl } from "@/lib/payments";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isUniqueConstraintError(error: any): boolean {
  return error?.code === "P2002";
}

function getSummaryPayload(event: Stripe.Event) {
  const object = event.data?.object as { id?: string } | undefined;
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    objectId: object?.id || null,
  };
}

async function markEventReceived(event: Stripe.Event) {
  try {
    await db.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: getSummaryPayload(event),
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }
    throw error;
  }
}

async function unmarkEvent(event: Stripe.Event) {
  await db.stripeWebhookEvent
    .delete({
      where: { stripeEventId: event.id },
    })
    .catch(() => undefined);
}

async function updateLeadFromCheckoutSession(session: Stripe.Checkout.Session) {
  const leadId = session.client_reference_id || session.metadata?.leadId || null;
  const sessionId = session.id;
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerEmail = session.customer_details?.email || session.customer_email || null;
  const checkoutStatus = session.status === "complete" ? "completed" : session.status || "completed";

  let existingLead = null as any;
  if (leadId) {
    existingLead = await db.paymentLead.findUnique({ where: { id: leadId } });
  }
  if (!existingLead && sessionId) {
    existingLead = await db.paymentLead.findFirst({ where: { stripeCheckoutSessionId: sessionId } });
  }
  if (!existingLead) {
    return null;
  }

  const updatedLead = await db.paymentLead.update({
    where: { id: existingLead.id },
    data: {
      email: customerEmail || existingLead.email,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId: customerId || existingLead.stripeCustomerId,
      stripeSubscriptionId: subscriptionId || existingLead.stripeSubscriptionId,
      checkoutStatus,
      subscriptionStatus: subscriptionId ? existingLead.subscriptionStatus || "active" : existingLead.subscriptionStatus,
    },
  });

  return {
    lead: updatedLead,
    newlyCompleted: existingLead.checkoutStatus !== "completed" && checkoutStatus === "completed",
  };
}

async function sendCustomerSuccessEmail(lead: any, sessionId: string) {
  if (!lead?.email) return;

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "";
  const successUrl = `${getCheckoutBaseUrl()}/checkout/success?session_id=${encodeURIComponent(sessionId)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #C20F2C; margin-top: 0;">Your GPTO Subscription Is Active</h2>
      <p>Thank you for subscribing to our <strong>${escapeHtml(lead.tier)}</strong> package.</p>
      <p>We have your onboarding details and our team will begin setup immediately.</p>
      <div style="margin: 14px 0; padding: 14px; border: 1px solid #eee; border-radius: 10px;">
        <p style="margin: 0 0 8px;"><strong>Business:</strong> ${escapeHtml(lead.businessName || "—")}</p>
        <p style="margin: 0 0 8px;"><strong>Website:</strong> ${escapeHtml(lead.website || "—")}</p>
        <p style="margin: 0;"><strong>Plan:</strong> ${escapeHtml(lead.tier || "—")} (monthly, minimum 3 months)</p>
      </div>
      <p><a href="${escapeHtml(successUrl)}">View your order details and manage billing</a></p>
      ${
        calendlyUrl
          ? `<p><a href="${escapeHtml(
              calendlyUrl
            )}" style="display:inline-block; padding:10px 16px; border-radius:999px; background:#C20F2C; color:#fff; text-decoration:none; font-weight:700;">Schedule your onboarding call</a></p>`
          : ""
      }
    </div>
  `;

  const text = [
    "Your GPTO subscription is active.",
    "",
    `Plan: ${lead.tier}`,
    `Business: ${lead.businessName || "—"}`,
    `Website: ${lead.website || "—"}`,
    "",
    `Order details and billing: ${successUrl}`,
    calendlyUrl ? `Onboarding call: ${calendlyUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: lead.email,
    subject: `GPTO Subscription Active (${lead.tier})`,
    html,
    text,
  });
}

async function sendInternalPaymentSuccessEmail(lead: any, session: Stripe.Checkout.Session) {
  const recipients = getAuditRecipients();
  if (!recipients.length) return;

  const customerId = typeof session.customer === "string" ? session.customer : "";
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
  const customerEmail = session.customer_details?.email || session.customer_email || lead?.email || "";

  const text = [
    "Stripe payment successful",
    "",
    `Lead ID: ${lead?.id || "—"}`,
    `Tier: ${lead?.tier || session.metadata?.tier || "—"}`,
    `Business: ${lead?.businessName || "—"}`,
    `Website: ${lead?.website || "—"}`,
    `Customer Email: ${customerEmail || "—"}`,
    `Stripe Checkout Session ID: ${session.id}`,
    `Stripe Customer ID: ${customerId || "—"}`,
    `Stripe Subscription ID: ${subscriptionId || "—"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #C20F2C; margin-top: 0;">Stripe Payment Successful</h2>
      <p><strong>Lead ID:</strong> ${escapeHtml(lead?.id || "—")}</p>
      <p><strong>Tier:</strong> ${escapeHtml(lead?.tier || session.metadata?.tier || "—")}</p>
      <p><strong>Business:</strong> ${escapeHtml(lead?.businessName || "—")}</p>
      <p><strong>Website:</strong> ${escapeHtml(lead?.website || "—")}</p>
      <p><strong>Customer Email:</strong> ${escapeHtml(customerEmail || "—")}</p>
      <p><strong>Checkout Session ID:</strong> ${escapeHtml(session.id)}</p>
      <p><strong>Customer ID:</strong> ${escapeHtml(customerId || "—")}</p>
      <p><strong>Subscription ID:</strong> ${escapeHtml(subscriptionId || "—")}</p>
    </div>
  `;

  await sendEmail({
    to: recipients,
    subject: `Stripe Payment Successful: ${lead?.businessName || customerEmail || session.id}`,
    html,
    text,
    replyTo: customerEmail || undefined,
  });
}

async function sendPaymentFailedEmails(invoice: Stripe.Invoice) {
  const recipients = getAuditRecipients();
  const customerEmail =
    (typeof invoice.customer_email === "string" && invoice.customer_email) ||
    ((invoice.customer as Stripe.Customer | null)?.email ?? null);

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : "";
  const customerId = typeof invoice.customer === "string" ? invoice.customer : "";

  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject: `Stripe Payment Failed: ${customerEmail || customerId || subscriptionId || invoice.id}`,
      text: [
        "Stripe invoice payment failed",
        "",
        `Invoice ID: ${invoice.id}`,
        `Customer Email: ${customerEmail || "—"}`,
        `Customer ID: ${customerId || "—"}`,
        `Subscription ID: ${subscriptionId || "—"}`,
        `Status: ${invoice.status || "—"}`,
      ].join("\n"),
    });
  }

  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: "Payment update needed for your GPTO subscription",
      text: [
        "We were unable to process your latest subscription payment.",
        "",
        "Please update your payment method from your billing page:",
        `${getCheckoutBaseUrl()}/checkout/success`,
        "",
        "If you need help, reply to this email and our team will assist you.",
      ].join("\n"),
    });
  }
}

async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event) {
  const rawSession = event.data.object as Stripe.Checkout.Session;
  const session = await stripe.checkout.sessions.retrieve(rawSession.id, {
    expand: ["line_items.data.price"],
  });

  const result = await updateLeadFromCheckoutSession(session);
  if (!result) return;
  if (!result.newlyCompleted) return;

  try {
    await sendCustomerSuccessEmail(result.lead, session.id);
  } catch (error) {
    console.error("Failed to send customer success email:", error);
  }

  try {
    await sendInternalPaymentSuccessEmail(result.lead, session);
  } catch (error) {
    console.error("Failed to send internal payment success email:", error);
  }
}

async function handleSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const whereOr: Array<Record<string, string>> = [{ stripeSubscriptionId: subscription.id }];
  if (customerId) {
    whereOr.push({ stripeCustomerId: customerId });
  }

  await db.paymentLead.updateMany({
    where: {
      OR: whereOr,
    },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      subscriptionStatus: subscription.status,
    },
  });
}

async function handleInvoiceEvent(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  const status = invoice.status || (event.type === "invoice.payment_succeeded" ? "paid" : "failed");
  if (!customerId && !subscriptionId) {
    return;
  }
  const whereOr: Array<Record<string, string>> = [];
  if (subscriptionId) {
    whereOr.push({ stripeSubscriptionId: subscriptionId });
  }
  if (customerId) {
    whereOr.push({ stripeCustomerId: customerId });
  }

  const data: Record<string, string | null> = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    lastInvoiceStatus: status,
  };
  if (event.type === "invoice.payment_failed") {
    data.subscriptionStatus = "past_due";
  }

  await db.paymentLead.updateMany({
    where: {
      OR: whereOr,
    },
    data,
  });

  if (event.type === "invoice.payment_failed") {
    try {
      await sendPaymentFailedEmails(invoice);
    } catch (error) {
      console.error("Failed to send payment failed emails:", error);
    }
  }
}

async function processEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(stripe, event);
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event);
      return;
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      await handleInvoiceEvent(event);
      return;
    default:
      return;
  }
}

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook not configured. Add STRIPE_WEBHOOK_SECRET from Stripe Dashboard > Webhooks when ready." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ ok: false, error: `Invalid signature: ${error?.message || "unknown"}` }, { status: 400 });
  }

  try {
    const shouldProcess = await markEventReceived(event);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await processEvent(stripe, event);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    await unmarkEvent(event);
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Webhook processing failed" }, { status: 500 });
  }
}
