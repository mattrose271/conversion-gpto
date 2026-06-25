import { createHash, randomBytes } from "crypto";

export const APPRAISAL_TOKEN_TTL_DAYS = 90;

export function createAppraisalAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashAppraisalToken(token),
    expiresAt: new Date(Date.now() + APPRAISAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function hashAppraisalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashRateLimitValue(value: string): string {
  const secret = process.env.APPRAISAL_RATE_LIMIT_SECRET || process.env.ADMIN_SESSION_SECRET || "gpto-appraisal";
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}
