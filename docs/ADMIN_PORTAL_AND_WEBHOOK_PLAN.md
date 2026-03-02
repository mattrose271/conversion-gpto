# Admin Portal & Stripe Webhook Improvements Plan

## Overview

This plan covers (1) Stripe webhook best-practice improvements per official docs, and (2) an admin portal with login and a dashboard for Stripe events, payment leads, and audit data.

---

## Part 1: Stripe Webhook Improvements (per Stripe docs)

### Current gaps vs. Stripe recommendations

| Recommendation | Current | Proposed |
|----------------|---------|----------|
| Return 200 quickly before complex logic | We process synchronously, then return 200 | Return 200 immediately, process in background |
| Handle duplicates | Done via `markEventReceived` | Keep as-is |
| Async processing | Synchronous (DB + email inline) | Queue or fire-and-forget after 200 |

### Implementation: Return 200 first, process async

**Goal**: Stripe requires a 2xx response before heavy logic to avoid timeouts.

**Option A (simpler)**: Return 200 immediately, then process in `void Promise`. No queue.

```typescript
// In POST handler, after constructEvent:
const event = stripe.webhooks.constructEvent(...);

// Return 200 immediately
const response = NextResponse.json({ received: true });

// Process async (fire-and-forget)
void (async () => {
  try {
    const shouldProcess = await markEventReceived(event);
    if (shouldProcess) await processEvent(stripe, event);
  } catch (e) {
    console.error("[Stripe Webhook] Async processing failed:", e);
  }
})();

return response;
```

**Risk**: If the serverless function terminates before async work completes, the event may not be processed. Vercel typically keeps the function alive until the response is sent; background work may be cut short.

**Option B (more robust)**: Use a queue (e.g. Vercel KV, Upstash, or DB queue). Webhook receives event, stores it, returns 200. Worker processes queue.

**Recommendation**: Start with Option A (simpler). If timeouts persist, move to a queue.

### Files to change

- [app/api/stripe-webhook/route.ts](app/api/stripe-webhook/route.ts): Refactor to return 200 before `processEvent`.

---

## Part 2: Admin Portal

### Architecture

```
/admin                    → Login page (or redirect to login)
/admin/login              → Login form
/admin/dashboard          → Main dashboard (protected)
/admin/webhooks           → Stripe webhook events list
/admin/leads              → Payment leads
/admin/audits             → Recent audits (optional)
```

### Authentication

**MVP approach** (no new auth library):

- Env vars: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (bcrypt) or `ADMIN_PASSWORD` (plain, dev only).
- Login: POST to `/api/admin/auth` with email + password; set HTTP-only cookie or signed JWT.
- Middleware or route guard: Check cookie/JWT on `/admin/*` (except `/admin/login`).

**Alternative**: NextAuth.js / Auth.js for OAuth (Google, etc.) — adds dependencies and setup.

### Dashboard features

| Page | Data source | Features |
|------|-------------|----------|
| `/admin/dashboard` | Aggregates | Counts: webhooks (24h), payment leads, audits. Quick stats. |
| `/admin/webhooks` | `StripeWebhookEvent` | List with filters (event type, date). Event detail view (payload). |
| `/admin/leads` | `PaymentLead` | List with filters. Columns: tier, business, email, status, created. |
| `/admin/audits` | `Audit` | Recent audits, domain, tier, created. Optional. |

### API routes

- `GET /api/admin/auth/session` — Check if logged in.
- `POST /api/admin/auth/login` — Email + password → session.
- `POST /api/admin/auth/logout` — Clear session.
- `GET /api/admin/stats` — Aggregated counts (protected).
- `GET /api/admin/webhooks` — Paginated webhook events (protected).
- `GET /api/admin/leads` — Paginated payment leads (protected).
- `GET /api/admin/audits` — Paginated audits (protected).

---

## Part 3: Implementation Phases

### Phase 1: Webhook robustness (1–2 hours)

1. Refactor webhook to return 200 before processing.
2. Wrap async processing in try/catch; log failures.
3. Re-test with Stripe CLI: `stripe listen --forward-to https://consultingsr.com/api/stripe-webhook`.

### Phase 2: Simple admin auth (2–3 hours)

1. Add `bcrypt` for password hashing.
2. Create `/api/admin/auth/login`, `/api/admin/auth/logout`, `/api/admin/auth/session`.
3. Use signed cookie (e.g. `jose` for JWT or Next.js cookies).
4. Create login page at `/admin/login`.
5. Create middleware to protect `/admin/*` (redirect to `/admin/login` if unauthenticated).

### Phase 3: Admin dashboard (3–4 hours)

1. Layout for `/admin` with nav (Dashboard, Webhooks, Leads).
2. Dashboard page with stats (counts from DB).
3. Webhooks page: fetch `/api/admin/webhooks`, display table with pagination.
4. Leads page: fetch `/api/admin/leads`, display table.
5. Optional: Audits page.

### Phase 4: Polish (1–2 hours)

1. Basic styling consistent with GPTO brand.
2. Error handling and loading states.
3. Env var docs for `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`.

---

## New dependencies

```json
{
  "bcrypt": "^5.x",
  "@types/bcrypt": "^5.x",
  "jose": "^5.x"
}
```

Or use Next.js `cookies()` with a simple session secret instead of JWT.

---

## Environment variables

```env
# Admin portal (required for /admin)
ADMIN_EMAIL=admin@consultingsr.com
ADMIN_PASSWORD_HASH=<bcrypt hash of password>
# Or for dev only:
ADMIN_PASSWORD=your-secure-password
ADMIN_SESSION_SECRET=<random 32+ char string for cookie signing>
```

---

## File structure (new files)

```
app/
  admin/
    layout.tsx           # Admin layout with nav
    page.tsx             # Redirect to dashboard
    login/page.tsx       # Login form
    dashboard/page.tsx   # Stats overview
    webhooks/page.tsx    # Webhook events list
    leads/page.tsx       # Payment leads list
  api/
    admin/
      auth/
        login/route.ts
        logout/route.ts
        session/route.ts
      stats/route.ts
      webhooks/route.ts
      leads/route.ts
middleware.ts            # Protect /admin/*, allow /admin/login
```

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Async webhook work killed before completion | Start with fire-and-forget; add queue if needed |
| Admin password in env | Use bcrypt hash only; never store plain password |
| Unauthorized access to /admin | Middleware + session validation on every request |

---

## Summary

1. **Webhook**: Return 200 before processing; move `processEvent` to fire-and-forget async.
2. **Auth**: Simple email/password + session cookie; no OAuth initially.
3. **Dashboard**: Dashboard, Webhooks, Leads (and optionally Audits).
4. **APIs**: Protected admin APIs for stats, webhooks, leads.

Implement Phase 1 first to stabilize webhooks, then Phases 2–4 for the admin portal.
