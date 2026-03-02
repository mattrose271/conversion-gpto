import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get total events count
    const totalEvents = await db.stripeWebhookEvent.count();

    // Get recent events count (last 24 hours)
    const recentEvents = await db.stripeWebhookEvent.count({
      where: {
        createdAt: {
          gte: last24Hours,
        },
      },
    });

    // Get total leads count
    const totalLeads = await db.paymentLead.count();

    // Get active subscriptions count
    const activeSubscriptions = await db.paymentLead.count({
      where: {
        subscriptionStatus: "active",
      },
    });

    // Get recent event types
    const recentEventTypesData = await db.stripeWebhookEvent.groupBy({
      by: ["eventType"],
      where: {
        createdAt: {
          gte: last24Hours,
        },
      },
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: "desc",
        },
      },
      take: 10,
    });

    const recentEventTypes = recentEventTypesData.map((item) => ({
      type: item.eventType,
      count: item._count.eventType,
    }));

    return NextResponse.json({
      totalEvents,
      recentEvents,
      totalLeads,
      activeSubscriptions,
      recentEventTypes,
    });
  } catch (error: any) {
    console.error("[Admin Stats] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
