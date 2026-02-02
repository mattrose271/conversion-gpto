# Database Setup and Seeding

## Prerequisites

1. Ensure your `.env` file has `DATABASE_URL` configured
2. Run database migrations first

## Running Migrations

```bash
# Deploy migrations to your database
npm run db:migrate

# Or manually run the SQL from prisma/migrations/001_init/migration.sql
```

## Seeding Tier Deliverables

The seed script populates the `tier_deliverables` table with the tier data from `lib/data/tierDeliverables.ts`.

### Run the seed script:

```bash
npm run db:seed
```

This will:
- Upsert (insert or update) all three tiers: Bronze, Silver, and Gold
- Use the `NEXT_PUBLIC_CALENDLY_URL` from your `.env` if available
- Show progress for each tier seeded

### What gets seeded:

- **Bronze** tier: Foundation ($999/mo)
- **Silver** tier: Growth ($2,499/mo)
- **Gold** tier: Elite ($4,999/mo)

Each tier includes:
- Title and price
- Subtitle/description
- List of deliverables
- Calendly URL (if configured)

## Regenerating Prisma Client

If you modify the schema, regenerate the Prisma client:

```bash
npm run db:generate
```

## Troubleshooting

- **Import errors**: Make sure `tsx` is installed (`npm install -D tsx`)
- **Database connection**: Verify `DATABASE_URL` in `.env` is correct
- **Migration errors**: Ensure the database exists and you have proper permissions
