import React from 'react';

export default function ThankYou() {
  return (
    <section style={{padding: '4rem 1rem'}}>
      <div style={{maxWidth: 900, margin: '0 auto', textAlign: 'center'}}>
        <h1>Thank you!</h1>
        <p>We’ve generated your custom GPTO report. Check your screen above for the details. Our team will follow up if needed.</p>
        <a href="/" style={{display: 'inline-block', padding: '10px 16px', background: '#C20F2C', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700}}>Back to Home</a>
      </div>
    </section>
  );
}
