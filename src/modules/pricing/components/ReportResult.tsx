import React from 'react';

type PlanNote = {
  name: string;
  price: number;
  reason: string;
};

type ReportData = {
  customer: { name?: string; email?: string; phone?: string; domain?: string };
  summary: string;
  recommendations: string[];
  plans: PlanNote[];
  cta: string;
};

export default function ReportResult({ data }: { data: ReportData }) {
  if (!data) return null;
  const { customer, summary, recommendations, plans, cta } = data;

  return (
    <section style={{padding: '3rem 1rem', background: '#fff'}}>
      <div style={{maxWidth: 900, margin: '0 auto'}}>
        <h2 style={{marginTop: 0}}>Your Custom GPTO Report</h2>
        <p style={{opacity: 0.8, marginTop: 0}}>
          {customer?.domain ? `Based on ${customer.domain}, ` : ''}
          here’s what we recommend to maximize conversion and visibility.
        </p>

        <div style={{border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 24}}>
          <h3 style={{marginTop: 0}}>Summary</h3>
          <p style={{marginTop: 0}}>{summary}</p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24}}>
          {plans.map((p) => (
            <div key={p.name} style={{border: '1px solid #eee', borderRadius: 12, padding: 16}}>
              <h4 style={{marginTop: 0}}>{p.name} — ${'{'}p.price.toLocaleString(){'}'}/mo</h4>
              <p style={{marginTop: 0}}>{p.reason}</p>
            </div>
          ))}
        </div>

        <div style={{border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 24}}>
          <h3 style={{marginTop: 0}}>Recommendations</h3>
          <ul style={{margin: 0, paddingLeft: 18}}>
            {recommendations.map((r, i) => (<li key={i}>{r}</li>))}
          </ul>
        </div>

        <a href="#purchase" style={{
          display: 'inline-block',
          padding: '12px 18px',
          background: '#C20F2C',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 700
        }}>{cta}</a>
        <p style={{fontSize: 12, opacity: 0.7, marginTop: 8}}>You’ll receive a copy of this report in our agency inbox for a human follow-up.</p>
      </div>
    </section>
  );
}
