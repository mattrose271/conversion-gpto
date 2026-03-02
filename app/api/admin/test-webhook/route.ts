import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getAdminSession } from "@/lib/admin-auth";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventType } = await req.json();

    if (!eventType) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    const stripe = getStripeClient();

    // Trigger a test event using Stripe CLI simulation
    // Note: This requires the Stripe CLI to be running locally
    // For production, you would use stripe.events.create() or stripe.testHelpers.events.create()
    // But for now, we'll provide instructions and return the webhook secret

    // Get webhook secret for display
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "Not configured";

    // Return instructions and webhook secret
    return NextResponse.json({
      success: true,
      message: "To test webhooks locally, use the Stripe CLI",
      webhookSecret: webhookSecret.startsWith("whsec_") ? webhookSecret.substring(0, 10) + "..." : webhookSecret,
      instructions: [
        "1. Install Stripe CLI: https://stripe.com/docs/stripe-cli",
        `2. Run: stripe listen --forward-to localhost:3000/api/stripe-webhook (for local testing)`,
        `3. For production, ensure webhook endpoint is registered: https://consultingsr.com/api/stripe-webhook`,
        `4. In another terminal, run: stripe trigger ${eventType}`,
        "5. Check the webhook events page to see the event",
      ],
      productionUrl: "https://consultingsr.com/api/stripe-webhook",
      eventType,
    });
  } catch (error: any) {
    console.error("[Admin Test Webhook] Error:", error?.message);
    return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 });
  }
}
