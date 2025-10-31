// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs' // Stripe server SDK runs on Node.js runtime

const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
const stripe = stripeKey ? new Stripe(stripeKey) : null

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 500 })
  }

  const { priceId } = await req.json()

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/?success=1`,
    cancel_url: `${baseUrl}/?canceled=1`,
    customer_email: process.env.PRIMARY_EMAIL ?? undefined
  })

  return NextResponse.json({ url: session.url })
}
