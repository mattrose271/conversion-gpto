ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "evidence" JSONB;

CREATE TABLE IF NOT EXISTS "appraisals" (
  "id" TEXT NOT NULL,
  "audit_id" TEXT,
  "url" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "email_hash" TEXT NOT NULL,
  "ip_hash" TEXT NOT NULL,
  "access_token_hash" TEXT NOT NULL,
  "token_expires_at" TIMESTAMP(3) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "workflow_run_id" TEXT,
  "brief" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "recommended_tier" VARCHAR(20),
  "package_rationale" JSONB,
  "model_version" TEXT,
  "prompt_version" TEXT NOT NULL DEFAULT 'gpto-appraisal-v1',
  "error" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appraisals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "appraisal_stages" (
  "id" TEXT NOT NULL,
  "appraisal_id" TEXT NOT NULL,
  "stage_key" VARCHAR(40) NOT NULL,
  "stage_order" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "input" JSONB,
  "output" JSONB,
  "model_version" TEXT,
  "prompt_version" TEXT NOT NULL DEFAULT 'gpto-appraisal-v1',
  "error" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appraisal_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "appraisals_access_token_hash_key" ON "appraisals"("access_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "appraisals_workflow_run_id_key" ON "appraisals"("workflow_run_id");
CREATE INDEX IF NOT EXISTS "appraisals_domain_created_at_idx" ON "appraisals"("domain", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "appraisals_email_hash_domain_created_at_idx" ON "appraisals"("email_hash", "domain", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "appraisals_ip_hash_created_at_idx" ON "appraisals"("ip_hash", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "appraisals_status_idx" ON "appraisals"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "appraisal_stages_appraisal_id_stage_key_key" ON "appraisal_stages"("appraisal_id", "stage_key");
CREATE INDEX IF NOT EXISTS "appraisal_stages_appraisal_id_stage_order_idx" ON "appraisal_stages"("appraisal_id", "stage_order");
CREATE INDEX IF NOT EXISTS "appraisal_stages_status_idx" ON "appraisal_stages"("status");

DO $$ BEGIN
  ALTER TABLE "appraisals"
    ADD CONSTRAINT "appraisals_audit_id_fkey"
    FOREIGN KEY ("audit_id") REFERENCES "audits"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "appraisal_stages"
    ADD CONSTRAINT "appraisal_stages_appraisal_id_fkey"
    FOREIGN KEY ("appraisal_id") REFERENCES "appraisals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "audits" SET "tier" = CASE
  WHEN LOWER("tier") = 'bronze' THEN 'Foundation'
  WHEN LOWER("tier") = 'silver' THEN 'Growth'
  WHEN LOWER("tier") = 'gold' THEN 'Elite'
  ELSE "tier"
END
WHERE LOWER(COALESCE("tier", '')) IN ('bronze', 'silver', 'gold');

UPDATE "payment_leads" SET "tier" = CASE
  WHEN LOWER("tier") = 'bronze' THEN 'Foundation'
  WHEN LOWER("tier") = 'silver' THEN 'Growth'
  WHEN LOWER("tier") = 'gold' THEN 'Elite'
  ELSE "tier"
END
WHERE LOWER(COALESCE("tier", '')) IN ('bronze', 'silver', 'gold');

UPDATE "tier_deliverables" SET "tier" = CASE
  WHEN LOWER("tier") = 'bronze' THEN 'Foundation'
  WHEN LOWER("tier") = 'silver' THEN 'Growth'
  WHEN LOWER("tier") = 'gold' THEN 'Elite'
  ELSE "tier"
END
WHERE LOWER(COALESCE("tier", '')) IN ('bronze', 'silver', 'gold');
