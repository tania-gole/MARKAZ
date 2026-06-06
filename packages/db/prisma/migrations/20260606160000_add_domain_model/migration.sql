-- AlterTable
ALTER TABLE "user" ADD COLUMN     "emirates_id_enc" BYTEA,
ADD COLUMN     "emirates_id_hash" TEXT,
ADD COLUMN     "party_id" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "residency_status" TEXT;

-- CreateTable
CREATE TABLE "party" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "size_sqft" DECIMAL(10,2) NOT NULL,
    "location" TEXT NOT NULL,
    "deed_ref" TEXT NOT NULL,
    "deed_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "share" DECIMAL(10,8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "asking_price" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'SelfService',
    "min_notification_price" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "financing_method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "access_level" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "property_id" TEXT,
    "listing_id" TEXT,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "from_state" TEXT,
    "to_state" TEXT NOT NULL,
    "actor_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "party_kind_idx" ON "party"("kind");

-- CreateIndex
CREATE INDEX "property_type_idx" ON "property"("type");

-- CreateIndex
CREATE INDEX "property_location_idx" ON "property"("location");

-- CreateIndex
CREATE UNIQUE INDEX "property_deed_ref_deed_type_key" ON "property"("deed_ref", "deed_type");

-- CreateIndex
CREATE INDEX "ownership_property_id_idx" ON "ownership"("property_id");

-- CreateIndex
CREATE INDEX "ownership_owner_id_idx" ON "ownership"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "ownership_property_id_owner_id_key" ON "ownership"("property_id", "owner_id");

-- CreateIndex
CREATE INDEX "listing_property_id_idx" ON "listing"("property_id");

-- CreateIndex
CREATE INDEX "listing_status_idx" ON "listing"("status");

-- CreateIndex
CREATE INDEX "offer_listing_id_idx" ON "offer"("listing_id");

-- CreateIndex
CREATE INDEX "offer_buyer_id_idx" ON "offer"("buyer_id");

-- CreateIndex
CREATE INDEX "offer_status_idx" ON "offer"("status");

-- CreateIndex
CREATE INDEX "offer_expires_at_idx" ON "offer"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_listing_id_key" ON "transaction"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_offer_id_key" ON "transaction"("offer_id");

-- CreateIndex
CREATE INDEX "transaction_status_idx" ON "transaction"("status");

-- CreateIndex
CREATE INDEX "document_property_id_idx" ON "document"("property_id");

-- CreateIndex
CREATE INDEX "document_listing_id_idx" ON "document"("listing_id");

-- CreateIndex
CREATE INDEX "document_transaction_id_idx" ON "document"("transaction_id");

-- CreateIndex
CREATE INDEX "document_type_idx" ON "document"("type");

-- CreateIndex
CREATE INDEX "event_aggregate_type_aggregate_id_idx" ON "event"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "event_created_at_idx" ON "event"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_emirates_id_hash_key" ON "user"("emirates_id_hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_party_id_key" ON "user"("party_id");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership" ADD CONSTRAINT "ownership_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership" ADD CONSTRAINT "ownership_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Document attaches to exactly ONE parent. Enforced at the DB layer as a CHECK
-- constraint; also enforced at the app layer at every write site. Belt and braces.
ALTER TABLE "document" ADD CONSTRAINT "document_exactly_one_parent" CHECK (
  (CASE WHEN "property_id"    IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "listing_id"     IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "transaction_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Party backfill: for every existing User without a party_id, create a Party of
-- kind 'person' and link it. No-op on an empty user table. Week 2 will flip
-- user.party_id to NOT NULL after backfill is proven across environments.
DO $$
DECLARE
  u_id TEXT;
  p_id TEXT;
BEGIN
  FOR u_id IN SELECT id FROM "user" WHERE party_id IS NULL LOOP
    p_id := gen_random_uuid()::text;
    INSERT INTO "party" (id, kind, created_at) VALUES (p_id, 'person', NOW());
    UPDATE "user" SET party_id = p_id WHERE id = u_id;
  END LOOP;
END $$;

