'use client'
import { useState } from 'react'

function Price({name, price, features, priceId}:{name:string, price:string, features:string[], priceId:string}){
  const [loading, setLoading] = useState(false)
  async function buy(){
    setLoading(true)
    const res = await fetch('/api/checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ priceId }) })
    const j = await res.json()
    if(j.url) window.location.href = j.url
    else setLoading(false)
  }
  return (
    <div className="card">
      <h3>{name}</h3>
      <p style={{fontSize:22, marginTop:-6}}>{price}/mo</p>
      <ul>{features.map(f=><li key={f}>{f}</li>)}</ul>
      {priceId ? <button className="btn" onClick={buy} disabled={loading}>{loading?'Redirecting…':'Purchase'}</button> : <small className="muted">Stripe not configured</small>}
    </div>
  )
}

export default function Page(){
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [message, setMessage] = useState('')
  const [builderInput, setBuilderInput] = useState('How would GPTO help my brand?')
  const [builderOut, setBuilderOut] = useState('')
  async function submit(e:any){
    e.preventDefault()
    const res = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, domain, message }) })
    const j = await res.json(); alert(j.message || 'Sent.')
    setEmail(''); setDomain(''); setMessage('')
  }
  async function ask(){
    setBuilderOut('Thinking…')
    const res = await fetch('/api/builder', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: builderInput }) })
    const j = await res.json(); setBuilderOut(j.text || '—')
  }
  const hasStripe = typeof window !== 'undefined' ? true : true
  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="badge">Conversion Interactive Agency</span>
          <h1>BUILDING YOUR <span style={{color:'var(--brand-red)'}}>BRAND</span><br/>GROWING YOUR <span style={{color:'var(--brand-red)'}}>BUSINESS</span></h1>
          <p style={{maxWidth:720}}>GPTO + Panthera brings AI visibility, telemetry intelligence, and automated content orchestration to your website — from signup to live JSON beacon, dashboard insights, and optimization.</p>
          <div style={{display:'flex', gap:12, marginTop:10}}>
            <a href="#contact" className="btn">Schedule a Call</a>
            <a href="#pricing" className="btn alt">See Plans</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid cols-3">
          <div className="card">
            <h3>TruthSeeker</h3>
            <p>Fairness‑aware re‑ranking with corroboration and conflict checks.</p>
          </div>
          <div className="card">
            <h3>Authority Grove</h3>
            <p>Trust graph across partners, associations, and citations.</p>
          </div>
          <div className="card">
            <h3>Telemetry Engine</h3>
            <p>Signals for authority, intent, sentiment, and recency powering MIBI.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid cols-2">
          <div className="card">
            <h3>Ask Builder‑GPT</h3>
            <p>Have a question? Ask our Builder‑GPT about GPTO.</p>
            <div style={{display:'grid', gap:8}}>
              <input value={builderInput} onChange={e=>setBuilderInput(e.target.value)} aria-label="Ask Builder GPT"/>
              <button className="btn" onClick={ask}>Ask</button>
              <pre style={{whiteSpace:'pre-wrap'}}>{builderOut}</pre>
            </div>
            <small className="muted">Uses proxy at /api/builder (set OPENAI_API_KEY).</small>
          </div>
          <div className="card">
            <h3>What you get</h3>
            <ul>
              <li>One‑tag JSON beacon, safe declarative runtime</li>
              <li>Dashboard tiles: Telemetry, AGCC, MIBI, Authority, Tokens</li>
              <li>AutoFill + Cognitive Fingerprinting ready</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pricing" className="section" style={{background:'var(--brand-gray-200)'}}>
        <div className="container">
          <h2>Plans & Pricing</h2>
          <div className="grid cols-3">
            <Price name="Starter" price="$499" features={["TruthSeeker","Authority Grove (manual)","Telemetry light","50 geo‑nodes"]} priceId={process.env.NEXT_PUBLIC_PRICE_STARTER as any || ''} />
            <Price name="Growth" price="$999" features={["500‑city JSON","AGCC 10‑pack","AutoFill","Dashboard basic"]} priceId={process.env.NEXT_PUBLIC_PRICE_GROWTH as any || ''} />
            <Price name="Pro" price="$2000+" features={["Display Ads","Partner Lattice","Reputation Console","API access"]} priceId={process.env.NEXT_PUBLIC_PRICE_PRO as any || ''} />
          </div>
          <small className="muted">Purchases redirect to Stripe Checkout. A confirmation email is sent on completion.</small>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container grid cols-2">
          <div>
            <h2>Get in touch</h2>
            <p>Tell us about your site. We’ll issue a beacon and next steps.</p>
            <form onSubmit={submit}>
              <div className="row">
                <div><label>Email<br/><input required value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label></div>
                <div><label>Domain<br/><input required value={domain} onChange={e=>setDomain(e.target.value)}/></label></div>
              </div>
              <label>Message<br/><textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Goals, timelines, integrations…"/></label><br/>
              <button className="btn">Send</button>
            </form>
          </div>
          <div className="card">
            <h3>Why ConversionIA + GPTO?</h3>
            <p>We blend performance marketing with AI‑native telemetry and authority systems to grow brands with evidence, not hunches.</p>
            <ul>
              <li>Launch fast with a WordPress plugin or one‑line script</li>
              <li>Transparent pricing; tokenized usage as you scale</li>
              <li>Fairness‑aware reputation handling</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Conversion Interactive Agency — All rights reserved.
        </div>
      </footer>
    </div>
  )
}
