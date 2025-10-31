'use client';
import React, { useState } from 'react';
import ReportResult from './ReportResult';

type ReportData = {
  customer: { name?: string; email?: string; phone?: string; domain?: string };
  summary: string;
  recommendations: string[];
  plans: { name: string; price: number; reason: string }[];
  cta: string;
};

export default function ReportForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', domain: '', message: '' });
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to generate report.');
      const data = await res.json();
      setReport(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" style={{padding: '3rem 1rem', background: '#f9f9f9'}}>
      <div style={{maxWidth: 900, margin: '0 auto'}}>
        <h2 style={{marginTop: 0}}>Get Your Custom GPTO Report</h2>
        <p style={{opacity: 0.8, marginTop: 0}}>Tell us a bit about your site; we’ll show tailored pricing and recommendations on-screen.</p>
        <form onSubmit={onSubmit} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24}}>
          <input name="name" placeholder="Your name" value={form.name} onChange={onChange} required style={{padding: 10, borderRadius: 8, border: '1px solid #ddd'}} />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} required style={{padding: 10, borderRadius: 8, border: '1px solid #ddd'}} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={onChange} style={{padding: 10, borderRadius: 8, border: '1px solid #ddd'}} />
          <input name="domain" placeholder="Website (e.g., acme.com)" value={form.domain} onChange={onChange} required style={{padding: 10, borderRadius: 8, border: '1px solid #ddd'}} />
          <textarea name="message" placeholder="What are you trying to achieve?" value={form.message} onChange={onChange} rows={4} style={{gridColumn: '1 / -1', padding: 10, borderRadius: 8, border: '1px solid #ddd'}} />
          <button type="submit" disabled={loading} style={{gridColumn: '1 / -1', padding: '12px 18px', background: '#C20F2C', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700}}>
            {loading ? 'Generating…' : 'Show My Custom Report'}
          </button>
          {error && <p style={{color: 'red'}}>{error}</p>}
        </form>

        {report && <ReportResult data={report} />}
      </div>
    </section>
  );
}
