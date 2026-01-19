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

      {/* PRICING */}
<section id="pricing" className="section" style={{ background: "var(--brand-gray-200)" }}>
  <div className="container">
    <h2 style={{ marginBottom: 10 }}>Plans & Pricing</h2>
    <p className="muted" style={{ maxWidth: 760, marginTop: 0 }}>
      GPTO service packages are designed to improve AI-driven discovery, visibility, and conversion performance.
      <br />
      <strong>3 month commitment</strong> applies to all tiers.
    </p>

    <PricingCards />
  </div>
</section>

{/* ---- PricingCards component (keep in same file under your page component) ---- */}
"use client";
import { useEffect, useMemo, useState } from "react";

function PricingCards() {
  // Recommended tier can come from:
  // 1) audit page localStorage: gpto_recommended_tier = "Bronze" | "Silver" | "Gold"
  // 2) query param: ?tier=Bronze|Silver|Gold
  const [recommended, setRecommended] = useState<string>("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get("tier");
      const ls = window.localStorage.getItem("gpto_recommended_tier");

      const norm = (v: string | null) =>
        (v || "")
          .trim()
          .toLowerCase()
          .replace("foundation", "bronze")
          .replace("growth", "silver")
          .replace("elite", "gold");

      const mapped =
        norm(qp) === "bronze" ? "Bronze" :
        norm(qp) === "silver" ? "Silver" :
        norm(qp) === "gold" ? "Gold" :
        norm(ls) === "bronze" ? "Bronze" :
        norm(ls) === "silver" ? "Silver" :
        norm(ls) === "gold" ? "Gold" :
        "";

      setRecommended(mapped);
    } catch {
      setRecommended("");
    }
  }, []);

  const plans = useMemo(() => {
    return [
      {
        tier: "Bronze",
        title: "Foundation",
        price: "$999",
        sub: "Corrects core issues and establishes your AI-visibility performance baseline.",
        bullets: [
          "Essential schema markup added to your most important pages.",
          "AI-powered technical + content audit with clear action steps.",
          "Refinement of your top on-page messaging.",
          "Competitor snapshot covering search signals and basic sentiment.",
          "Content recommendations: 4–6 content ideas monthly.",
          "A clean PDF scorecard summarizing findings and opportunities."
        ],
        outcomes: [
          "Resolves key technical and content issues limiting visibility.",
          "Establishes a measurable baseline to track improvements.",
          "Clear priorities: what’s working, what’s not, and what to do next."
        ]
      },
      {
        tier: "Silver",
        title: "Growth",
        price: "$2,499",
        sub: "Strengthens your authority and provides competitive insight.",
        bullets: [
          "Full-site schema implementation (Organization, Service/Product, Local, FAQ).",
          "Five-competitor analysis revealing search gaps, strengths, and opportunities.",
          "Structured authority + content improvement plan built from GPTO’s framework.",
          "Lightweight telemetry module to track engagement on key pages.",
          "Quarterly re-audit to measure progress and adjust strategy."
        ],
        outcomes: [
          "Improves credibility and trust signals for search/AI systems.",
          "Replaces guesswork with clear, data-driven actions.",
          "Better ability to compete and rank ahead of competitors."
        ]
      },
      {
        tier: "Gold",
        title: "Elite",
        price: "$4,999",
        sub: "Automates optimization and delivers advanced competitive intelligence.",
        bullets: [
          "Complete real-time optimization for live search, intent, and behavior signals.",
          "Dynamic schema and adaptive SEO updated based on real-time data.",
          "10-competitor, multi-market authority + sentiment mapping.",
          "AI-supported reputation and link-building guidance.",
          "Monthly telemetry insights + executive performance dashboard."
        ],
        outcomes: [
          "Transforms your site into a continuously self-optimizing system.",
          "Sustains ongoing gains in visibility, trust, and conversion performance.",
          "Enables leadership in search results across key markets."
        ]
      }
    ];
  }, []);

  function GetStartedHref(tier: string) {
    // If you have a contact page, this sends them there with tier preselected.
    // If you’d rather link to Calendly or something else, replace the URL below.
    return `/contact?tier=${encodeURIComponent(tier)}`;
  }

  return (
    <div
      className="grid cols-3"
      style={{
        alignItems: "stretch",
        gap: 18,
        marginTop: 16
      }}
    >
      {plans.map((p) => {
        const isRec = recommended && p.tier === recommended;

        return (
          <div
            key={p.tier}
            className="card"
            style={{
              position: "relative",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255,255,255,0.85)",
              border: isRec ? "2px solid var(--brand-red)" : "1px solid rgba(0,0,0,.08)",
              boxShadow: "0 10px 30px rgba(0,0,0,.06)",
              display: "flex",
              flexDirection: "column",
              minHeight: 520
            }}
          >
            {/* Recommended pill/banner */}
            {isRec && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #ff5aa5, #ffb55a)",
                  color: "#111",
                  fontWeight: 900,
                  fontSize: 12
                }}
              >
                Recommended
              </div>
            )}

            <div style={{ fontWeight: 900, fontSize: 18 }}>{p.tier}</div>

            <div style={{ fontSize: 40, fontWeight: 900, marginTop: 6, lineHeight: 1 }}>
              {p.price} <span style={{ fontSize: 18, fontWeight: 800 }}>/ mo</span>
            </div>

            <div className="muted" style={{ marginTop: 10, minHeight: 44 }}>
              {p.sub}
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "14px 0" }} />

            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {p.bullets.map((b) => (
                <li key={b} style={{ lineHeight: 1.3 }}>
                  {b}
                </li>
              ))}
            </ul>

            <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "14px 0" }} />

            <div style={{ fontWeight: 900, marginBottom: 8 }}>Outcomes</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {p.outcomes.map((o) => (
                <li key={o} style={{ lineHeight: 1.3 }}>
                  {o}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <a
                className="btn"
                href={GetStartedHref(p.tier)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  display: "block"
                }}
              >
                Get Started
              </a>

              <div className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>
                3 month commitment
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
