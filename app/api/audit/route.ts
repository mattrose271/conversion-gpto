import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { buildRecommendations } from "./knowledgeBase"; // <- expects app/api/audit/knowledgeBase.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Accepts anything non-empty; we normalize/validate ourselves
const Body = z.object({ url: z.string().min(1) });

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
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

function hasAny(text: string, phrases: string[]) {
  const t = text.toLowerCase();
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

async function getSitemapUrls(origin: string, maxPages: number) {
  try {
    const { status, text } = await fetchText(`${origin}/sitemap.xml`);
    if (status >= 400) return null;

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed: any = parser.parse(text);

    const urls: string[] = [];
    const urlsetRaw: any = parsed?.urlset?.url;

    // Normalize to array (handles single <url> or many <url> entries)
    const urlEntries: any[] = Array.isArray(urlsetRaw)
      ? urlsetRaw
      : urlsetRaw
      ? [urlsetRaw]
      : [];

    for (const entry of urlEntries) {
      const loc = entry?.loc;
      if (loc) urls.push(String(loc));
    }

    return urls.filter((u) => u.startsWith(origin)).slice(0, maxPages);
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

  return [...links];
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
  const maxPages = 20; // ✅ speed
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
  const deadline = Date.now() + 20000; // ✅ hard cap total time

  while (queue.length && pages.length < maxPages) {
    if (Date.now() > deadline) break;

    const batch = queue.splice(0, Math.min(8, queue.length));

    for (const item of batch) {
      if (Date.now() > deadline) break;
      if (pages.length >= maxPages) break;

      try {
        const { status, text } = await fetchText(item.url);
        if (status >= 400) {
          pages.push({ url: item.url, status });
          continue;
        }

        const s = summarize(text);
        pages.push({ url: item.url, status, ...s });

        if (!usedSitemap && item.depth < maxDepth) {
          for (const link of extractInternalLinks(text, origin)) {
            if (!seen.has(link) && seen.size < maxPages * 3) {
              seen.add(link);
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }
        }
      } catch {
        pages.push({ url: item.url, status: 0 });
      }
    }
  }

  return { pages, scope: { maxPages, scannedPages: pages.length, usedSitemap }, origin };
}

/**
 * ✅ AI Readiness (Answerability): can an AI answer:
 * - what you do
 * - who it's for
 * - how it works
 * - trust/proof signals
 */
function computeAnswerability(pagesOk: any[], seedUrl: string, origin: string) {
  const n = pagesOk.length || 1;

  // Phrase sets (basic + tuneable)
  const WHAT = [
    "we help",
    "we provide",
    "we build",
    "our product",
    "our platform",
    "our service",
    "solution",
    "software",
    "platform"
  ];
  const WHO = [
    "for teams",
    "for businesses",
    "for customers",
    "for companies",
    "for creators",
    "for developers",
    "for marketers",
    "for recruiters",
    "for enterprises",
    "for small businesses"
  ];
  const HOW = [
    "how it works",
    "get started",
    "workflow",
    "features",
    "pricing",
    "plans",
    "integrations",
    "documentation",
    "api",
    "steps"
  ];
  const TRUST = [
    "case study",
    "testimonials",
    "customers",
    "trusted by",
    "security",
    "privacy",
    "compliance",
    "terms",
    "soc 2",
    "gdpr"
  ];

  // Homepage detection
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

  // Target coverage: if a dimension appears on ~35%+ of scanned pages, that's "good coverage"
  const target = 0.35;

  const dimScore = (count: number) => {
    const rate = count / n;
    const normalized = Math.min(1, rate / target);
    return Math.round(25 * normalized); // each dimension max 25
  };

  let score =
    dimScore(counts.what) + dimScore(counts.who) + dimScore(counts.how) + dimScore(counts.trust);

  // Small homepage bonus: if homepage exists and contains core "what" + "how"
  if (home) {
    const ht = pageText(home);
    const bonus = (hasAny(ht, WHAT) ? 3 : 0) + (hasAny(ht, HOW) ? 3 : 0);
    score = Math.min(100, score + bonus);
  }

  const perDim = {
    what: { count: counts.what, total: n },
    who: { count: counts.who, total: n },
    how: { count: counts.how, total: n },
    trust: { count: counts.trust, total: n }
  };

  return { score, perDim };
}

function score(pages: any[], seedUrl: string, origin: string, usedSitemap: boolean) {
  const ok = pages.filter((p) => p.status > 0 && p.status < 400);
  const n = ok.length || 1;

  // Structure
  const titleRate = ok.filter((p) => p.title && p.title.length > 2).length / n;
  const h1Rate = ok.filter((p) => (p.h1Count ?? 0) >= 1).length / n;
  const metaRate = ok.filter((p) => p.metaDescription).length / n;
  const structureScore = Math.round(40 * titleRate + 35 * h1Rate + 25 * metaRate);

  // Content depth (simple proxy)
  const avgText = ok.reduce((a, p) => a + (p.text?.length ?? 0), 0) / n;
  const avgH2 = ok.reduce((a, p) => a + (p.h2Count ?? 0), 0) / n;
  const contentScore = Math.round(
    (avgText >= 6000 ? 70 : avgText >= 2500 ? 55 : avgText >= 1200 ? 40 : 20) +
      (avgH2 >= 6 ? 25 : avgH2 >= 3 ? 15 : avgH2 >= 1 ? 5 : 0)
  );

  // Technical readiness
  const jsonLdRate = ok.filter((p) => p.hasJsonLd).length / n;
  const canonicalRate = ok.filter((p) => p.canonical).length / n;
  const errorRate =
    pages.filter((p) => p.status === 0 || p.status >= 400).length / (pages.length || 1);
  const technicalScore = Math.round(
    45 * jsonLdRate + 30 * canonicalRate + 25 * (1 - errorRate)
  );

  // ✅ AI Readiness = Answerability (overall)
  const answer = computeAnswerability(ok, seedUrl, origin);
  const aiReadinessScore = answer.score;

  const grades = {
    aiReadiness: toGrade(aiReadinessScore),
    structure: toGrade(structureScore),
    contentDepth: toGrade(contentScore),
    technicalReadiness: toGrade(technicalScore),

    // ✅ Overall grade = AI Readiness grade (as requested)
    overall: toGrade(aiReadinessScore)
  };

  // Tier mapping — still considers fundamentals
  let tier: "Bronze" | "Silver" | "Gold";
  if (
    grades.overall === "A" ||
    (grades.overall === "B" &&
      grades.technicalReadiness !== "D" &&
      grades.contentDepth !== "D")
  ) {
    tier = "Gold";
  } else if (grades.overall === "B" || grades.overall === "C") {
    tier = "Silver";
  } else {
    tier = "Bronze";
  }

  const dimLines = (label: string, count: number, total: number) =>
    `${label} language observed on ${count}/${total} scanned pages.`;

  const aiStrengths: string[] = [];
  const aiGaps: string[] = [];

  const dims = answer.perDim;

  // Strengths: dimensions with decent coverage
  if (dims.what.count / dims.what.total >= 0.35)
    aiStrengths.push(dimLines("Clear “what you do”", dims.what.count, dims.what.total));
  if (dims.who.count / dims.who.total >= 0.35)
    aiStrengths.push(dimLines("Clear “who it’s for”", dims.who.count, dims.who.total));
  if (dims.how.count / dims.how.total >= 0.35)
    aiStrengths.push(dimLines("Clear “how it works”", dims.how.count, dims.how.total));
  if (dims.trust.count / dims.trust.total >= 0.35)
    aiStrengths.push(dimLines("Trust/proof signals", dims.trust.count, dims.trust.total));

  // Gaps: dimensions with weak coverage
  if (dims.what.count / dims.what.total < 0.2)
    aiGaps.push("“What you do” is not consistently stated across key pages.");
  if (dims.who.count / dims.who.total < 0.2)
    aiGaps.push("“Who it’s for” is unclear or inconsistently stated.");
  if (dims.how.count / dims.how.total < 0.2)
    aiGaps.push("High-level “how it works” details are limited or hard to find.");
  if (dims.trust.count / dims.trust.total < 0.2)
    aiGaps.push("Trust/proof signals (e.g., customers, case studies, security) are limited or not prominent.");

  const explanations = {
    tierWhy:
      tier === "Gold"
        ? ["Strong overall AI optimization readiness with solid fundamentals; focus on continuous iteration."]
        : tier === "Silver"
        ? ["Mixed readiness: improve answerability and reinforce fundamentals for consistent AI interpretation."]
        : ["Baseline readiness is low: prioritize clear, consistent explanations on core pages first."],
    perCategory: {
      aiReadiness: {
        strengths: aiStrengths.length ? aiStrengths : ["Answerability signals were limited across scanned pages."],
        gaps: aiGaps.length ? aiGaps : ["No major answerability gaps detected at this scan depth."],
        improvements: [
          "Add a clear one-paragraph “what we do” statement on the homepage and primary product/service page.",
          "Add a “who it’s for” section with 2–4 concrete audience examples.",
          "Add a short “how it works” section or FAQ that explains the workflow in plain language.",
          "Add trust signals (customer logos, case studies, security/privacy) where appropriate."
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
        strengths:
          contentScore >= 70
            ? ["Many pages contain substantial explanatory content and structured sections."]
            : [],
        gaps:
          contentScore < 70
            ? ["Content appears thin on a meaningful portion of scanned pages."]
            : [],
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

  // ✅ Knowledge-base recommendations (basic industry best practices)
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
      whatRate: answer.perDim.what.count / answer.perDim.what.total,
      whoRate: answer.perDim.who.count / answer.perDim.who.total,
      howRate: answer.perDim.how.count / answer.perDim.how.total,
      trustRate: answer.perDim.trust.count / answer.perDim.trust.total
    },
    usedSitemap
  };

  const recommendations = buildRecommendations(signals as any);

  return {
    grades,
    tier,
    explanations,
    recommendations,

    // Optional debug (remove if you prefer)
    _debug: {
      aiReadinessScore,
      structureScore,
      contentScore,
      technicalScore,
      answerabilityDims: answer.perDim
    }
  };
}

export async function POST(req: Request) {
  try {
    const parsed = Body.parse(await req.json());
    const url = normalizeInputUrl(parsed.url);

    const started = Date.now();

    const { pages, scope, origin } = await crawl(url);
    const scored = score(pages, url, origin, scope.usedSitemap);
    const durationMs = Date.now() - started;

    return NextResponse.json({
      url,
      scope: { ...scope, durationMs },
      ...scored
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}
