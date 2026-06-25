const UNSAFE_PATTERNS: Array<[RegExp, string]> = [
  [/\bguarantee(?:d|s)?\b/gi, "support"],
  [/\bwill rank\b/gi, "is intended to strengthen ranking conditions"],
  [/\bwill increase (?:your )?traffic\b/gi, "is intended to strengthen discoverability conditions"],
  [/\bwill (?:generate|deliver|produce) (?:more )?leads\b/gi, "is intended to support clearer conversion paths"],
  [/\bwill (?:increase|grow|deliver) (?:your )?revenue\b/gi, "is intended to support commercial readiness"],
  [/\bwill improve (?:your )?roi\b/gi, "is intended to support more measurable execution"],
  [/\bwill (?:drive|deliver) hires\b/gi, "is intended to support clearer candidate journeys"],
  [/\bbeat(?:ing)? (?:your )?competitors\b/gi, "strengthen competitive clarity"],
  [/\bensure(?:s|d)? (?:placement|rankings?|traffic|leads?|revenue|roi)\b/gi, "support stronger visibility conditions"],
];

export function sanitizeClaimText(value: string): string {
  return UNSAFE_PATTERNS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value
  );
}

export function sanitizeClaimsDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeClaimText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeClaimsDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeClaimsDeep(item),
      ])
    ) as T;
  }
  return value;
}
