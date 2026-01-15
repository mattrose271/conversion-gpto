import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View } from "@react-pdf/renderer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Re-run the audit via your API (simple MVP).
  // Later: replace with DB caching.
  const auditRes = await fetch(new URL("/api/audit", req.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url })
  });
  const report = await auditRes.json();

  const Pdf = (
    <Document>
      <Page size="A4" style={{ padding: 28, fontSize: 11 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>GPTO AI Readiness Scorecard</Text>
        <Text style={{ color: "#666", marginBottom: 10 }}>Website: {report.url}</Text>

        <Text style={{ fontSize: 13, marginTop: 10, marginBottom: 6 }}>Scorecard</Text>
        {[
          ["AI Openness", report.grades.aiOpenness],
          ["Structure", report.grades.structure],
          ["Content Depth", report.grades.contentDepth],
          ["Technical Readiness", report.grades.technicalReadiness],
          ["Overall", report.grades.overall]
        ].map(([k, v]) => (
          <View key={String(k)} style={{ flexDirection: "row", borderBottomWidth: 1, paddingVertical: 6 }}>
            <Text style={{ width: "70%" }}>{String(k)}</Text>
            <Text style={{ width: "30%", textAlign: "right" }}>{String(v)}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 13, marginTop: 12, marginBottom: 6 }}>Recommended Tier</Text>
        <Text>{report.tier}</Text>

        <Text style={{ fontSize: 13, marginTop: 12, marginBottom: 6 }}>Notes</Text>
        <Text style={{ color: "#666" }}>
          Scanned {report.scope?.scannedPages} pages (max {report.scope?.maxPages}) • {report.scope?.usedSitemap ? "sitemap.xml" : "link crawl"}
        </Text>
      </Page>
    </Document>
  );

  const pdf = await renderToBuffer(Pdf);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="gpto-scorecard.pdf"`
    }
  });
}
