-- AlterTable
ALTER TABLE "audits" ADD COLUMN "focus_area" TEXT;
ALTER TABLE "audits" ADD COLUMN "competitors" JSONB;
ALTER TABLE "audits" ADD COLUMN "primary_signals" JSONB;
ALTER TABLE "audits" ADD COLUMN "competitor_signals" JSONB;
