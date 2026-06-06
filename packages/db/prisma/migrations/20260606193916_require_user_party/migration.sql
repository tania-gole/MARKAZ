-- Defensive backfill: any user without a party_id gets a fresh Party row
-- before the column is promoted to NOT NULL. The add_auth_models migration's
-- DO block covered existing users at that point; this catches any user
-- registered between then and now via a code path that didn't nested-create
-- a Party. No-op on a fully-backfilled user table.
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

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "party_id" SET NOT NULL;
