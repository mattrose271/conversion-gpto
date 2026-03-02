import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { parseStripeMode, STRIPE_MODE_COOKIE } from "@/lib/stripe-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = parseStripeMode(body?.mode);
    const response = NextResponse.json({ ok: true, mode });

    if (mode === "auto") {
      response.cookies.delete(STRIPE_MODE_COOKIE);
    } else {
      response.cookies.set({
        name: STRIPE_MODE_COOKIE,
        value: mode,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to set Stripe mode" }, { status: 400 });
  }
}
