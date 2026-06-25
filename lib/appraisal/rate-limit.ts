export function evaluateAppraisalRateLimit(input: {
  hasRecentEmailDomainRequest: boolean;
  recentIpRequestCount: number;
}) {
  if (input.hasRecentEmailDomainRequest) {
    return {
      allowed: false,
      reason: "email-domain" as const,
      message: "A full appraisal for this email and domain was already requested within the last 24 hours.",
    };
  }
  if (input.recentIpRequestCount >= 3) {
    return {
      allowed: false,
      reason: "ip" as const,
      message: "The daily full-appraisal request limit has been reached. Please try again later.",
    };
  }
  return { allowed: true, reason: null, message: null };
}
