#!/bin/bash
# Script to verify database migrations status
# Run this locally to check if migrations are applied

echo "🔍 Checking Prisma migration status..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "   Please set it in your .env file or export it"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Run Prisma migrate status
echo "📊 Migration Status:"
npx prisma migrate status

echo ""
echo "💡 If migrations are pending, run: npm run db:migrate"
echo "💡 To see migration history: npx prisma migrate status"
