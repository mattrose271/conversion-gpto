import { NextResponse } from "next/server";
import { z } from "zod";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  url: z.string().min(1),
  focusArea: z.string().optional(),
  competitors: z.string().optional(),
});

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 11, color: "#111" },
  bar: { height: 8, backgroundColor: "#C20F2C", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 5 },
  subtitle: { fontSize: 11, color: "#666", marginBottom: 18 },
  section: { marginTop: 15 },
  heading: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingVertical: 7 },
  label: { fontWeight: 700 },
  bullet: { marginLeft: 10, marginBottom: 5, lineHeight: 1.4 },
  notice: { marginTop: 18, padding: 12, backgroundColor: "#f7f7f7", color: "#555", lineHeight: 1.5 },
});

function normalizeInputUrl(input: string) {
  const raw = input.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme);
  url.hash = "";
  return url.toString();
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const input = Query.parse({
      url: requestUrl.searchParams.get("url") || "",
      focusArea: requestUrl.searchParams.get("focusArea") || undefined,
      competitors: requestUrl.searchParams.get("competitors") || undefined,
    });
    const url = normalizeInputUrl(input.url);
    let competitors: string[] = [];
    try {
      const parsed = input.competitors ? JSON.parse(input.competitors) : [];
      if (Array.isArray(parsed)) competitors = parsed.slice(0, 5);
    } catch {}

    const auditResponse = await fetch(`${requestUrl.origin}/api/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        focusArea: input.focusArea,
        competitors: competitors.length ? competitors : undefined,
      }),
    });
    const report = await auditResponse.json();
    if (!auditResponse.ok) {
      return NextResponse.json({ error: report?.error || "Audit failed." }, { status: 400 });
    }

    const scoreRows = [
      ["AI Clarity", report.scores?.aiReadiness, report.grades?.aiReadiness],
      ["Structure", report.scores?.structure, report.grades?.structure],
      ["Content Depth", report.scores?.contentDepth, report.grades?.contentDepth],
      ["Technical", report.scores?.technicalReadiness, report.grades?.technicalReadiness],
    ];
    const recommendations = Array.isArray(report.recommendations)
      ? report.recommendations.slice(0, 8)
      : [];

    const document = (
      <Document title={`Preliminary GPTO Scorecard - ${url}`}>
        <Page size="A4" style={styles.page}>
          <View style={styles.bar} />
          <Text style={styles.title}>Preliminary GPTO Scorecard</Text>
          <Text style={styles.subtitle}>{url}</Text>

          <View style={styles.section}>
            <Text style={styles.heading}>Directional crawl-based signals</Text>
            {scoreRows.map(([label, score, grade]) => (
              <View key={String(label)} style={styles.row}>
                <Text style={styles.label}>{String(label)}</Text>
                <Text>{typeof score === "number" ? `${score} / 100 (${grade || "—"})` : String(grade || "—")}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Observed priorities</Text>
            {recommendations.length ? recommendations.map((recommendation: any, index: number) => (
              <Text key={index} style={styles.bullet}>
                • {typeof recommendation === "string" ? recommendation : recommendation.title}
              </Text>
            )) : <Text style={styles.bullet}>• No priority recommendations were generated.</Text>}
          </View>

          <Text style={styles.notice}>
            This preliminary scorecard reflects observable public-site signals from a limited crawl.
            It is not the full GPTO appraisal and does not make a package recommendation. It does not
            measure or guarantee rankings, traffic, leads, hires, revenue, or ROI.
          </Text>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(document);
    return new Response(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="gpto-preliminary-scorecard.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate PDF." },
      { status: 400 }
    );
  }
}
