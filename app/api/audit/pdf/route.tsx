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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  url: z.string().min(1)
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

function getWithGPTOGrade(currentGrade: string, dimension: string, grades: any): string {
  const gradeOrder = ["F", "D", "C", "B-", "B", "B+", "A-", "A", "A+"];
  const currentIdx = gradeOrder.indexOf(currentGrade);
  if (currentIdx === -1) return currentGrade;

  let improvement = 1;
  if (dimension === "SEO Strength" && (grades.structure === "D" || grades.structure === "F" || grades.technicalReadiness === "D" || grades.technicalReadiness === "F")) {
    improvement = 2;
  }
  if (dimension === "AI Discoverability" && (grades.aiReadiness === "D" || grades.aiReadiness === "F")) {
    improvement = 2;
  }

  const newIdx = Math.min(gradeOrder.length - 1, currentIdx + improvement);
  return gradeOrder[newIdx];
}

export async function GET(req: Request) {
  try {
    // 1) Read URL from query
    const requestUrl = new URL(req.url);
    const urlParam = requestUrl.searchParams.get("url") || "";
    const { url } = Query.parse({ url: urlParam });
    const normalizedUrl = normalizeInputUrl(url);

    // 2) Call your existing /api/audit so PDF matches website output exactly
    const origin = requestUrl.origin;
    const auditRes = await fetch(`${origin}/api/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl })
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

    // Calculate performance summary dimensions
    const seoCurrent = grades.structure && grades.technicalReadiness 
      ? (grades.structure === "A" || grades.structure === "B") && (grades.technicalReadiness === "A" || grades.technicalReadiness === "B") ? "B" 
        : (grades.structure === "C" || grades.technicalReadiness === "C") ? "C" : "D"
      : "C";
    const aiCurrent = grades.aiReadiness || "C";
    const conversionCurrent = grades.contentDepth && grades.structure
      ? (grades.contentDepth === "A" || grades.contentDepth === "B") && (grades.structure === "A" || grades.structure === "B") ? "B"
        : (grades.contentDepth === "C" || grades.structure === "C") ? "C" : "D"
      : "C";
    const brandCurrent = grades.overall || grades.aiReadiness || "B-";

    // 4) Build PDF with customer-facing template
    const Pdf = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          <View style={styles.header}>
            <Text style={styles.title}>GPTO — Customer-Facing Output</Text>
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

          {/* 2. Customer Snapshot */}
          {businessInfo.businessName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Customer Snapshot</Text>
              <View style={styles.box}>
                <TableRow label="Business name" value={businessInfo.businessName || "—"} />
                <TableRow label="Website" value={businessInfo.website || normalizedUrl} />
                <TableRow label="Industry / segment" value={businessInfo.industry || "—"} />
                <TableRow label="Business model" value={businessInfo.businessModel || "—"} />
                <TableRow label="Primary audiences" value={businessInfo.primaryAudiences || "—"} />
                <TableRow label="Primary conversions" value={businessInfo.primaryConversions || "—"} />
                <TableRow label="Funnel notes" value={businessInfo.funnelNotes || "—"} last />
              </View>
            </View>
          )}

          {/* 3. Performance Summary Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Plain-English Performance Summary</Text>
            <Text style={[styles.muted, { fontSize: 9, marginBottom: 6 }]}>
              Grades are directional, not performance claims.
            </Text>
            <View style={styles.box}>
              <TableRow 
                label="SEO Strength" 
                value={`${seoCurrent} → ${getWithGPTOGrade(seoCurrent, "SEO Strength", grades)}`} 
              />
              <TableRow 
                label="AI Discoverability" 
                value={`${aiCurrent} → ${getWithGPTOGrade(aiCurrent, "AI Discoverability", grades)}`} 
              />
              <TableRow 
                label="Conversion Clarity" 
                value={`${conversionCurrent} → ${getWithGPTOGrade(conversionCurrent, "Conversion Clarity", grades)}`} 
              />
              <TableRow 
                label="Brand Signal" 
                value={`${brandCurrent} → ${getWithGPTOGrade(brandCurrent, "Brand Signal", grades)}`} 
                last 
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
          </View>
        </Page>

        {/* Page 2: Core GPTO Audit */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <View style={styles.header}>
            <Text style={styles.title}>4. Core GPTO Audit</Text>
          </View>

          {/* SEO & Technical Readiness */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SEO & Technical Readiness</Text>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>A) Current Grade: {seoCurrent}</Text>
              <Text style={styles.boxTitle}>B) Observed / Inferred Reality</Text>
              <Text style={styles.bullet}>• {trStrengths[0] || stStrengths[0] || "Limited observable signals"}</Text>
              <Text style={styles.bullet}>• {trGaps[0] || stGaps[0] || "No critical issues detected"}</Text>
              <Text style={styles.boxTitle}>C) What GPTO Changes</Text>
              <Text style={styles.bullet}>• Establishes consistent technical signals and structural clarity</Text>
              <Text style={styles.bullet}>• Schema markup and metadata become standardized</Text>
              <Text style={styles.boxTitle}>D) Expected Directional Outcome</Text>
              <Text style={styles.bullet}>Improves from {seoCurrent} to {getWithGPTOGrade(seoCurrent, "SEO Strength", grades)} through structural improvements</Text>
            </View>
          </View>

          {/* AI Discoverability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Discoverability & Entity Clarity</Text>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>A) Current Grade: {aiCurrent}</Text>
              <Text style={styles.boxTitle}>B) Observed / Inferred Reality</Text>
              <Text style={styles.bullet}>• {aiStrengths[0] || "Limited observable signals"}</Text>
              <Text style={styles.bullet}>• {aiGaps[0] || "No critical issues detected"}</Text>
              <Text style={styles.boxTitle}>C) What GPTO Changes</Text>
              <Text style={styles.bullet}>• Makes brand, services, and audiences explicitly readable by AI systems</Text>
              <Text style={styles.bullet}>• Entity clarity improves through consistent language</Text>
              <Text style={styles.boxTitle}>D) Expected Directional Outcome</Text>
              <Text style={styles.bullet}>Improves from {aiCurrent} to {getWithGPTOGrade(aiCurrent, "AI Discoverability", grades)} through structural improvements</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
          </View>
        </Page>

        {/* Page 3: Conversion, Brand, Packages */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          {/* Conversion Architecture */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversion Architecture</Text>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>A) Current Grade: {conversionCurrent}</Text>
              <Text style={styles.boxTitle}>B) Observed / Inferred Reality</Text>
              <Text style={styles.bullet}>• {cdStrengths[0] || "Limited observable signals"}</Text>
              <Text style={styles.bullet}>• {cdGaps[0] || "No critical issues detected"}</Text>
              <Text style={styles.boxTitle}>C) What GPTO Changes</Text>
              <Text style={styles.bullet}>• Improves routing and qualification through clearer content depth</Text>
              <Text style={styles.bullet}>• Users arrive better-informed, reducing self-selection errors</Text>
              <Text style={styles.boxTitle}>D) Expected Directional Outcome</Text>
              <Text style={styles.bullet}>Improves from {conversionCurrent} to {getWithGPTOGrade(conversionCurrent, "Conversion Clarity", grades)} through structural improvements</Text>
            </View>
          </View>

          {/* Brand Differentiation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Brand Differentiation & Signal Strength</Text>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>A) Current Grade: {brandCurrent}</Text>
              <Text style={styles.boxTitle}>B) Observed / Inferred Reality</Text>
              <Text style={styles.bullet}>• Strong brand foundation observed</Text>
              <Text style={styles.bullet}>• Inconsistent surfacing across discovery channels</Text>
              <Text style={styles.boxTitle}>C) What GPTO Changes</Text>
              <Text style={styles.bullet}>• Ensures brand signals are consistently surfaced</Text>
              <Text style={styles.bullet}>• Differentiation becomes machine-readable</Text>
              <Text style={styles.boxTitle}>D) Expected Directional Outcome</Text>
              <Text style={styles.bullet}>Improves from {brandCurrent} to {getWithGPTOGrade(brandCurrent, "Brand Signal", grades)} through structural improvements</Text>
            </View>
          </View>

          {/* Package Capability Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Package Capability Tables</Text>
            <View style={styles.box}>
              <TableRow label="Core site structure" value="✓ / ✓ / ✓" />
              <TableRow label="AI-readable schema" value="✓ / ✓ / ✓" />
              <TableRow label="FAQ / How-To depth" value="— / ✓ / ✓" />
              <TableRow label="Content scaling" value="— / ✓ / ✓" />
              <TableRow label="Authority layering" value="— / — / ✓" />
              <TableRow label="Long-term dominance" value="— / — / ✓" last />
              <Text style={[styles.muted, { fontSize: 9, marginTop: 6 }]}>
                Format: Bronze / Silver / Gold
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
          </View>
        </Page>

        {/* Page 4: Growth, Strategy, Roadmap, Close */}
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          {/* Growth Progression */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Growth Progression Tables</Text>
            <View style={styles.box}>
              <TableRow label="Bronze" value="B- (Signal clarity & noise reduction)" />
              <TableRow label="Silver" value="B+ (Discoverability & efficiency)" />
              <TableRow label="Gold" value="A (Authority & leadership)" last />
            </View>
          </View>

          {/* Strategic Positioning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Strategic Positioning</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
              Bronze establishes clarity and control. Silver improves efficiency when ready. Gold is a long-term option for category leadership — not a requirement.
            </Text>
          </View>

          {/* 90-Day Roadmap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. 90-Day First Wins Roadmap</Text>
            <View style={styles.box}>
              <Text style={styles.bullet}>Weeks 1–2: Structural fixes & signal cleanup</Text>
              <Text style={styles.bullet}>Weeks 3–6: AI readability & routing improvements</Text>
              <Text style={styles.bullet}>Weeks 7–12: Refinement & optional expansion</Text>
            </View>
          </View>

          {/* Final Close */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Final Close</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
              <Text style={{ fontWeight: 700 }}>Why this matters now:</Text> AI-driven search and answer engines are becoming the primary way people discover brands.
            </Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 6 }}>
              <Text style={{ fontWeight: 700 }}>What success looks like:</Text> Your brand is correctly understood, found, and recommended by AI tools.
            </Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 6 }}>
              <Text style={{ fontWeight: 700 }}>Next step:</Text> Review the recommendations above and choose a package that fits your current needs.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ fontWeight: 600 }}>Conversion Interactive Agency • GPTO Audit</Text>
            <Text>{hostSlug(normalizedUrl)}</Text>
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
