# Stripe Webhook

The webhook endpoint is at `/api/stripe-webhook`. Stripe sends events here for `checkout.session.completed`, `customer.subscription.*`, and `invoice.*`.

## Configuration

1. **Stripe Dashboard** → Developers → Webhooks → Add endpoint
2. **Endpoint URL**: `https://consultingsr.com/api/stripe-webhook` (production)
3. **Events to send**: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`) and set `STRIPE_WEBHOOK_SECRET` in your environment

## Important: Webhook URL Must Match Your Deployment

The webhook URL in Stripe Dashboard must point to the domain where this app is deployed. If you receive "webhook delivery failed" emails:

- **Wrong URL**: Stripe may be sending to an old or incorrect URL. Production webhook must be `https://consultingsr.com/api/stripe-webhook`.
- **Fix**: Ensure the webhook endpoint URL in Stripe Dashboard is `https://consultingsr.com/api/stripe-webhook`.
- **Live vs Test**: Create separate webhook endpoints for test and live mode. Each has its own signing secret. Use the live secret when `STRIPE_USE_LIVE=true` or `NEXT_PUBLIC_ENV=production`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret from Stripe Dashboard (whsec_...) |
| `STRIPE_SECRET_KEY` (test) | Yes | For test mode |
| `STRIPE_LIVE_SECRET_KEY` | Yes for production | For live mode when `NEXT_PUBLIC_ENV=production` |

## Troubleshooting

Stripe requires HTTP 200–299 for successful delivery. If you see "other errors":

1. **Verify the URL** – Ensure the webhook URL in Stripe Dashboard matches your deployment.
2. **Check STRIPE_WEBHOOK_SECRET** – Must be the signing secret for that exact endpoint URL. If you changed the URL, create a new endpoint and use its new secret.
3. **Live vs test** – Use the live webhook secret when processing live payments.
4. **Check logs** – Server logs will show `[Stripe Webhook]` messages for errors (missing secret, signature failure, processing failure).
5. **Database** – Ensure the database is reachable from your deployment (e.g. Neon, Vercel Postgres).
6. **Vercel env** – For the consultingsr.com deployment, ensure `STRIPE_WEBHOOK_SECRET`, `STRIPE_LIVE_SECRET_KEY`, and `NEXT_PUBLIC_SITE_URL=https://consultingsr.com` are set.
