import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (token) {
      await deleteSession(token);
    }

    // Clear the cookie
    cookieStore.delete("admin_session");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin Auth] Logout error:", error?.message);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
