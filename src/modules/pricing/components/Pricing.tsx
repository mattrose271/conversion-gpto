import React from 'react';
import plans from '../data/plans.json';

type Plan = {
  name: string;
  slug: string;
  price: number;
  priceSuffix?: string;
  headline: string;
  description: string;
  features: string[];
  cta: string;
};

export default function Pricing() {
  return (
    <section id="pricing" style={{padding: '4rem 1rem'}}>
      <div style={{maxWidth: 1200, margin: '0 auto'}}>
        <h2 style={{textAlign: 'center', marginBottom: '1rem'}}>Plans & Pricing</h2>
        <p style={{textAlign: 'center', marginBottom: '2rem'}}>Choose the plan that fits your growth. Upgrade anytime.</p>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem'}}>
          {(plans as Plan[]).map((plan) => (
            <article key={plan.slug} style={{border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', background: '#fff'}}>
              <img
                src={`/img/plan-${plan.slug}.png`}
                alt={`${plan.name} plan`}
                style={{width: '100%', height: 'auto', borderRadius: 8, marginBottom: 12}}
              />
              <h3 style={{margin: '0 0 0.5rem'}}>{plan.name}</h3>
              <div style={{fontSize: 32, fontWeight: 700, marginBottom: 8}}>
                ${'{'}plan.price.toLocaleString(){'}'}
                <span style={{fontSize: 14, fontWeight: 500}}> {plan.priceSuffix || '/mo'}</span>
              </div>
              <p style={{margin: '0 0 0.5rem', fontWeight: 600}}>{plan.headline}</p>
              <p style={{marginTop: 0}}>{plan.description}</p>
              <ul style={{paddingLeft: 18, marginBottom: 12}}>
                {plan.features.map((f, i) => (<li key={i}>{f}</li>))}
              </ul>
              <a href="#contact" style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: '#C20F2C',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600
              }}>{plan.cta}</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
