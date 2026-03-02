import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config: any = {
      webhookSecret: {
        configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        value: process.env.STRIPE_WEBHOOK_SECRET
          ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + "..."
          : null,
      },
      stripeKeys: {
        secretKey: {
          configured: !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY),
          test: !!process.env.STRIPE_SECRET_KEY,
          live: !!process.env.STRIPE_LIVE_SECRET_KEY,
        },
      },
      endpoint: {
        url: "https://consultingsr.com/api/stripe-webhook",
        reachable: false,
      },
      environment: {
        mode: process.env.NEXT_PUBLIC_ENV || "development",
        useLive: process.env.STRIPE_USE_LIVE === "true" || process.env.NEXT_PUBLIC_ENV === "production",
      },
      webhookEndpoints: [] as any[],
    };

    // Test endpoint reachability
    try {
      const endpointUrl = config.endpoint.url;
      const response = await fetch(endpointUrl, { method: "GET" });
      config.endpoint.reachable = response.ok;
      config.endpoint.statusCode = response.status;
    } catch (error) {
      config.endpoint.reachable = false;
      config.endpoint.error = "Could not reach endpoint";
    }

    // Try to fetch webhook endpoints from Stripe
    try {
      const stripe = getStripeClient();
      const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
      config.webhookEndpoints = endpoints.data.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status,
        enabled: endpoint.status === "enabled",
        apiVersion: endpoint.api_version,
        events: endpoint.enabled_events,
        created: endpoint.created,
      }));
    } catch (error: any) {
      config.webhookEndpointsError = error.message;
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("[Admin Config] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}
