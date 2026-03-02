# Production Deployment Fix

## Problem
Production deployments are failing with internal server errors because database migrations are not being run during the build process.

## Root Cause
The build script in `package.json` only runs `prisma generate` but doesn't run `prisma migrate deploy`. This means:
- Prisma Client is generated (code compiles)
- Database tables don't exist (migrations not applied)
- API routes fail when trying to access the database

## Solution
Updated `package.json` build script to include `prisma migrate deploy`:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

## Additional Steps Required

### 1. Verify Environment Variables in Vercel
Ensure these are set in your Vercel project settings:
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_LIVE_SECRET_KEY` - Stripe live secret key (for production)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- All other required environment variables from `.env.example`

### 2. Run Migrations Manually (First Time)
If migrations haven't been run yet, you may need to run them manually:

```bash
# Connect to your production database and run:
npx prisma migrate deploy
```

Or set up a Vercel build command that runs migrations:
- Go to Vercel Dashboard → Your Project → Settings → Build & Development Settings
- Ensure Build Command is: `npm run build` (which now includes migrations)

### 3. Verify Database Connection
Ensure your `DATABASE_URL` in Vercel:
- Uses SSL mode: `?sslmode=require` or `?sslmode=prefer`
- Has correct credentials
- Points to the correct database

### 4. Check Build Logs
After deploying, check Vercel build logs for:
- ✅ `Prisma schema loaded from prisma/schema.prisma`
- ✅ `Applying migration...`
- ✅ `Migration applied successfully`
- ❌ Any database connection errors

## Testing
After deployment:
1. Check `/api/stripe-webhook` endpoint (should return `{"status":"ok"}`)
2. Try admin login at `/admin/login`
3. Check Vercel function logs for any database errors

## Troubleshooting

### If migrations fail:
1. Check `DATABASE_URL` is correct in Vercel
2. Verify database is accessible from Vercel's IP ranges
3. Check if migrations table exists: `SELECT * FROM _prisma_migrations;`
4. Manually resolve failed migrations if needed

### If build succeeds but runtime fails:
1. Check Vercel function logs for specific errors
2. Verify all environment variables are set
3. Test database connection manually
4. Check Prisma Client is generated correctly
