-- CreateTable
CREATE TABLE "payment_leads" (
    "id" TEXT NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_number" TEXT,
    "industry" TEXT,
    "message" TEXT,
    "minimum_term_accepted" BOOLEAN NOT NULL DEFAULT false,
    "minimum_term_accepted_at" TIMESTAMP(3),
    "audit_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'pricing',
    "stripe_customer_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "checkout_status" TEXT,
    "subscription_status" TEXT,
    "last_invoice_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_leads_email_idx" ON "payment_leads"("email");

-- CreateIndex
CREATE INDEX "payment_leads_tier_idx" ON "payment_leads"("tier");

-- CreateIndex
CREATE INDEX "payment_leads_audit_id_idx" ON "payment_leads"("audit_id");

-- CreateIndex
CREATE INDEX "payment_leads_created_at_idx" ON "payment_leads"("created_at" DESC);

-- CreateIndex
CREATE INDEX "payment_leads_stripe_customer_id_idx" ON "payment_leads"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_leads_stripe_checkout_session_id_key" ON "payment_leads"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_leads_stripe_subscription_id_key" ON "payment_leads"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_event_type_idx" ON "stripe_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_processed_at_idx" ON "stripe_webhook_events"("processed_at" DESC);

-- AddForeignKey
ALTER TABLE "payment_leads" ADD CONSTRAINT "payment_leads_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
