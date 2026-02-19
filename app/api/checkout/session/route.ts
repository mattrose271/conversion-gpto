import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTierFromSession } from "@/lib/payments";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || "";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "session_id is required" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price"],
    });

    const firstLineItem = session.line_items?.data?.[0];
    const priceId = typeof firstLineItem?.price?.id === "string" ? firstLineItem.price.id : null;
    const amountTotal = session.amount_total ?? null;

    let tier =
      getTierFromSession(
        session.metadata?.tier as string | null,
        amountTotal,
        priceId
      ) || null;

    if (tier && tier.length > 0) {
      const normalized = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
      if (normalized === "Bronze" || normalized === "Silver" || normalized === "Gold") {
        tier = normalized;
      }
    }

    const lead = await db.paymentLead.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      select: {
        id: true,
        name: true,
        businessName: true,
        website: true,
        email: true,
        tier: true,
        checkoutStatus: true,
        subscriptionStatus: true,
      },
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || session.customer_email || lead?.email || null,
        currency: session.currency || null,
        amountTotal: session.amount_total || null,
        tier: tier || lead?.tier || null,
        lead,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch checkout session:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to fetch checkout session" },
      { status: 400 }
    );
  }
}
