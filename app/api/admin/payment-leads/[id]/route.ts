import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lead = await db.paymentLead.findUnique({
      where: { id: params.id },
      include: {
        audit: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Payment lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    console.error("[Admin Payment Lead Details] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payment lead" }, { status: 500 });
  }
}
