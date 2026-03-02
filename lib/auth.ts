import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionData {
  id: string;
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
}

/**
 * Verify admin credentials and create a session
 */
export async function createSession(email: string, password: string): Promise<SessionData | null> {
  // Find user by email
  const user = await db.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Generate a secure random token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Store session in database
  const session = await db.adminSession.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    id: session.id,
    token: session.token,
    userId: user.id,
    email: user.email,
    expiresAt: session.expiresAt,
  };
}

/**
 * Verify a session token and return session data if valid
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  if (!token) {
    return null;
  }

  const session = await db.adminSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    email: session.user.email,
    expiresAt: session.expiresAt,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await db.adminSession.deleteMany({
    where: { token },
  });
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.adminSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Hash a password (useful for setting up admin password)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
