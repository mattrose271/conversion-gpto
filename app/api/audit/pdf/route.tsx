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

    // 4) Build PDF
    const Pdf = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />

          <View style={styles.header}>
            <Text style={styles.title}>GPTO AI Readiness Audit</Text>
            <Text style={styles.subTitle}>Conversion Interactive Agency</Text>

            <Text style={styles.meta}>
              Website: {normalizedUrl}
              {"\n"}
              Generated: {generatedAt}
            </Text>

            <View style={styles.pill}>
              <Text style={styles.pillText}>
                Recommended GPTO Tier: <Text style={{ color: BRAND_RED }}>{tier}</Text>
                {tierWhy ? ` — ${tierWhy}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scorecard</Text>

            <View style={styles.scoreTable}>
              <ScoreRow label="AI Clarity" value={fmt("aiReadiness", "aiReadiness")} />
              <ScoreRow label="Structure" value={fmt("structure", "structure")} />
              <ScoreRow label="Content Depth" value={fmt("contentDepth", "contentDepth")} />
              <ScoreRow label="Technical" value={fmt("technicalReadiness", "technicalReadiness")} />
              <ScoreRow label="Overall" value={fmt("overall", "overall")} last />
            </View>

            <View style={styles.hr} />
          </View>

          {/* Detailed sections */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <SectionBlock
                title="AI Clarity"
                strengths={aiStrengths}
                gapsOrOpps={aiGaps}
                gapsHeading="Optimization Opportunities (Next Level)"
              />
            </View>
            <View style={styles.col}>
              <SectionBlock
                title="Structure"
                strengths={stStrengths}
                gapsOrOpps={stGaps}
                gapsHeading="Optimization Opportunities (Next Level)"
              />
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <SectionBlock
                title="Content Depth"
                strengths={cdStrengths}
                gapsOrOpps={cdGaps}
                gapsHeading="Optimization Opportunities (Next Level)"
              />
            </View>
            <View style={styles.col}>
              <SectionBlock
                title="Technical"
                strengths={trStrengths}
                gapsOrOpps={trGaps}
                gapsHeading="Optimization Opportunities (Next Level)"
              />
            </View>
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
