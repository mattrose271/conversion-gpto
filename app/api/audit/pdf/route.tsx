import { NextResponse } from "next/server";
import { z } from "zod";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer
} from "@react-pdf/renderer";
import { getTierDeliverables } from "@/lib/data/tierDeliverables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  url: z.string().min(1),
  focusArea: z.string().optional(),
  competitors: z.string().optional(), // JSON array string
});

function normalizeInputUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) throw new Error("Missing url");

  const withScheme =
    raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;

  const u = new URL(withScheme);
  u.hash = "";
  return u.toString();
}

function hostSlug(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h.replace(/[^a-z0-9.-]/gi, "-").slice(0, 60) || "site";
  } catch {
    return "site";
  }
}

const BRAND_RED = "#C20F2C";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 36,
    paddingHorizontal: 34,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111"
  },
  topBar: {
    height: 8,
    backgroundColor: BRAND_RED,
    marginBottom: 18
  },
  header: {
    marginBottom: 18
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111"
  },
  subTitle: {
    marginTop: 6,
    fontSize: 12,
    color: BRAND_RED,
    fontWeight: 600
  },
  meta: {
    marginTop: 6,
    fontSize: 10,
    color: "#666"
  },
  pill: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FDECEE",
    borderWidth: 1,
    borderColor: "#F8D4D8",
    alignSelf: "flex-start"
  },
  pillText: {
    fontSize: 10,
    color: "#111",
    fontWeight: 600
  },

  section: {
    marginTop: 14
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8
  },

  // Scorecard table
  scoreTable: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    padding: 10
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF"
  },
  scoreRowLast: {
    borderBottomWidth: 0
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: 700
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: 700
  },

  // Two-column layout
  twoCol: {
    flexDirection: "row",
    gap: 12
  },
  col: {
    flexGrow: 1,
    flexBasis: 0
  },
  box: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 10,
    padding: 10
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6
  },
  bullet: {
    marginLeft: 10,
    marginBottom: 4,
    color: "#111"
  },
  muted: {
    color: "#666"
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    fontSize: 9,
    color: "#666",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingTop: 8
  },
  hr: {
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF"
  }
});

function bullets(items: any[] | undefined, fallback: string) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean).slice(0, 8);
  if (!list.length) return [fallback];
  return list.map((x) => String(x));
}

function ScoreRow({
  label,
  value,
  last
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.scoreRow, last ? styles.scoreRowLast : null]}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function SectionBlock({
  title,
  strengths,
  gapsOrOpps,
  gapsHeading
}: {
  title: string;
  strengths: string[];
  gapsOrOpps: string[];
  gapsHeading: string;
}) {
  return (
    <View style={[styles.section, styles.box]}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <Text style={styles.boxTitle}>Strengths</Text>
      {strengths.map((s, i) => (
        <Text key={`s-${i}`} style={styles.bullet}>
          • {s}
        </Text>
      ))}

      <View style={{ marginTop: 8 }} />
      <Text style={styles.boxTitle}>{gapsHeading}</Text>
      {gapsOrOpps.map((s, i) => (
        <Text key={`g-${i}`} style={styles.bullet}>
          • {s}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.scoreRow, last ? styles.scoreRowLast : null]}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function isCOrLower(grade: string) {
  const g = String(grade || "").trim().toUpperCase();
  return g.startsWith("C") || g.startsWith("D") || g.startsWith("F");
}

function lowGradeMessage(section: "Technical" | "AI Clarity" | "Website Structure" | "Content") {
  if (section === "Technical") {
    return "Your current technical setup limits how confidently AI systems can read and classify your site. Inconsistent schema implementation and diluted structural signals are reducing machine-level interpretability.";
  }
  if (section === "AI Clarity") {
    return "AI tools don’t have a clear understanding of exactly what you do and who you’re for. Category positioning and entity definition lack precision across key classification signals.";
  }
  if (section === "Website Structure") {
    return "Your current page organization makes it difficult for AI tools to understand what topics you’re strongest in. Topical clustering and internal authority flow are under-optimised for retrieval modelling.";
  }
  return "Your content isn’t strong or specific enough for AI systems to consistently reference or recommend you. Depth, semantic richness, and structured authority signals are insufficient for citation weighting.";
}

export async function GET(req: Request) {
  try {
    // 1) Read URL and optional params from query
    const requestUrl = new URL(req.url);
    const urlParam = requestUrl.searchParams.get("url") || "";
    const focusAreaParam = requestUrl.searchParams.get("focusArea") || "";
    const competitorsParam = requestUrl.searchParams.get("competitors") || "";
    const { url } = Query.parse({ url: urlParam });
    const normalizedUrl = normalizeInputUrl(url);

    let competitors: string[] = [];
    try {
      if (competitorsParam) {
        const parsed = JSON.parse(competitorsParam);
        if (Array.isArray(parsed)) competitors = parsed.slice(0, 5);
      }
    } catch {}

    // 2) Call your existing /api/audit so PDF matches website output exactly
    const origin = requestUrl.origin;
    const auditBody: Record<string, unknown> = {
      url: normalizedUrl,
      focusArea: focusAreaParam || undefined,
      competitors: competitors.length ? competitors : undefined,
    };
    const auditRes = await fetch(`${origin}/api/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(auditBody),
    });

    const report = await auditRes.json();
    if (!auditRes.ok) {
      const msg = report?.error || "Audit failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 3) Format score strings (use /100 + grade when present)
    const scores = report?.scores || {};
    const grades = report?.grades || {};

    const fmt = (scoreKey: string, gradeKey: string) => {
      const s = scores?.[scoreKey];
      const g = grades?.[gradeKey];
      if (typeof s === "number" && typeof g === "string") return `${s} / 100 (${g})`;
      if (typeof g === "string") return g;
      return "—";
    };

    const tier = String(report?.tier || "—");
    const tierWhy = Array.isArray(report?.explanations?.tierWhy)
      ? report.explanations.tierWhy.slice(0, 2).join(" ")
      : "";
    const packageDetails = getTierDeliverables(tier);

    // Per-category blocks (titles match the website labels)
    const per = report?.explanations?.perCategory || {};

    const ai = per?.aiReadiness || {};
    const st = per?.structure || {};
    const cd = per?.contentDepth || {};
    const tr = per?.technicalReadiness || {};

    // Make sure we never show "Not observed..." in PDF; use "Next level" language
    const aiStrengths = bullets(ai?.strengths, "Solid foundation observed at this scan depth.");
    const aiGaps = bullets(
      ai?.gaps,
      "No critical issues detected — focus shifts to ongoing AI clarity improvements."
    );

    const stStrengths = bullets(st?.strengths, "Solid foundation observed at this scan depth.");
    const stGaps = bullets(
      st?.gaps,
      "No critical issues detected — focus shifts to refinement and standardization."
    );

    const cdStrengths = bullets(cd?.strengths, "Solid foundation observed at this scan depth.");
    const cdGaps = bullets(
      cd?.gaps,
      "No critical issues detected — focus shifts to expanding decision-support content."
    );

    const trStrengths = bullets(tr?.strengths, "Solid foundation observed at this scan depth.");
    const trGaps = bullets(
      tr?.gaps,
      "No critical issues detected — focus shifts to deeper technical optimization."
    );

    const generatedAt = new Date().toLocaleString();
    const businessInfo = report?.businessInfo || {};
    const executiveSummary = report?.executiveSummary || "";
    const focusArea = report?.focusArea || "";
    const primarySignals = report?.primarySignals;
    const competitorSignals = report?.competitorSignals || [];

    // Use exact scorecard grades (same as website scorecard and slides)
    const technicalCurrent: string = grades.technicalReadiness || "C";
    const aiCurrent: string = grades.aiReadiness || grades.aiClarity || "C";
    const structureCurrent: string = grades.structure || "C";
    const contentDepthCurrent: string = grades.contentDepth || "C";

    const scoreLabel = (g: string) =>
      g === "A" || g === "A+" ? "Excellent" :
      g === "B" || g === "B+" ? "Good" :
      g === "C" ? "Needs Improvement" : "Needs Significant Improvement";
    
    const technicalHelpText = isCOrLower(technicalCurrent)
      ? lowGradeMessage("Technical")
      : "GPTO makes your website even easier for AI systems to find and understand. We'll improve how your website information is organized so AI systems can better list and recommend your site.";
    const aiHelpText = isCOrLower(aiCurrent)
      ? lowGradeMessage("AI Clarity")
      : "GPTO improves how AI tools understand and describe your business. We'll refine your website language so AI tools can more accurately recommend your business to people searching for what you offer.";
    const structureHelpText = isCOrLower(structureCurrent)
      ? lowGradeMessage("Website Structure")
      : "GPTO fine-tunes your structure for maximum clarity and AI extractability. Your pages will be even easier for both visitors and AI systems to navigate.";
    const contentHelpText = isCOrLower(contentDepthCurrent)
      ? lowGradeMessage("Content")
      : "GPTO makes your website even clearer and more helpful for visitors. Visitors will arrive better-informed, leading to more qualified leads and better results.";

    // 4) Build PDF with customer-facing template
    const Pdf = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          <View style={styles.header}>
            <Text style={styles.title}>Strategic AI Readiness Assessment</Text>
            <Text style={styles.subTitle}>Conversion Interactive Agency</Text>

            <Text style={styles.meta}>
              Website: {normalizedUrl}
              {"\n"}
              Generated: {generatedAt}
            </Text>
          </View>

          {/* 1. Executive Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Executive Summary</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
              {executiveSummary || "Executive summary not available."}
            </Text>
          </View>

          {/* Focus Area */}
          {focusArea && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Focus Area</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>{focusArea}</Text>
            </View>
          )}

          {/* About Your Business */}
          {businessInfo.businessName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Your Business</Text>
              <View style={styles.box}>
                <TableRow label="Business Name" value={businessInfo.businessName || "—"} />
                <TableRow 
                  label="Website" 
                  value={businessInfo.website || normalizedUrl || "—"} 
                  last 
                />
              </View>
            </View>
          )}

          {/* 2. Performance Summary Table (matches scorecard) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Scorecard Summary</Text>
            <Text style={[styles.muted, { fontSize: 9, marginBottom: 6 }]}>
              Same scores as the detailed scorecard. GPTO strengthens these dimensions.
            </Text>
            <View style={styles.box}>
              <TableRow label="AI Clarity" value={aiCurrent} />
              <TableRow label="Structure" value={structureCurrent} />
              <TableRow label="Content Depth" value={contentDepthCurrent} />
              <TableRow label="Technical" value={technicalCurrent} last />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
          </View>
        </Page>

        {/* Page 2: Four Key Areas We Analyzed (matches scorecard) */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <View style={styles.header}>
            <Text style={styles.title}>3. Four Key Areas We Analyzed</Text>
            <Text style={[styles.muted, { fontSize: 10, marginTop: 4 }]}>
              Same scores and titles as the scorecard. These dimensions determine how well AI tools and systems can find, understand, and recommend your business.
            </Text>
          </View>

          {/* Technical */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical</Text>
            <View style={styles.box}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Your Current Score</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 900, marginRight: 8 }}>{technicalCurrent}</Text>
                <Text style={{ fontSize: 10, color: "#666" }}>{scoreLabel(technicalCurrent)}</Text>
              </View>
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>What We Found</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>What's working well:</Text>
              {(trStrengths.length > 0 ? trStrengths : ["Limited observable signals"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={{ fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Areas for improvement:</Text>
              {(trGaps.length > 0 ? trGaps : ["No critical issues detected"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>How GPTO Will Help</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                {technicalHelpText}
              </Text>
            </View>
          </View>

          {/* AI Clarity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Clarity</Text>
            <View style={styles.box}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Your Current Score</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 900, marginRight: 8 }}>{aiCurrent}</Text>
                <Text style={{ fontSize: 10, color: "#666" }}>{scoreLabel(aiCurrent)}</Text>
              </View>
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>What We Found</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>What's working well:</Text>
              {(aiStrengths.length > 0 ? aiStrengths : ["Answerability signals were limited at this review"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={{ fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Areas for improvement:</Text>
              {(aiGaps.length > 0 ? aiGaps : ["No critical issues detected"]).slice(0, 4).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>How GPTO Will Help</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                {aiHelpText}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)} • GPTO Audit System v1.0</Text>
          </View>
        </Page>

        {/* Page 3: Structure, Content Depth, Overall */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          {/* Structure */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Structure</Text>
            <View style={styles.box}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Your Current Score</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 900, marginRight: 8 }}>{structureCurrent}</Text>
                <Text style={{ fontSize: 10, color: "#666" }}>{scoreLabel(structureCurrent)}</Text>
              </View>
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>What We Found</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>What's working well:</Text>
              {(stStrengths.length > 0 ? stStrengths : ["Limited observable signals"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={{ fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Areas for improvement:</Text>
              {(stGaps.length > 0 ? stGaps : ["No critical issues detected"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>How GPTO Will Help</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                {structureHelpText}
              </Text>
            </View>
          </View>

          {/* Content Depth */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Depth</Text>
            <View style={styles.box}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Your Current Score</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 900, marginRight: 8 }}>{contentDepthCurrent}</Text>
                <Text style={{ fontSize: 10, color: "#666" }}>{scoreLabel(contentDepthCurrent)}</Text>
              </View>
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>What We Found</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>What's working well:</Text>
              {(cdStrengths.length > 0 ? cdStrengths : ["Limited observable signals"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={{ fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Areas for improvement:</Text>
              {(cdGaps.length > 0 ? cdGaps : ["No critical issues detected"]).slice(0, 3).map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}
              <Text style={[styles.boxTitle, { marginTop: 12, marginBottom: 6 }]}>How GPTO Will Help</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                {contentHelpText}
              </Text>
            </View>
          </View>

          {/* Package Capability Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. What Each Package Includes</Text>
            <Text style={[styles.muted, { fontSize: 9, marginBottom: 8, lineHeight: 1.4 }]}>
              Compare capabilities across our service tiers to find the right fit for your needs and goals.
            </Text>
            <View style={styles.box}>
              {/* Table Header */}
              <View style={{ flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 6 }}>
                <Text style={[styles.scoreLabel, { flex: 2, fontSize: 10 }]}>Service Capability</Text>
                <Text style={[styles.scoreValue, { flex: 1, textAlign: "center", fontSize: 10 }]}>Bronze</Text>
                <Text style={[styles.scoreValue, { flex: 1, textAlign: "center", fontSize: 10 }]}>Silver</Text>
                <Text style={[styles.scoreValue, { flex: 1, textAlign: "center", fontSize: 10 }]}>Gold</Text>
              </View>
              
              {/* Table Rows */}
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Organize your website structure</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
              
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Make your content readable by AI tools</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
              
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Add helpful FAQs and guides</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
              
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Expand and improve your content</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
              
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Build your authority and expertise</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
              
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4 }}>
                <Text style={{ flex: 2, fontSize: 9, lineHeight: 1.4 }}>Become the go-to leader in your space</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#999" }}>—</Text>
                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>/</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
          </View>
        </Page>

        {/* Page 4: Strategy, Roadmap, Close */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          {/* Strategic Positioning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Strategic Positioning</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
              Bronze establishes clarity and control. Silver improves efficiency when ready. Gold is a long-term option for category leadership — not a requirement.
            </Text>
          </View>

          {/* 90-Day Roadmap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. 90-Day First Wins Roadmap</Text>
            <View style={styles.box}>
              <Text style={styles.bullet}>Weeks 1–2: Structural fixes & signal cleanup</Text>
              <Text style={styles.bullet}>Weeks 3–6: AI readability & routing improvements</Text>
              <Text style={styles.bullet}>Weeks 7–12: Refinement & optional expansion</Text>
            </View>
          </View>

          {/* Final Close */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Ready to Improve Your AI Visibility?</Text>
            <View style={[styles.box, { marginBottom: 12 }]}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Why This Matters Right Now</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                AI-powered tools like ChatGPT, Perplexity, and Google's AI Overview are increasingly used to discover brands, compare options, and make decisions. 
                <Text style={{ fontWeight: 700 }}> Without GPTO optimization, your site risks being overlooked, misunderstood, or incorrectly summarized</Text> by these critical discovery channels.
              </Text>
            </View>
            <View style={[styles.box, { marginBottom: 12 }]}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>What Success Looks Like</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                Your brand is <Text style={{ fontWeight: 700 }}>correctly understood, easily found, and confidently recommended</Text> by AI tools. 
                Users arrive <Text style={{ fontWeight: 700 }}>better-qualified and more informed</Text>. 
                Your core messages are <Text style={{ fontWeight: 700 }}>consistently and accurately surfaced</Text> across all AI-driven discovery channels.
              </Text>
            </View>
            <View style={[styles.box, { marginBottom: 12 }]}>
              <Text style={[styles.boxTitle, { marginBottom: 8 }]}>Important Clarification</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                GPTO strengthens structural visibility conditions. It does not generate traffic, leads, or revenue independently.
              </Text>
            </View>
          </View>

          {/* Competitive Snapshot (conditional) */}
          {competitorSignals.length > 0 && primarySignals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Competitive Signal Snapshot</Text>
              <Text style={[styles.muted, { fontSize: 9, marginBottom: 8 }]}>
                Observable structural patterns. This comparison does not assess ranking position, traffic levels, or business performance.
              </Text>
              <View style={styles.box}>
                <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 6, marginBottom: 6 }}>
                  <Text style={[styles.scoreLabel, { flex: 1, fontSize: 9 }]}>Site</Text>
                  <Text style={[styles.scoreLabel, { flex: 1, fontSize: 9 }]}>Service Def.</Text>
                  <Text style={[styles.scoreLabel, { flex: 1, fontSize: 9 }]}>Schema</Text>
                  <Text style={[styles.scoreLabel, { flex: 1, fontSize: 9 }]}>FAQ</Text>
                  <Text style={[styles.scoreLabel, { flex: 1, fontSize: 9 }]}>Messaging</Text>
                </View>
                <View style={{ flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                  <Text style={{ flex: 1, fontSize: 8 }}>Your site</Text>
                  <Text style={{ flex: 1, fontSize: 8 }}>{primarySignals?.serviceSegmentation || "—"}</Text>
                  <Text style={{ flex: 1, fontSize: 8 }}>{primarySignals?.schemaCoverage || "—"}</Text>
                  <Text style={{ flex: 1, fontSize: 8 }}>{primarySignals?.faqCoverage || "—"}</Text>
                  <Text style={{ flex: 1, fontSize: 8 }}>{primarySignals?.messagingClarity || "—"}</Text>
                </View>
                {competitorSignals.slice(0, 5).map((c: any, i: number) => {
                  const sig = c?.signals || c;
                  return (
                    <View key={i} style={{ flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,.08)" }}>
                      <Text style={{ flex: 1, fontSize: 8 }}>Competitor {i + 1}</Text>
                      <Text style={{ flex: 1, fontSize: 8 }}>{sig?.serviceSegmentation || "—"}</Text>
                      <Text style={{ flex: 1, fontSize: 8 }}>{sig?.schemaCoverage || "—"}</Text>
                      <Text style={{ flex: 1, fontSize: 8 }}>{sig?.faqCoverage || "—"}</Text>
                      <Text style={{ flex: 1, fontSize: 8 }}>{sig?.messagingClarity || "—"}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recommended Package */}
          {tier && tier !== "—" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Package</Text>
              <View style={styles.box}>
                <Text style={styles.boxTitle}>{packageDetails?.tier} — {packageDetails?.title}</Text>
                <Text style={{ fontSize: 11, fontWeight: 700, color: BRAND_RED, marginTop: 4 }}>
                  {packageDetails?.price} / month
                </Text>
                <Text style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                  Per month pricing. Minimum 3-month subscription.
                </Text>
                <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
                  {packageDetails?.subtitle}
                </Text>
                {tierWhy && (
                  <Text style={{ fontSize: 9, lineHeight: 1.4, marginTop: 6, color: "#666" }}>
                    {tierWhy}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Compliance Footer */}
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={{ fontSize: 9, color: "#666", lineHeight: 1.5 }}>
              This assessment reflects observable structural and content signals. It does not measure traffic, rankings, lead quality, conversion rates, or revenue performance. GPTO strengthens visibility conditions and authority signals but does not guarantee placement, traffic, or business outcomes.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)} • GPTO Audit System v1.0</Text>
          </View>
        </Page>
      </Document>
    );

    const pdfBuffer = await renderToBuffer(Pdf);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gpto-audit-${hostSlug(
          normalizedUrl
        )}.pdf"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}
