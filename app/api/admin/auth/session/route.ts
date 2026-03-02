import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await verifySession(token);

    if (!session) {
      // Clear invalid cookie
      cookieStore.delete("admin_session");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      email: session.email,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[Admin Auth] Session check error:", error?.message);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
