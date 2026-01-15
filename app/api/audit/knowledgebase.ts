export type Category = "aiReadiness" | "structure" | "contentDepth" | "technicalReadiness";

export type AuditSignals = {
  // Structure
  titleRate: number;
  h1Rate: number;
  metaRate: number;

  // Content
  avgText: number;
  avgH2: number;

  // Technical
  jsonLdRate: number;
  canonicalRate: number;
  errorRate: number;

  // AI Readiness (Answerability)
  answerability: {
    whatRate: number;
    whoRate: number;
    howRate: number;
    trustRate: number;
  };

  // Crawl context
  usedSitemap: boolean;
};

export type Recommendation = {
  id: string;
  category: Category;
  priority: "high" | "medium" | "low";
  title: string;
  why: string;
  how: string;
  sources?: string[]; // internal reference names
};

type Rule = {
  id: string;
  category: Category;
  priority: Recommendation["priority"];
  when: (s: AuditSignals) => boolean;
  title: string;
  why: (s: AuditSignals) => string;
  how: string;
  sources?: string[];
};

const RULES: Rule[] = [
  // -------- AI READINESS (Answerability) --------
  {
    id: "ai-what-missing",
    category: "aiReadiness",
    priority: "high",
    when: (s) => s.answerability.whatRate < 0.2,
    title: "Make 'what you do' explicit on core pages",
    why: () => "AI systems struggle when the primary offering is implied rather than stated clearly.",
    how: "Add a 1–2 sentence 'What we do' paragraph near the top of the homepage and primary service/product page."
  },
  {
    id: "ai-who-missing",
    category: "aiReadiness",
    priority: "high",
    when: (s) => s.answerability.whoRate < 0.2,
    title: "Add a clear 'who it’s for' section",
    why: () => "Answer engines perform better when audience and use-cases are explicitly stated.",
    how: "Add 2–4 concrete audience examples (e.g., roles/industries) and the problem you solve for them."
  },
  {
    id: "ai-how-missing",
    category: "aiReadiness",
    priority: "medium",
    when: (s) => s.answerability.howRate < 0.2,
    title: "Publish a simple 'how it works' / FAQ block",
    why: () => "Structured explanations help AI extract accurate step-by-step summaries.",
    how: "Add a short 'How it works' section or FAQ with 5–8 questions. Consider FAQ schema if appropriate.",
    sources: ["Google FAQPage docs"]
  },

  // -------- STRUCTURE --------
  {
    id: "structure-meta-missing",
    category: "structure",
    priority: "high",
    when: (s) => s.metaRate < 0.6,
    title: "Add meta descriptions on key pages",
    why: (s) => `A meaningful portion of scanned pages are missing meta descriptions (coverage ~${Math.round(s.metaRate * 100)}%).`,
    how: "Add unique meta descriptions for homepage, product/service pages, pricing, and key landing pages."
  },
  {
    id: "structure-h1-inconsistent",
    category: "structure",
    priority: "medium",
    when: (s) => s.h1Rate < 0.6,
    title: "Standardize headings (one clear H1 per page)",
    why: (s) => `H1 usage is inconsistent across scanned pages (coverage ~${Math.round(s.h1Rate * 100)}%).`,
    how: "Ensure each page has one primary H1 that matches the page intent, with supporting H2 sections."
  },

  // -------- TECHNICAL READINESS --------
  {
    id: "tech-jsonld-missing",
    category: "technicalReadiness",
    priority: "high",
    when: (s) => s.jsonLdRate === 0,
    title: "Add schema markup (JSON-LD) to core pages",
    why: () => "Structured data helps search engines understand page entities and can enable rich results.",
    how: "Start with Organization + WebSite schema on the homepage; add FAQPage schema where you have real FAQs.",
    sources: ["Google structured data intro", "Google Organization schema", "Google FAQPage schema", "Google structured data policies"]
  },
  {
    id: "tech-canonical-low",
    category: "technicalReadiness",
    priority: "medium",
    when: (s) => s.canonicalRate < 0.6,
    title: "Ensure canonical tags are consistently set",
    why: (s) => `Canonical usage is inconsistent (coverage ~${Math.round(s.canonicalRate * 100)}%).`,
    how: "Add canonical tags to indexable pages and ensure they point to the preferred URL."
  },
  {
    id: "tech-errors-high",
    category: "technicalReadiness",
    priority: "high",
    when: (s) => s.errorRate > 0.15,
    title: "Reduce crawl errors and failed responses",
    why: (s) => `A noticeable portion of scanned pages returned errors/timeouts (~${Math.round(s.errorRate * 100)}%).`,
    how: "Fix broken links, reduce redirect chains, and ensure server responses are stable for key pages."
  },
  {
    id: "tech-sitemap-missing",
    category: "technicalReadiness",
    priority: "medium",
    when: (s) => !s.usedSitemap,
    title: "Publish a sitemap and reference it in robots.txt",
    why: () => "Sitemaps support more consistent discovery for crawlers, especially on larger sites.",
    how: "Add /sitemap.xml and include its location in /robots.txt. Split large sitemaps if needed.",
    sources: ["Bing Webmaster Guidelines", "Bing AI-powered search & sitemaps"]
  }
];

const SOURCES: Record<string, string> = {
  "Google structured data intro": "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
  "Google structured data policies": "https://developers.google.com/search/docs/appearance/structured-data/sd-policies",
  "Google Organization schema": "https://developers.google.com/search/docs/appearance/structured-data/organization",
  "Google FAQPage schema": "https://developers.google.com/search/docs/appearance/structured-data/faqpage",
  "Bing Webmaster Guidelines": "https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a",
  "Bing AI-powered search & sitemaps": "https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search"
};

export function buildRecommendations(signals: AuditSignals) {
  const recs: Recommendation[] = [];

  for (const rule of RULES) {
    if (!rule.when(signals)) continue;
    recs.push({
      id: rule.id,
      category: rule.category,
      priority: rule.priority,
      title: rule.title,
      why: rule.why(signals),
      how: rule.how,
      sources: rule.sources?.map((k) => SOURCES[k]).filter(Boolean)
    });
  }

  // Order: high → medium → low
  recs.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : a.priority === "medium" && b.priority === "low" ? -1 : 1));
  return recs;
}
