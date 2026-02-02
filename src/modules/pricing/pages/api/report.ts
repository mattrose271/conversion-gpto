import type { NextApiRequest, NextApiResponse } from 'next';
import plans from '../../data/plans.json';

type Plan = { name: string; price: number; slug: string; };
type Body = { name?: string; email?: string; phone?: string; domain?: string; message?: string };

// Basic heuristic tailoring without external AI calls.
function tailorSummary({ domain, message }: Body): string {
  const lower = (message || '').toLowerCase();
  const isEcom = lower.includes('shopify') || lower.includes('woocommerce') || lower.includes('store');
  const isLeadGen = lower.includes('leads') || lower.includes('inbound') || lower.includes('b2b');
  const isContent = lower.includes('content') || lower.includes('blog') || lower.includes('seo');
  const d = (domain || '').toLowerCase();

  let line = `We’ll deploy GPTO to surface your wins, automate visibility, and convert faster.`;
  if (isEcom || d.includes('shop') || d.includes('store')) {
    line = `We’ll plug GPTO into your product and traffic data to expose ROI and recover missed revenue automatically.`;
  } else if (isLeadGen) {
    line = `We’ll align GPTO to your funnel, automate telemetry, and attribute pipeline lift to specific campaigns.`;
  } else if (isContent) {
    line = `We’ll couple GPTO to your content ops to prioritize high-yield topics and automate reporting.`;
  }
  return line;
}

function tailoredPlanReason(plan: Plan, body: Body): string {
  const d = (body.domain || '').toLowerCase();
  const lower = (body.message || '').toLowerCase();
  const scaleHint = lower.includes('multi') || lower.includes('teams') || lower.includes('agencies');
  const speedHint = lower.includes('launch') || lower.includes('quick') || lower.includes('fast');

  switch (plan.slug) {
    case 'starter':
      return speedHint
        ? 'Fastest path to launch: on-site AI demo, on-screen report, and lead capture.'
        : 'Solid foundation: demo + report + lead capture to validate fit.';
    case 'growth':
      return 'Adds telemetry dashboards and integration support to convert interest into measurable results.';
    case 'pro':
      return 'Activates full Panthera backend and plugin integration; ideal when you need multi-brand telemetry.';
    case 'enterprise':
      return scaleHint || d.endsWith('.io') || d.endsWith('.ai')
        ? 'Dedicated, white-label stack with advanced API — built for scale and teams.'
        : 'Dedicated, white-label stack with advanced API and security.';
    default:
      return 'Great fit for your needs.';
  }
}

async function optionallyForwardToInbox(report: any) {
  // Optional internal forward only. No email is sent to the prospect automatically.
  // If SMTP is configured and PRIMARY_EMAIL exists, send a single internal email.
  try {
    const to = process.env.PRIMARY_EMAIL;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    
    if (!to || !smtpHost || !smtpUser || !smtpPassword) {
      console.log('[report] INTERNAL ONLY — missing SMTP configuration or PRIMARY_EMAIL. Report logged.');
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    
    // Use shared email utility - import from root lib directory
    const { sendEmail } = await import('../../../../../lib/email');
    await sendEmail({
      to: to,
      subject: `New GPTO Report: ${report?.customer?.domain || report?.customer?.email}`,
      html: `<pre style="white-space:pre-wrap;">${JSON.stringify(report, null, 2)}</pre>`,
      from: process.env.SMTP_FROM_EMAIL || smtpUser,
      fromName: 'GPTO Reports',
    });
  } catch (e) {
    console.warn('[report] Internal forward failed', e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body as Body;

  const summary = tailorSummary(body);
  const planNotes = (plans as Plan[]).map(p => ({
    name: p.name,
    price: p.price,
    reason: tailoredPlanReason(p, body)
  }));

  const recommendations = [
    'Embed the AI demo above the fold to lift conversions.',
    'Add telemetry preview screenshots to reduce uncertainty.',
    'Offer a limited-time Pro setup credit to accelerate decision-making.'
  ];

  const report = {
    customer: { name: body.name, email: body.email, phone: body.phone, domain: body.domain },
    summary,
    recommendations,
    plans: planNotes,
    cta: 'Proceed with Growth now'
  };

  // Internal-only forward (optional)
  await optionallyForwardToInbox(report);

  res.status(200).json(report);
}
