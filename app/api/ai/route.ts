import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";

const Body = z.object({ url: z.string().url() });

function toGrade(score: number) {
  if (score === 100) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
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

const USER_AGENT = "GPTO-AuditBot/0.1";
const MAX_SITEMAP_FILES = 12;

type FetchTextOptions = {
  timeoutMs?: number;
  retries?: number;
  method?: "GET" | "HEAD";
  accept?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function equivalentHost(a: string, b: string) {
  const aa = (a || "").toLowerCase().replace(/^www\./, "");
  const bb = (b || "").toLowerCase().replace(/^www\./, "");
  return aa === bb;
}

function isInScope(u: URL, scopeHost: string) {
  return /^https?:$/i.test(u.protocol) && equivalentHost(u.hostname, scopeHost);
}

function normalizeCrawlUrl(raw: string) {
  const u = new URL(raw);
  u.hash = "";
  if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.toString();
}

function shouldSkipPath(pathname: string) {
  const lower = (pathname || "").toLowerCase();
  if (/^\/(?:_next|api|static)\b/.test(lower)) return true;
  return /\.(?:js|css|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|zip|gz|xml|txt|csv|mp4|webm)$/i.test(
    lower
  );
}

function shouldCrawlUrl(u: URL) {
  return !shouldSkipPath(u.pathname);
}

async function fetchText(url: string, timeoutOrOptions: number | FetchTextOptions = 12000) {
  const opts: FetchTextOptions =
    typeof timeoutOrOptions === "number" ? { timeoutMs: timeoutOrOptions } : timeoutOrOptions;
  const timeoutMs = opts.timeoutMs ?? 12000;
  const retries = opts.retries ?? 1;
  const method = opts.method ?? "GET";
  const accept = opts.accept;

  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        method,
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          ...(accept ? { accept } : {}),
        },
      });
      const text = method === "HEAD" ? "" : await res.text();
      return { status: res.status, text, finalUrl: res.url };
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) await sleep(200 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }

  throw lastError;
}

function readLocValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    if (typeof value["#text"] === "string") return value["#text"].trim() || null;
    if (typeof value.__text === "string") return value.__text.trim() || null;
  }
  return null;
}

function parseSitemapXml(xml: string): { pageUrls: string[]; childSitemaps: string[] } {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed: any = parser.parse(xml);

  const pageUrls: string[] = [];
  for (const entry of toArray(parsed?.urlset?.url)) {
    const loc = readLocValue((entry as any)?.loc);
    if (loc) pageUrls.push(loc);
  }

  const childSitemaps: string[] = [];
  for (const entry of toArray(parsed?.sitemapindex?.sitemap)) {
    const loc = readLocValue((entry as any)?.loc);
    if (loc) childSitemaps.push(loc);
  }

  return { pageUrls, childSitemaps };
}

async function getRobotsSitemaps(origin: string) {
  try {
    const { status, text } = await fetchText(`${origin}/robots.txt`, {
      timeoutMs: 8000,
      retries: 1,
      accept: "text/plain,*/*",
    });
    if (status >= 400 || !text) return [];

    const urls: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (!match) continue;
      try {
        urls.push(new URL(match[1].trim(), origin).toString());
      } catch {}
    }
    return urls;
  } catch {
    return [];
  }
}

async function getSitemapUrls(origin: string, scopeHost: string, maxPages: number) {
  const robotsSitemaps = await getRobotsSitemaps(origin);
  const defaultCandidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  const queue = [...new Set([...robotsSitemaps, ...defaultCandidates].map((u) => normalizeCrawlUrl(u)))];
  const seenSitemaps = new Set<string>();
  const pageUrls = new Set<string>();
  const discoveryDeadline = Date.now() + 15000;

  while (queue.length && seenSitemaps.size < MAX_SITEMAP_FILES && pageUrls.size < maxPages * 8) {
    if (Date.now() > discoveryDeadline) break;

    const sitemapUrl = queue.shift()!;
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);

    try {
      const remaining = discoveryDeadline - Date.now();
      const timeoutMs = Math.max(2500, Math.min(7000, remaining));
      const { status, text } = await fetchText(sitemapUrl, {
        timeoutMs,
        retries: 0,
        accept: "application/xml,text/xml,*/*",
      });
      if (status >= 400) continue;

      const { pageUrls: parsedUrls, childSitemaps } = parseSitemapXml(text);

      for (const raw of parsedUrls) {
        try {
          const u = new URL(raw, origin);
          if (!isInScope(u, scopeHost) || !shouldCrawlUrl(u)) continue;
          pageUrls.add(normalizeCrawlUrl(u.toString()));
        } catch {}
      }

      for (const raw of childSitemaps) {
        try {
          const child = normalizeCrawlUrl(new URL(raw, sitemapUrl).toString());
          if (!seenSitemaps.has(child) && queue.length < MAX_SITEMAP_FILES * 4) queue.push(child);
        } catch {}
      }
    } catch {}
  }

  return [...pageUrls].sort((a, b) => a.localeCompare(b)).slice(0, maxPages);
}

function buildHeuristicSeedUrls(origin: string) {
  const paths = ["/job", "/jobs", "/careers", "/search", "/about-us", "/open-positions", "/positions"];
  return paths.map((p) => normalizeCrawlUrl(new URL(p, origin).toString())).sort((a, b) => a.localeCompare(b));
}

function addInternalLinkCandidate(raw: string, origin: string, scopeHost: string, links: Set<string>) {
  try {
    const u = new URL(raw, origin);
    if (!isInScope(u, scopeHost) || !shouldCrawlUrl(u)) return;
    links.add(normalizeCrawlUrl(u.toString()));
  } catch {}
}

function extractInternalLinks(html: string, origin: string, scopeHost: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = String($(el).attr("href") || "").trim();
    if (!href) return;
    addInternalLinkCandidate(href, origin, scopeHost, links);
  });

  $('link[rel="canonical"][href], link[rel="alternate"][href]').each((_, el) => {
    const href = String($(el).attr("href") || "").trim();
    if (!href) return;
    addInternalLinkCandidate(href, origin, scopeHost, links);
  });

  const escapedHost = scopeHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const absolutePattern = new RegExp(`https?:\\/\\/${escapedHost}[^"'\\s<>{})]+`, "gi");
  const escapedAbsolutePattern = new RegExp(`https?:\\\\/\\\\/${escapedHost}[^"'\\s<>{})]+`, "gi");
  const rootPathPattern = /["'`](\/[a-zA-Z0-9][^"'`<>\s]{0,220})["'`]/g;

  for (const match of html.match(absolutePattern) || []) {
    addInternalLinkCandidate(match, origin, scopeHost, links);
  }
  for (const match of html.match(escapedAbsolutePattern) || []) {
    addInternalLinkCandidate(match.replace(/\\\//g, "/"), origin, scopeHost, links);
  }
  for (const match of html.match(rootPathPattern) || []) {
    const path = match.slice(1, -1);
    addInternalLinkCandidate(path, origin, scopeHost, links);
  }

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

async function crawl(url: string) {
  const maxPages = 60;
  const maxDepth = 2;

  const seed = new URL(url);
  const origin = seed.origin;
  const scopeHost = seed.hostname;

  const sitemapUrls = await getSitemapUrls(origin, scopeHost, maxPages);
  const usedSitemap = Boolean(sitemapUrls?.length);

  const queue: { url: string; depth: number }[] = [];
  const seen = new Set<string>();
  let fallbackSeedsInjected = false;

  if (usedSitemap) {
    for (const u of sitemapUrls!) {
      queue.push({ url: u, depth: 0 });
      seen.add(u);
    }
  } else {
    const normalizedSeed = normalizeCrawlUrl(url);
    queue.push({ url: normalizedSeed, depth: 0 });
    seen.add(normalizedSeed);
  }

  const pages: any[] = [];
  const deadline = Date.now() + 30000;

  while (queue.length && pages.length < maxPages) {
    if (Date.now() > deadline) break;

    // small batches to keep things responsive and avoid huge request storms
    const batch = queue.splice(0, Math.min(8, queue.length));

    // Sequential processing (no p-limit)
    for (const item of batch) {
      if (Date.now() > deadline) break;
      if (pages.length >= maxPages) break;

      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const timeoutMs = Math.max(1500, Math.min(5000, remaining));
        const { status, text } = await fetchText(item.url, { timeoutMs, retries: 0 });
        if (status >= 400) {
          pages.push({ url: item.url, status });
          continue;
        }

        const s = summarize(text);
        pages.push({ url: item.url, status, ...s });

        if (!usedSitemap && item.depth < maxDepth) {
          const links = extractInternalLinks(text, origin, scopeHost);
          const discoveryLinks = [...links];
          if (!fallbackSeedsInjected && item.depth === 0 && discoveryLinks.length === 0) {
            discoveryLinks.push(...buildHeuristicSeedUrls(origin));
            fallbackSeedsInjected = true;
          }

          for (const link of discoveryLinks) {
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

  return { pages, scope: { maxPages, scannedPages: pages.length, usedSitemap, fallbackSeedsInjected } };
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
  const errorRate = pages.filter((p) => p.status === 0 || p.status >= 400).length / (pages.length || 1);
  const technicalScore = Math.round(45 * jsonLdRate + 30 * canonicalRate + 25 * (1 - errorRate));

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
  if (overall === "A+" || overall === "A" || (overall === "B" && grades.technicalReadiness !== "D" && grades.technicalReadiness !== "F" && grades.contentDepth !== "D" && grades.contentDepth !== "F")) tier = "Gold";
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
        strengths: aiScore >= 70 ? ["AI/automation language appears across multiple public pages (observable signals)."] : [],
        gaps: aiScore < 70 ? ["Limited or no explicit public AI/automation disclosure signals were observed in scanned pages."] : [],
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
        strengths: contentScore >= 70 ? ["Many pages contain substantial explanatory content and structured sections."] : [],
        gaps: contentScore < 70 ? ["Content appears thin on a meaningful portion of scanned pages."] : [],
        improvements: [
          "Add FAQs and decision content for your main services/offers.",
          "Expand thin pages with concrete details: who it’s for, how it works, proof points, and next steps."
        ]
      },
      technicalReadiness: {
        strengths: jsonLdRate > 0 ? [`Structured data (JSON-LD) was observed on ${ok.filter((p) => p.hasJsonLd).length} pages.`] : [],
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
