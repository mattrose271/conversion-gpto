export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const PRIMARY = process.env.PRIMARY_EMAIL || 'Mrose@conversionia.com'

async function sendMail(subject:string, html:string){
  if(process.env.RESEND_API_KEY){
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: process.env.SMTP_FROM || 'no-reply@conversionia.com', to: PRIMARY, subject, html })
    return
  }
  if(process.env.SMTP_HOST){
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||587), secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
    await t.sendMail({ from: process.env.SMTP_FROM||'no-reply@conversionia.com', to: PRIMARY, subject, html })
    return
  }
  console.warn('No email provider configured. Set RESEND_API_KEY or SMTP_* env vars.')
}

export async function POST(req: NextRequest){
  const { email, domain, message } = await req.json()
  const html = `<h2>New GPTO Inquiry</h2><p><b>Email:</b> ${email}<br/><b>Domain:</b> ${domain}</p><pre>${message||''}</pre>`
  await sendMail('New GPTO Inquiry', html)
  return NextResponse.json({ ok:true, message:'Thanks — we will reach out shortly.' })
}
