import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, Document, Page, Text, View } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Call the audit endpoint (no direct imports)
  const auditRes = await fetch(new URL("/api/audit", req.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url })
  });

  if (!auditRes.ok) {
    const err = await auditRes.text();
    return NextResponse.json({ error: "Audit failed", detail: err }, { status: 500 });
  }

  const report = await auditRes.json();

  const Pdf = (
    <Document>
      <Page size="A4" style={{ padding: 28, fontSize: 11 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>GPTO AI Readiness Scorecard</Text>
        <Text style={{ color: "#666", marginBottom: 10 }}>Website: {report.url}</Text>

        <Text style={{ fontSize: 13, marginTop: 10, marginBottom: 6 }}>Scorecard</Text>
        {[
         ["AI Readiness", report.grades.aiReadiness],
          ["Structure", report.grades.structure],
          ["Content Depth", report.grades.contentDepth],
          ["Technical Readiness", report.grades.technicalReadiness],
          ["Overall", report.grades.overall]
        ].map(([k, v]) => (
          <View
            key={String(k)}
            style={{ flexDirection: "row", borderBottomWidth: 1, paddingVertical: 6 }}
          >
            <Text style={{ width: "70%" }}>{String(k)}</Text>
            <Text style={{ width: "30%", textAlign: "right" }}>{String(v)}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 13, marginTop: 12, marginBottom: 6 }}>Recommended Tier</Text>
        <Text>{report.tier}</Text>

        <Text style={{ fontSize: 13, marginTop: 12, marginBottom: 6 }}>Scope</Text>
        <Text style={{ color: "#666" }}>
          Scanned {report.scope?.scannedPages} pages (max {report.scope?.maxPages}) •{" "}
          {report.scope?.usedSitemap ? "sitemap.xml" : "link crawl"} •{" "}
          {Math.round((report.scope?.durationMs ?? 0) / 1000)}s
        </Text>
      </Page>
    </Document>
  );

  const pdfBuffer = await renderToBuffer(Pdf);
const pdfBytes = new Uint8Array(pdfBuffer);

return new NextResponse(pdfBytes, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="gpto-scorecard.pdf"`
  }
});

}
