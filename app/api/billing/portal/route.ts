import { NextResponse } from "next/server";
import { z } from "zod";
import { getCheckoutBaseUrl } from "@/lib/payments";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
});

export async function POST(req: Request) {
  try {
    const input = Body.parse(await req.json());
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(input.sessionId);

    const customerId = typeof checkoutSession.customer === "string" ? checkoutSession.customer : null;
    if (!customerId) {
      return NextResponse.json({ ok: false, error: "No Stripe customer found for this session" }, { status: 400 });
    }

    const returnUrl = `${getCheckoutBaseUrl()}/checkout/success?session_id=${encodeURIComponent(input.sessionId)}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ ok: true, url: portalSession.url });
  } catch (error: any) {
    console.error("Failed to create billing portal session:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to create billing portal session" },
      { status: 400 }
    );
  }
}
