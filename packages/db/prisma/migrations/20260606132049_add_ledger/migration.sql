-- CreateTable
CREATE TABLE "posting" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_line" (
    "id" TEXT NOT NULL,
    "posting_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posting_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posting_idempotency_key_key" ON "posting"("idempotency_key");

-- CreateIndex
CREATE INDEX "posting_aggregate_type_aggregate_id_idx" ON "posting"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "posting_created_at_idx" ON "posting"("created_at");

-- CreateIndex
CREATE INDEX "posting_line_posting_id_idx" ON "posting_line"("posting_id");

-- CreateIndex
CREATE INDEX "posting_line_account_code_idx" ON "posting_line"("account_code");

-- AddForeignKey
ALTER TABLE "posting_line" ADD CONSTRAINT "posting_line_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "posting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
