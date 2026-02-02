-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "email" TEXT,
    "tier" VARCHAR(20),
    "scores" JSONB NOT NULL,
    "grades" JSONB NOT NULL,
    "recommendations" JSONB,
    "signals" JSONB,
    "scope" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_submissions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "audit_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'modal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_deliverables" (
    "id" TEXT NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL,
    "calendly_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audits_domain_idx" ON "audits"("domain");

-- CreateIndex
CREATE INDEX "audits_created_at_idx" ON "audits"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audits_tier_idx" ON "audits"("tier");

-- CreateIndex
CREATE INDEX "email_submissions_email_idx" ON "email_submissions"("email");

-- CreateIndex
CREATE INDEX "email_submissions_audit_id_idx" ON "email_submissions"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "tier_deliverables_tier_key" ON "tier_deliverables"("tier");

-- AddForeignKey
ALTER TABLE "email_submissions" ADD CONSTRAINT "email_submissions_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
