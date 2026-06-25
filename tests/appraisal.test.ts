import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTier } from "../lib/tiers";
import { sanitizeClaimText } from "../lib/appraisal/safety";
import { selectAppraisalPackage } from "../lib/appraisal/package-selection";
import { evaluateAppraisalRateLimit } from "../lib/appraisal/rate-limit";
import {
  ModuleOutputSchema,
  UnifiedOutputSchema,
  type ModuleOutput,
  type UnifiedOutput,
} from "../lib/appraisal/types";
import { createAppraisalAccessToken, hashAppraisalToken } from "../lib/appraisal/token";

function module(rating: ModuleOutput["rating"]): ModuleOutput {
  return ModuleOutputSchema.parse({
    title: "Module",
    rating,
    summary: "Evidence-led summary.",
    observedFindings: [],
    inferredFindings: [],
    blockers: [],
    unknowns: [],
    priorities: ["Improve clarity."],
    packageImplications: [],
  });
}

function unified(overrides: Partial<UnifiedOutput> = {}): UnifiedOutput {
  return UnifiedOutputSchema.parse({
    title: "Unified Five-Layer Appraisal",
    overallRating: "Adequate",
    executiveSummary: "Unified summary.",
    strongestFindings: [],
    crossLayerDependencies: [],
    blockers: [],
    unknowns: [],
    priorities: ["Coordinate improvements."],
    complexityTriggers: [],
    ...overrides,
  });
}

test("tier aliases normalize to canonical names", () => {
  assert.equal(normalizeTier("Bronze"), "Foundation");
  assert.equal(normalizeTier("Silver"), "Growth");
  assert.equal(normalizeTier("Gold"), "Elite");
  assert.equal(normalizeTier("growth"), "Growth");
});

test("claim safety rewrites unsupported guarantees", () => {
  const result = sanitizeClaimText("This will increase traffic and guarantee rankings.");
  assert.doesNotMatch(result, /guarantee|will increase traffic/i);
});

test("package selection chooses Foundation for limited gaps", () => {
  const result = selectAppraisalPackage(
    [module("Strong"), module("Strong"), module("Strong"), module("Adequate"), module("Strong")],
    unified()
  );
  assert.equal(result.tier, "Foundation");
});

test("package selection chooses Growth for broad weakness", () => {
  const result = selectAppraisalPackage(
    [module("Weak"), module("Weak"), module("Adequate"), module("Strong"), module("Strong")],
    unified()
  );
  assert.equal(result.tier, "Growth");
});

test("package selection chooses Elite only with Growth need and two complexity triggers", () => {
  const result = selectAppraisalPackage(
    [module("Weak"), module("Weak"), module("Adequate"), module("Strong"), module("Strong")],
    unified({ complexityTriggers: ["multi-market", "multi-offer"] })
  );
  assert.equal(result.tier, "Elite");
});

test("access tokens are random and stored as stable hashes", () => {
  const first = createAppraisalAccessToken();
  const second = createAppraisalAccessToken();
  assert.notEqual(first.token, second.token);
  assert.equal(hashAppraisalToken(first.token), first.tokenHash);
  assert.equal(first.tokenHash.length, 64);
});

test("rate limits enforce email/domain and IP thresholds", () => {
  assert.equal(
    evaluateAppraisalRateLimit({ hasRecentEmailDomainRequest: true, recentIpRequestCount: 0 }).reason,
    "email-domain"
  );
  assert.equal(
    evaluateAppraisalRateLimit({ hasRecentEmailDomainRequest: false, recentIpRequestCount: 3 }).reason,
    "ip"
  );
  assert.equal(
    evaluateAppraisalRateLimit({ hasRecentEmailDomainRequest: false, recentIpRequestCount: 2 }).allowed,
    true
  );
});

test("module schema rejects unstructured output", () => {
  assert.throws(() => ModuleOutputSchema.parse({ rating: "Good" }));
});
