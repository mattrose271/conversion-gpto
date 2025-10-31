import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  const { prompt } = await req.json()
  const key = process.env.OPENAI_API_KEY
  if(!key) return NextResponse.json({ text: 'Builder‑GPT is offline (no OPENAI_API_KEY set).' })
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
    body: JSON.stringify({ model, messages:[{role:'system', content:'You are Builder‑GPT. Explain GPTO clearly.'},{role:'user', content: prompt}] })
  })
  const j = await r.json()
  const text = j.choices?.[0]?.message?.content || '—'
  return NextResponse.json({ text })
}
