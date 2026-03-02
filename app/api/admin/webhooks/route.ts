import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (search) {
      where.OR = [
        { stripeEventId: { contains: search, mode: "insensitive" } },
        { eventType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      db.stripeWebhookEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.stripeWebhookEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Admin Webhooks] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch webhook events" }, { status: 500 });
  }
}
