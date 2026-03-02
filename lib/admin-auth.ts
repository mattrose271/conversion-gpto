import { cookies } from "next/headers";
import { verifySession, SessionData } from "./auth";

/**
 * Verify admin session from request cookies
 * Returns session data if valid, null otherwise
 */
export async function getAdminSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}
