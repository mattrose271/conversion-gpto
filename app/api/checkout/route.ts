export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'

const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion:'2022-11-15' }) : null

export async function POST(req: NextRequest){
  if(!stripe) return NextResponse.json({ ok:false, error:'Stripe not configured' })
  const { priceId } = await req.json()
  const session = await stripe.checkout.sessions.create({
    mode:'subscription',
    line_items:[{ price: priceId, quantity:1 }],
    success_url: `${process.env.SITE_URL||'http://localhost:3000'}/?success=1`,
    cancel_url: `${process.env.SITE_URL||'http://localhost:3000'}/?canceled=1`,
    customer_email: process.env.PRIMARY_EMAIL // optional override
  })
  return NextResponse.json({ url: session.url })
}

// webhook (emails after purchase)
}
