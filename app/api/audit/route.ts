import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { buildRecommendations } from "./knowledgeBase";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(1),
  email: z.string().email().optional()
});

// ----------------------------
// Helpers
// ----------------------------
function normalizeInputUrl(input: string) {
  const raw = input.trim();
  if (!raw) throw new Error("Missing url");

  const withScheme =
    raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;

  const u = new URL(withScheme);
  u.hash = "";
  return u.toString();
}

function toGrade(score: number) {
  if (score === 100) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function clamp0to100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hasAny(text: string, phrases: string[]) {
  const t = (text || "").toLowerCase();
  return phrases.some((p) => t.includes(p));
}

async function fetchText(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "GPTO-AuditBot/0.1" }
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

// ----------------------------
// Deterministic discovery (sitemap + crawl)
// ----------------------------
async function getSitemapUrls(origin: string, maxPages: number) {
  try {
    const { status, text } = await fetchText(`${origin}/sitemap.xml`, 6000);
    if (status >= 400) return null;

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed: any = parser.parse(text);

    const urls: string[] = [];
    const urlsetRaw: any = parsed?.urlset?.url;

    const urlEntries: any[] = Array.isArray(urlsetRaw)
      ? urlsetRaw
      : urlsetRaw
      ? [urlsetRaw]
      : [];

    for (const entry of urlEntries) {
      const loc = entry?.loc;
      if (loc) urls.push(String(loc));
    }

    // ✅ Deterministic: sort, filter, then slice
    return urls
      .filter((u) => u.startsWith(origin))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, maxPages);
  } catch {
    return null;
  }
}

function extractInternalLinks(html: string, origin: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = String($(el).attr("href") || "").trim();
    if (!href) return;

    try {
      const u = new URL(href, origin);
      if (u.origin === origin) {
        u.hash = "";
        links.add(u.toString());
      }
    } catch {}
  });

  // ✅ Deterministic: sort
  return [...links].sort((a, b) => a.localeCompare(b));
}

function summarize(html: string) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const metaDescription = Boolean($('meta[name="description"]').attr("content"));
  const canonical = Boolean($('link[rel="canonical"]').attr("href"));
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 20000);

  return { title, metaDescription, canonical, h1Count, h2Count, hasJsonLd, text };
}

async function crawl(seedUrl: string) {
  const maxPages = 20; // stability + speed
  const maxDepth = 2;

  const seed = new URL(seedUrl);
  const origin = seed.origin;

  const sitemapUrls = await getSitemapUrls(origin, maxPages);
  const usedSitemap = Boolean(sitemapUrls?.length);

  const queue: { url: string; depth: number }[] = [];
  const seen = new Set<string>();

  if (usedSitemap) {
    for (const u of sitemapUrls!) {
      queue.push({ url: u, depth: 0 });
      seen.add(u);
    }
  } else {
    queue.push({ url: seedUrl, depth: 0 });
    seen.add(seedUrl);
  }

  const pages: any[] = [];
  const deadline = Date.now() + 20000;

  while (queue.length && pages.length < maxPages) {
    if (Date.now() > deadline) break;

    // ✅ Deterministic: queue is already in stable order; process in stable batches
    const batch = queue.splice(0, Math.min(8, queue.length));

    for (const item of batch) {
      if (Date.now() > deadline) break;
      if (pages.length >= maxPages) break;

      try {
        const { status, text } = await fetchText(item.url, 6000);
        if (status >= 400) {
          pages.push({ url: item.url, status });
          continue;
        }

        const s = summarize(text);
        pages.push({ url: item.url, status, ...s });

        if (!usedSitemap && item.depth < maxDepth) {
          const links = extractInternalLinks(text, origin);
          for (const link of links) {
            if (!seen.has(link) && seen.size < maxPages * 3) {
              seen.add(link);
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }

          // ✅ Deterministic: keep queue sorted after insertions
          queue.sort((a, b) => a.url.localeCompare(b.url));
        }
      } catch {
        pages.push({ url: item.url, status: 0 });
      }
    }
  }

  return { pages, scope: { maxPages, scannedPages: pages.length, usedSitemap }, origin };
}

// ----------------------------
// AI Clarity / Answerability
// ----------------------------
function computeAnswerability(pagesOk: any[], seedUrl: string, origin: string) {
  const n = pagesOk.length || 1;

  const WHAT = ["we help", "we provide", "our product", "our service", "platform", "solution"];
  const WHO = ["for teams", "for businesses", "for companies", "for marketers", "for recruiters", "for enterprises"];
  const HOW = ["how it works", "get started", "features", "pricing", "plans", "documentation", "api"];
  const TRUST = ["case study", "testimonials", "trusted by", "security", "privacy", "compliance", "terms", "gdpr", "soc 2"];

  const homeCandidates = new Set<string>([seedUrl, origin, `${origin}/`, `${origin}/home`]);
  const home = pagesOk.find((p) => homeCandidates.has(p.url));

  function pageText(p: any) {
    return `${p.title ?? ""} ${p.text ?? ""}`.slice(0, 12000);
  }

  const counts = { what: 0, who: 0, how: 0, trust: 0 };

  for (const p of pagesOk) {
    const t = pageText(p);
    if (hasAny(t, WHAT)) counts.what += 1;
    if (hasAny(t, WHO)) counts.who += 1;
    if (hasAny(t, HOW)) counts.how += 1;
    if (hasAny(t, TRUST)) counts.trust += 1;
  }

  // Coverage target: if dimension appears on ~35% of pages, treat as “good”
  const target = 0.35;

  const dimScore = (count: number) => {
    const rate = count / n;
    const normalized = Math.min(1, rate / target);
    return Math.round(25 * normalized);
  };

  let score =
    dimScore(counts.what) + dimScore(counts.who) + dimScore(counts.how) + dimScore(counts.trust);

  // Small homepage bonus
  if (home) {
    const ht = pageText(home);
    const bonus = (hasAny(ht, WHAT) ? 3 : 0) + (hasAny(ht, HOW) ? 3 : 0);
    score = Math.min(100, score + bonus);
  }

  return {
    score: clamp0to100(score),
    perDim: {
      what: { count: counts.what, total: n },
      who: { count: counts.who, total: n },
      how: { count: counts.how, total: n },
      trust: { count: counts.trust, total: n }
    }
  };
}

// ----------------------------
// Business Information Inference
// ----------------------------
function inferBusinessInfo(pages: any[], seedUrl: string, origin: string) {
  const ok = pages.filter((p) => p.status > 0 && p.status < 400);
  const homeCandidates = new Set<string>([seedUrl, origin, `${origin}/`, `${origin}/home`]);
  const home = ok.find((p) => homeCandidates.has(p.url));

  // Extract business name from homepage title or domain (smarter extraction)
  let businessName = "";
  if (home?.title) {
    // Remove common suffixes and clean up more intelligently
    businessName = home.title
      .replace(/\s*[-|–—]\s*(Home|Welcome|Official|Website|Site).*$/i, "")
      .replace(/\s*[-|–—]\s*.*$/, "")
      .replace(/\s*\|\s*.*$/, "")
      .replace(/\s*:\s*.*$/, "")
      .trim()
      .slice(0, 60);
    
    // If title is too generic, try to extract from domain
    if (businessName.length < 3 || businessName.toLowerCase().includes("home") || businessName.toLowerCase().includes("welcome")) {
      businessName = "";
    }
  }
  if (!businessName) {
    try {
      const hostname = new URL(seedUrl).hostname.replace(/^www\./, "");
      const domainParts = hostname.split(".");
      // Use domain name, capitalize properly
      businessName = domainParts[0]
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } catch {
      businessName = "Business";
    }
  }

  // Infer industry/segment from content patterns with confidence scoring
  const allText = ok.map((p) => `${p.title ?? ""} ${p.text ?? ""}`).join(" ").toLowerCase();
  const homeText = home ? `${home.title ?? ""} ${home.text ?? ""}`.toLowerCase() : "";
  
  const industryPatterns: Record<string, { patterns: string[]; weight: number }> = {
    "SaaS/Technology": { 
      patterns: ["saas", "software", "platform", "api", "cloud", "dashboard", "app", "application", "software as a service"],
      weight: 1.0
    },
    "E-commerce": { 
      patterns: ["shop", "store", "cart", "product", "buy", "purchase", "checkout", "shopping", "ecommerce"],
      weight: 1.2
    },
    "Healthcare": { 
      patterns: ["health", "medical", "patient", "doctor", "clinic", "hospital", "healthcare", "physician"],
      weight: 1.1
    },
    "Finance": { 
      patterns: ["finance", "banking", "investment", "loan", "credit", "payment", "financial", "fintech"],
      weight: 1.0
    },
    "Education": { 
      patterns: ["education", "course", "learn", "training", "student", "university", "school", "learning"],
      weight: 1.0
    },
    "Marketing/Agency": { 
      patterns: ["marketing", "agency", "advertising", "campaign", "seo", "ppc", "digital marketing", "ad agency"],
      weight: 1.1
    },
    "Real Estate": { 
      patterns: ["property", "real estate", "home", "listing", "realtor", "realty", "properties"],
      weight: 1.2
    },
    "Legal": { 
      patterns: ["law", "legal", "attorney", "lawyer", "litigation", "law firm", "legal services"],
      weight: 1.1
    },
    "Consulting": { 
      patterns: ["consulting", "consultant", "advisory", "strategy", "consulting services"],
      weight: 1.0
    }
  };

  let bestIndustry = "General";
  let bestScore = 0;
  
  for (const [ind, data] of Object.entries(industryPatterns)) {
    const matches = data.patterns.filter((p) => allText.includes(p)).length;
    const homeMatches = data.patterns.filter((p) => homeText.includes(p)).length;
    // Homepage matches count more
    const score = (matches * data.weight) + (homeMatches * data.weight * 2);
    if (score > bestScore) {
      bestScore = score;
      bestIndustry = ind;
    }
  }
  
  const industry = bestScore > 0 ? bestIndustry : "General";

  // Infer business model with better logic
  let businessModel = "Service";
  const modelSignals: Record<string, number> = {
    "SaaS/Subscription": 0,
    "E-commerce": 0,
    "B2B Service": 0,
    "B2C Service": 0
  };

  // SaaS signals
  if (hasAny(allText, ["subscription", "monthly", "annual", "plan", "pricing", "tier", "trial", "free trial"])) {
    modelSignals["SaaS/Subscription"] += 2;
  }
  if (hasAny(allText, ["api", "integration", "developer", "sdk"])) {
    modelSignals["SaaS/Subscription"] += 1;
  }

  // E-commerce signals
  if (hasAny(allText, ["shop", "store", "cart", "product", "buy now", "add to cart", "checkout"])) {
    modelSignals["E-commerce"] += 3;
  }
  if (hasAny(allText, ["shipping", "delivery", "inventory"])) {
    modelSignals["E-commerce"] += 1;
  }

  // B2B signals
  if (hasAny(allText, ["b2b", "enterprise", "for businesses", "for companies", "for teams", "for organizations"])) {
    modelSignals["B2B Service"] += 2;
  }
  if (hasAny(allText, ["enterprise", "corporate", "business solution"])) {
    modelSignals["B2B Service"] += 1;
  }

  // B2C signals
  if (hasAny(allText, ["b2c", "for consumers", "for customers", "for individuals"])) {
    modelSignals["B2C Service"] += 2;
  }

  const maxModel = Object.entries(modelSignals).reduce((a, b) => (a[1] > b[1] ? a : b));
  businessModel = maxModel[1] > 0 ? maxModel[0] : "Service";

  // Extract primary audiences with frequency scoring
  const audiencePatterns: Record<string, string[]> = {
    "teams": ["for teams", "team", "teams", "team collaboration"],
    "businesses": ["for businesses", "for companies", "business", "company"],
    "marketers": ["for marketers", "marketer", "marketing team", "marketing professional"],
    "developers": ["for developers", "developer", "dev", "engineering", "engineer"],
    "agencies": ["for agencies", "agency", "agencies"],
    "enterprises": ["for enterprises", "enterprise", "large organizations"],
    "startups": ["for startups", "startup", "startups", "early stage"],
    "recruiters": ["for recruiters", "recruiter", "recruiting", "talent acquisition"],
    "sales teams": ["for sales teams", "sales team", "sales professional", "sales rep"]
  };
  
  const audienceScores: Record<string, number> = {};
  for (const [audience, patterns] of Object.entries(audiencePatterns)) {
    const matches = patterns.filter((p) => allText.includes(p)).length;
    const homeMatches = patterns.filter((p) => homeText.includes(p)).length;
    audienceScores[audience] = matches + (homeMatches * 2);
  }

  const topAudiences = Object.entries(audienceScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([audience]) => audience);
  
  const primaryAudiences = topAudiences.length > 0 
    ? topAudiences.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")
    : "General audience";

  // Infer primary conversions with better detection
  const conversionPatterns: Record<string, { patterns: string[]; weight: number }> = {
    "Contact/Lead Form": { 
      patterns: ["contact", "get in touch", "request", "form", "inquiry", "reach out"],
      weight: 1.0
    },
    "Sign Up/Registration": { 
      patterns: ["sign up", "register", "create account", "get started", "join", "signup"],
      weight: 1.2
    },
    "Purchase/Checkout": { 
      patterns: ["buy", "purchase", "checkout", "add to cart", "order", "pay"],
      weight: 1.5
    },
    "Schedule/Demo": { 
      patterns: ["schedule", "book", "demo", "consultation", "appointment", "book a call"],
      weight: 1.3
    },
    "Download": { 
      patterns: ["download", "get", "free trial", "download now"],
      weight: 1.1
    }
  };

  let bestConversion = "Contact/Lead Form";
  let bestConvScore = 0;
  
  for (const [conv, data] of Object.entries(conversionPatterns)) {
    const matches = data.patterns.filter((p) => allText.includes(p)).length;
    const score = matches * data.weight;
    if (score > bestConvScore) {
      bestConvScore = score;
      bestConversion = conv;
    }
  }
  
  const primaryConversions = bestConvScore > 0 ? bestConversion : "Contact/Lead Form";

  // High-level funnel notes with more detail
  const hasPricing = hasAny(allText, ["pricing", "plans", "cost", "price", "pricing page"]);
  const hasFeatures = hasAny(allText, ["features", "benefits", "what you get", "capabilities"]);
  const hasTestimonials = hasAny(allText, ["testimonial", "review", "case study", "customer", "client"]);
  const hasBlog = ok.some((p) => p.url.toLowerCase().includes("blog") || p.url.toLowerCase().includes("news"));
  const hasAbout = ok.some((p) => p.url.toLowerCase().includes("about") || p.url.toLowerCase().includes("company"));
  
  const funnelNotes = [
    hasPricing ? "Pricing information present" : null,
    hasFeatures ? "Feature/benefit content present" : null,
    hasTestimonials ? "Social proof elements present" : null,
    hasBlog ? "Content/blog presence" : null,
    hasAbout ? "About/company page present" : null
  ]
    .filter(Boolean)
    .join(" • ") || "Standard conversion flow";

  return {
    businessName,
    website: seedUrl,
    industry,
    businessModel,
    primaryAudiences,
    primaryConversions,
    funnelNotes
  };
}

// ----------------------------
// Executive Summary Generation
// ----------------------------
function generateExecutiveSummary(
  grades: any,
  scores: any,
  businessInfo: any,
  explanations: any
): string {
  const lines: string[] = [];
  const businessName = businessInfo.businessName || "The site";

  // What the site does well (smarter detection)
  const strengths: string[] = [];
  const strengthDetails: string[] = [];
  
  if (grades.structure === "A" || grades.structure === "A+") {
    strengths.push("excellent structure");
    strengthDetails.push("pages are well-organized with clear titles and headings");
  } else if (grades.structure === "B" || grades.structure === "B+") {
    strengths.push("solid structure");
    strengthDetails.push("most pages have clear organization");
  }
  
  if (grades.technicalReadiness === "A" || grades.technicalReadiness === "A+") {
    strengths.push("strong technical foundation");
    strengthDetails.push("technical signals are well-implemented");
  } else if (grades.technicalReadiness === "B" || grades.technicalReadiness === "B+") {
    strengths.push("good technical foundation");
  }
  
  if (scores.overall >= 80) {
    strengths.push("strong AI discoverability");
    strengthDetails.push("AI systems can generally understand the brand");
  } else if (scores.overall >= 70) {
    strengths.push("reasonable AI discoverability");
  }
  
  if (grades.contentDepth === "A" || grades.contentDepth === "B") {
    strengths.push("substantial content depth");
    strengthDetails.push("pages provide detailed information");
  }

  // Build strength sentence intelligently
  let strengthText = "";
  if (strengths.length > 0) {
    if (strengths.length === 1) {
      strengthText = `${businessName} has ${strengths[0]}`;
    } else if (strengths.length === 2) {
      strengthText = `${businessName} has ${strengths[0]} and ${strengths[1]}`;
    } else {
      strengthText = `${businessName} has ${strengths.slice(0, -1).join(", ")}, and ${strengths[strengths.length - 1]}`;
    }
    if (strengthDetails.length > 0) {
      // Integrate detail smoothly into the sentence
      const detail = strengthDetails[0];
      strengthText += `; ${detail.charAt(0).toLowerCase() + detail.slice(1)}.`;
    } else {
      strengthText += ".";
    }
  } else {
    strengthText = `${businessName} has a functional website with basic online presence.`;
  }

  // Structural constraints (more nuanced)
  const constraints: string[] = [];
  const constraintSeverity: "high" | "medium" | "low" = 
    (grades.aiReadiness === "D" || grades.aiReadiness === "F" || 
     grades.contentDepth === "D" || grades.contentDepth === "F") ? "high" :
    (grades.aiReadiness === "C" || grades.contentDepth === "C") ? "medium" : "low";

  if (grades.aiReadiness === "D" || grades.aiReadiness === "F") {
    constraints.push("AI systems struggle significantly to understand and summarize the brand");
  } else if (grades.aiReadiness === "C") {
    constraints.push("AI systems have inconsistent understanding of what the brand does and who it serves");
  } else if (scores.aiReadiness < 70) {
    constraints.push("AI systems may miss key brand signals when recommending or summarizing");
  }
  
  if (grades.contentDepth === "D" || grades.contentDepth === "F") {
    constraints.push("content lacks the depth needed for confident AI recommendations");
  } else if (grades.contentDepth === "C" && scores.contentDepth < 60) {
    constraints.push("many pages lack sufficient detail for AI systems to make strong recommendations");
  }
  
  if (grades.structure === "D" || grades.structure === "F") {
    constraints.push("site structure limits clear communication of services and intent");
  } else if (grades.structure === "C" && scores.structure < 65) {
    constraints.push("inconsistent structure across pages reduces AI comprehension");
  }

  // Build constraint sentence
  let constraintText = "";
  if (constraints.length > 0) {
    if (constraints.length === 1) {
      constraintText = `However, ${constraints[0]}.`;
    } else if (constraints.length === 2) {
      constraintText = `However, ${constraints[0]}, and ${constraints[1]}.`;
    } else {
      constraintText = `However, ${constraints.slice(0, -1).join(", ")}, and ${constraints[constraints.length - 1]}.`;
    }
  } else {
    constraintText = "However, there are opportunities to improve AI visibility and ensure consistent brand communication.";
  }

  // What GPTO unlocks (context-aware)
  const unlocks: string[] = [];
  const unlockBenefits: string[] = [];
  
  if (grades.aiReadiness === "D" || grades.aiReadiness === "F") {
    unlocks.push("transforms the brand into a readable and recommendable entity for AI tools");
    unlockBenefits.push("ensures AI systems can accurately summarize and recommend the brand");
  } else if (grades.aiReadiness === "C" || scores.aiReadiness < 70) {
    unlocks.push("makes the brand consistently readable and recommendable by AI tools");
  } else {
    unlocks.push("enhances AI discoverability");
  }
  
  if (grades.contentDepth === "D" || grades.contentDepth === "F" || grades.contentDepth === "C") {
    unlocks.push("creates clear service and intent depth");
    unlockBenefits.push("provides the detail needed for confident AI recommendations");
  }
  
  if (grades.structure === "D" || grades.structure === "F" || grades.structure === "C") {
    unlocks.push("clarifies services, audiences, and intent");
    unlockBenefits.push("ensures consistent communication across all discovery channels");
  }

  // Build unlock sentence
  let unlockText = "";
  if (unlocks.length > 0) {
    if (unlocks.length === 1) {
      unlockText = `GPTO ${unlocks[0]} so the brand is correctly understood, found, and chosen across modern discovery channels.`;
    } else {
      unlockText = `GPTO ${unlocks.join(", ")} so the brand is correctly understood, found, and chosen across modern discovery channels.`;
    }
    if (unlockBenefits.length > 0 && unlockBenefits.length <= 2) {
      unlockText += ` ${unlockBenefits.join(" ")}`;
    }
  } else {
    unlockText = "GPTO enhances AI visibility and ensures the brand is correctly understood, found, and chosen across modern discovery channels.";
  }

  lines.push(strengthText);
  lines.push(constraintText);
  lines.push(unlockText);

  // Add tier-specific context intelligently
  if (explanations?.tierWhy?.[0]) {
    const tierContext = explanations.tierWhy[0].toLowerCase();
    if (tierContext.includes("baseline") || tierContext.includes("low") || tierContext.includes("prioritize")) {
      lines.push(`The current readiness level suggests prioritizing foundational improvements to establish clarity first.`);
    } else if (tierContext.includes("mixed") || tierContext.includes("inconsistent")) {
      lines.push(`Focusing on consistency and reinforcement will strengthen AI interpretation across all channels.`);
    }
  }

  // Ensure we don't exceed 6 lines, but make them meaningful
  const summary = lines.filter(Boolean).slice(0, 6).join(" ");
  
  // If summary is too short, add a closing line
  if (summary.length < 200 && lines.length < 6) {
    return summary + " This positions the brand for better performance in AI-driven search and answer engines.";
  }
  
  return summary;
}

// ----------------------------
// Scoring
// ----------------------------
function score(pages: any[], seedUrl: string, origin: string, usedSitemap: boolean) {
  const ok = pages.filter((p) => p.status > 0 && p.status < 400);
  const n = ok.length || 1;

  // Structure
  const titleRate = ok.filter((p) => p.title && p.title.length > 2).length / n;
  const h1Rate = ok.filter((p) => (p.h1Count ?? 0) >= 1).length / n;
  const metaRate = ok.filter((p) => p.metaDescription).length / n;
  const structureScore = clamp0to100(40 * titleRate + 35 * h1Rate + 25 * metaRate);

  // Content depth
  const avgText = ok.reduce((a, p) => a + (p.text?.length ?? 0), 0) / n;
  const avgH2 = ok.reduce((a, p) => a + (p.h2Count ?? 0), 0) / n;
  const contentScore = clamp0to100(
    (avgText >= 6000 ? 70 : avgText >= 2500 ? 55 : avgText >= 1200 ? 40 : 20) +
      (avgH2 >= 6 ? 25 : avgH2 >= 3 ? 15 : avgH2 >= 1 ? 5 : 0)
  );

  // Technical readiness
  const jsonLdRate = ok.filter((p) => p.hasJsonLd).length / n;
  const canonicalRate = ok.filter((p) => p.canonical).length / n;
  const errorRate =
    pages.filter((p) => p.status === 0 || p.status >= 400).length / (pages.length || 1);
  const technicalScore = clamp0to100(45 * jsonLdRate + 30 * canonicalRate + 25 * (1 - errorRate));

  // ✅ AI Clarity score
  const answer = computeAnswerability(ok, seedUrl, origin);
  const aiReadinessScore = answer.score;

  // ✅ Overall score = AI Clarity score (as you requested earlier)
  const overallScore = aiReadinessScore;

  // return both numeric and grade
  const scores = {
    aiReadiness: aiReadinessScore,
    structure: structureScore,
    contentDepth: contentScore,
    technicalReadiness: technicalScore,
    overall: overallScore
  };

  const grades = {
    aiReadiness: toGrade(aiReadinessScore),
    structure: toGrade(structureScore),
    contentDepth: toGrade(contentScore),
    technicalReadiness: toGrade(technicalScore),
    overall: toGrade(overallScore)
  };

  // Tier mapping
  let tier: "Bronze" | "Silver" | "Gold";
  if (grades.overall === "A+" || grades.overall === "A" || (grades.overall === "B" && grades.technicalReadiness !== "D" && grades.technicalReadiness !== "F" && grades.contentDepth !== "D" && grades.contentDepth !== "F")) {
    tier = "Gold";
  } else if (grades.overall === "B" || grades.overall === "C") {
    tier = "Silver";
  } else {
    tier = "Bronze";
  }

  const dims = answer.perDim;
  const dimRate = (d: any) => d.count / (d.total || 1);

  const aiStrengths: string[] = [];
  const aiGaps: string[] = [];

  if (dimRate(dims.what) >= 0.35) aiStrengths.push(`Clear “what you do” language appears on ${dims.what.count}/${dims.what.total} scanned pages.`);
  if (dimRate(dims.who) >= 0.35) aiStrengths.push(`Clear “who it’s for” language appears on ${dims.who.count}/${dims.who.total} scanned pages.`);
  if (dimRate(dims.how) >= 0.35) aiStrengths.push(`Clear “how it works” language appears on ${dims.how.count}/${dims.how.total} scanned pages.`);
  if (dimRate(dims.trust) >= 0.35) aiStrengths.push(`Trust/proof signals appear on ${dims.trust.count}/${dims.trust.total} scanned pages.`);

  if (dimRate(dims.what) < 0.2) aiGaps.push("“What you do” is not consistently stated across key pages.");
  if (dimRate(dims.who) < 0.2) aiGaps.push("“Who it’s for” is unclear or inconsistently stated.");
  if (dimRate(dims.how) < 0.2) aiGaps.push("High-level “how it works” details are limited or hard to find.");
  if (dimRate(dims.trust) < 0.2) aiGaps.push("Trust/proof signals (e.g., customers, case studies, security/privacy) are limited or not prominent.");

  const explanations = {
    tierWhy:
      tier === "Gold"
        ? ["Strong overall AI optimization readiness with solid fundamentals; focus on continuous iteration."]
        : tier === "Silver"
        ? ["Mixed readiness: improve answerability and reinforce fundamentals for consistent AI interpretation."]
        : ["Baseline readiness is low: prioritize clear, consistent explanations on core pages first."],
    perCategory: {
      aiReadiness: {
        strengths: aiStrengths.length ? aiStrengths : ["Answerability signals were limited at this scan depth."],
        gaps: aiGaps.length ? aiGaps : [],
        improvements: [
          "Add a clear one-paragraph “what we do” statement on the homepage and primary service/product page.",
          "Add a “who it’s for” section with 2–4 concrete audience examples.",
          "Add a short “how it works” section or FAQ that explains the workflow in plain language.",
          "Add trust signals (customer logos, case studies, security/privacy) near decision points."
        ]
      },
      structure: {
        strengths: [
          titleRate > 0.7 ? "Most pages include usable titles." : "Some pages include usable titles.",
          h1Rate > 0.7 ? "Headings (H1) are present across most pages." : "Headings (H1) appear inconsistently."
        ],
        gaps: metaRate < 0.6 ? ["Meta descriptions are missing on many pages."] : [],
        improvements: [
          "Standardize templates: 1 clear H1, supporting H2s, and a descriptive meta description on key pages.",
          "Strengthen internal linking between key pages to improve site comprehension."
        ]
      },
      contentDepth: {
        strengths: contentScore >= 70 ? ["Many pages contain substantial explanatory content and structured sections."] : [],
        gaps: contentScore < 70 ? ["Content appears thin on a meaningful portion of scanned pages."] : [],
        improvements: [
          "Add FAQs and decision content for your main services/offers.",
          "Expand thin pages with concrete details: who it’s for, how it works, proof points, and next steps."
        ]
      },
      technicalReadiness: {
        strengths:
          jsonLdRate > 0
            ? [`Structured data (JSON-LD) was observed on ${ok.filter((p) => p.hasJsonLd).length} pages.`]
            : [],
        gaps: jsonLdRate === 0 ? ["No structured data (JSON-LD schema) was observed on scanned pages."] : [],
        improvements: [
          "Add schema markup to core pages (Organization, WebSite, FAQ where appropriate).",
          "Ensure canonical tags are consistent and reduce broken/redirect-heavy URLs."
        ]
      }
    }
  };

  const signals = {
    titleRate,
    h1Rate,
    metaRate,
    avgText,
    avgH2,
    jsonLdRate,
    canonicalRate,
    errorRate,
    answerability: {
      whatRate: dimRate(dims.what),
      whoRate: dimRate(dims.who),
      howRate: dimRate(dims.how),
      trustRate: dimRate(dims.trust)
    },
    usedSitemap
  };

  const recommendations = buildRecommendations(signals as any);

  // Infer business information
  const businessInfo = inferBusinessInfo(pages, seedUrl, origin);

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(grades, scores, businessInfo, explanations);

  return {
    scores,
    grades,
    overallScore,
    tier,
    explanations,
    recommendations,
    signals,
    businessInfo,
    executiveSummary
  };
}

// ----------------------------
// 24h cache (simple, per-instance)
// NOTE: This won’t persist across cold starts, but it reduces repeat-run variance.
// ----------------------------
type CacheEntry = { ts: number; payload: any };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCacheMap(): Map<string, CacheEntry> {
  const g: any = globalThis as any;
  if (!g.__gptoAuditCache) g.__gptoAuditCache = new Map<string, CacheEntry>();
  return g.__gptoAuditCache as Map<string, CacheEntry>;
}

export async function POST(req: Request) {
  try {
    const parsed = Body.parse(await req.json());
    const url = normalizeInputUrl(parsed.url);

    const seed = new URL(url);
    const cacheKey = seed.origin; // cache per domain (most stable + what users expect)
    const cache = getCacheMap();

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }

    const started = Date.now();

    const { pages, scope, origin } = await crawl(url);
    const scored = score(pages, url, origin, scope.usedSitemap);
    const durationMs = Date.now() - started;

    const payload = {
      url,
      scope: { ...scope, durationMs },
      ...scored
    };

    cache.set(cacheKey, { ts: Date.now(), payload });

    // Save audit to database
    let auditId: string | null = null;
    try {
      const audit = await db.audit.create({
        data: {
          url,
          domain: seed.hostname,
          email: parsed.email || null,
          tier: scored.tier || null,
          scores: scored.scores,
          grades: scored.grades,
          recommendations: scored.recommendations || null,
          signals: scored.signals || null,
          scope: payload.scope
        }
      });
      auditId = audit.id;
    } catch (dbError: any) {
      // Log error but don't fail the request
      console.error("Failed to save audit to database:", dbError);
    }

    // Include audit ID in response for client-side linking
    const responsePayload = {
      ...payload,
      auditId
    };

    return NextResponse.json(responsePayload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}
