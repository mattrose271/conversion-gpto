import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ url: z.string().url() });

function toGrade(score: number) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

function containsAIText(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("artificial intelligence") ||
    t.includes("machine learning") ||
    t.includes("automation") ||
    t.includes("ai ")
  );
}

async function fetchText(url: string, timeoutMs = 12000) {
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

async function crawl(url: string) {
  const maxPages = 60;
  const maxDepth = 2;

  const seed = new URL(url);
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
    queue.push({ url, depth: 0 });
    seen.add(url);
  }

  const pages: any[] = [];

  while (queue.length && pages.length < maxPages) {
    // Small batches to avoid huge request storms
    const batch = queue.splice(0, Math.min(8, queue.length));

    // Sequential processing (no p-limit)
    for (const item of batch) {
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

  return { pages, scope: { maxPages, scannedPages: pages.length, usedSitemap } };
}

function score(pages: any[]) {
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
    pages.filter((p) => p.status === 0 || p.status >= 400).length /
    (pages.length || 1);
  const technicalScore = Math.round(
    45 * jsonLdRate + 30 * canonicalRate + 25 * (1 - errorRate)
  );

  // AI openness
  const aiMentionsRate = ok.filter((p) => containsAIText(p.text || "")).length / n;
  const aiScore = Math.round(100 * aiMentionsRate);

  const grades = {
    aiOpenness: toGrade(aiScore),
    structure: toGrade(structureScore),
    contentDepth: toGrade(contentScore),
    technicalReadiness: toGrade(technicalScore)
  };

  const overallScore = (aiScore + structureScore + contentScore + technicalScore) / 4;
  const overall = toGrade(overallScore);

  // Tier mapping (simple + explainable)
  let tier: "Bronze" | "Silver" | "Gold";
  if (
    overall === "A" ||
    (overall === "B" &&
      grades.technicalReadiness !== "D" &&
      grades.contentDepth !== "D")
  )
    tier = "Gold";
  else if (overall === "B" || overall === "C") tier = "Silver";
  else tier = "Bronze";

  const explanations = {
    tierWhy:
      tier === "Gold"
        ? ["Strong overall readiness with solid technical and content foundations; focus on continuous optimization."]
        : tier === "Silver"
        ? ["Mixed readiness: good base but clear gaps; prioritize structured content and technical signals."]
        : ["Fundamentals are weak or missing; focus on baseline clarity and trust signals first."],
    perCategory: {
      aiOpenness: {
        strengths:
          aiScore >= 70
            ? ["AI/automation language appears across multiple public pages (observable signals)."]
            : [],
        gaps:
          aiScore < 70
            ? ["Limited or no explicit public AI/automation disclosure signals were observed in scanned pages."]
            : [],
        improvements: [
          "Add an AI/automation transparency note or policy page if AI-driven experiences are used.",
          "Add plain-language explainers (what is automated vs human-reviewed) where applicable."
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

  return { grades: { ...grades, overall }, tier, explanations };
}

export async function POST(req: Request) {
  try {
    const { url } = Body.parse(await req.json());
    const started = Date.now();

    const { pages, scope } = await crawl(url);
    const scored = score(pages);
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
