import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const email = username; // Support both username and email fields for backward compatibility

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const session = await createSession(email, password);

    if (!session) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set cookie with session token
    const cookieStore = await cookies();
    cookieStore.set("admin_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      email: session.email,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[Admin Auth] Login error:", error?.message);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
