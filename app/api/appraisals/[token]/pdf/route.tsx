import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getPublicAppraisalByToken } from "@/lib/appraisal/repository";
import type {
  ModuleOutput,
  ProposalOutput,
  StrategyOutput,
  UnifiedOutput,
} from "@/lib/appraisal/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", color: "#111", fontSize: 10 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 12, color: "#C20F2C", marginBottom: 18 },
  section: { marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #e5e5e5" },
  heading: { fontSize: 15, fontWeight: 700, marginBottom: 7 },
  subheading: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  paragraph: { lineHeight: 1.5, marginBottom: 5 },
  bullet: { marginLeft: 10, marginBottom: 3, lineHeight: 1.4 },
  muted: { color: "#666" },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => <Text key={index} style={styles.bullet}>• {item}</Text>)}
    </>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const appraisal = await getPublicAppraisalByToken(params.token);
  if (!appraisal) return Response.json({ error: "Appraisal link is invalid or expired." }, { status: 404 });
  if (appraisal.status !== "completed") {
    return Response.json({ error: "The appraisal PDF will be available when all stages are complete." }, { status: 409 });
  }

  const modules = appraisal.stages
    .filter((stage) => stage.order <= 5 && stage.output)
    .map((stage) => stage.output as ModuleOutput);
  const unified = appraisal.stages.find((stage) => stage.key === "unified")?.output as UnifiedOutput;
  const strategy = appraisal.stages.find((stage) => stage.key === "strategy")?.output as StrategyOutput;
  const proposal = appraisal.stages.find((stage) => stage.key === "proposal")?.output as ProposalOutput;

  const document = (
    <Document title={`GPTO Appraisal - ${appraisal.websiteUrl}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>GPTO Full Appraisal</Text>
        <Text style={styles.subtitle}>{appraisal.websiteUrl}</Text>

        {modules.map((module) => (
          <View key={module.title} style={styles.section} wrap={false}>
            <Text style={styles.heading}>{module.title} — {module.rating}</Text>
            <Text style={styles.paragraph}>{module.summary}</Text>
            <Text style={styles.subheading}>Observed findings</Text>
            <Bullets items={module.observedFindings.map((finding) => finding.summary)} />
            <Text style={styles.subheading}>Inferred findings</Text>
            <Bullets items={module.inferredFindings.map((finding) => `${finding.summary} (${finding.confidence} confidence)`)} />
            <Text style={styles.subheading}>Priorities</Text>
            <Bullets items={module.priorities} />
            <Text style={styles.subheading}>Unknowns</Text>
            <Bullets items={module.unknowns} />
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.heading}>{unified.title} — {unified.overallRating}</Text>
          <Text style={styles.paragraph}>{unified.executiveSummary}</Text>
          <Text style={styles.subheading}>Cross-layer dependencies</Text>
          <Bullets items={unified.crossLayerDependencies.map((item) => `${item.critical ? "Critical: " : ""}${item.summary}`)} />
        </View>

        {appraisal.packageRationale && (
          <View style={styles.section}>
            <Text style={styles.heading}>Recommended Package: {appraisal.packageRationale.tier}</Text>
            <Text style={styles.subheading}>Why this tier</Text>
            <Bullets items={appraisal.packageRationale.whyThisTier} />
            <Text style={styles.subheading}>Why not lower</Text>
            <Bullets items={appraisal.packageRationale.whyNotLower} />
            <Text style={styles.subheading}>Why not higher</Text>
            <Bullets items={appraisal.packageRationale.whyNotHigher} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.heading}>{strategy.title}</Text>
          <Text style={styles.paragraph}>{strategy.strategicThesis}</Text>
          <Text style={styles.subheading}>Objectives</Text>
          <Bullets items={strategy.objectives} />
          <Text style={styles.subheading}>First 90 days</Text>
          <Bullets items={strategy.first90Days.map((phase) => `${phase.phase}: ${phase.focus}`)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>{proposal.title}</Text>
          <Text style={styles.subheading}>Executive summary</Text>
          <Text style={styles.paragraph}>{proposal.executiveSummary}</Text>
          <Text style={styles.subheading}>Recommended approach</Text>
          <Text style={styles.paragraph}>{proposal.recommendedApproach}</Text>
          <Text style={styles.subheading}>Scope</Text>
          <Bullets items={proposal.scope} />
          <Text style={styles.subheading}>Important clarification</Text>
          <Text style={[styles.paragraph, styles.muted]}>{proposal.importantClarification}</Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(document);
  return new Response(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="gpto-full-appraisal.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
