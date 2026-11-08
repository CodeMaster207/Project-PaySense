import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "paypal_account_id" varchar;
  ALTER TABLE "_entries_v" ADD COLUMN "version_paypal_account_id" varchar;
  ALTER TABLE "subscriptions" ADD COLUMN "paypal_account_id" varchar;
  ALTER TABLE "_subscriptions_v" ADD COLUMN "version_paypal_account_id" varchar;
  CREATE INDEX "entries_paypal_account_id_idx" ON "entries" USING btree ("paypal_account_id");
  CREATE INDEX "_entries_v_version_version_paypal_account_id_idx" ON "_entries_v" USING btree ("version_paypal_account_id");
  CREATE INDEX "subscriptions_paypal_account_id_idx" ON "subscriptions" USING btree ("paypal_account_id");
  CREATE INDEX "_subscriptions_v_version_version_paypal_account_id_idx" ON "_subscriptions_v" USING btree ("version_paypal_account_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "entries_paypal_account_id_idx";
  DROP INDEX "_entries_v_version_version_paypal_account_id_idx";
  DROP INDEX "subscriptions_paypal_account_id_idx";
  DROP INDEX "_subscriptions_v_version_version_paypal_account_id_idx";
  ALTER TABLE "entries" DROP COLUMN "paypal_account_id";
  ALTER TABLE "_entries_v" DROP COLUMN "version_paypal_account_id";
  ALTER TABLE "subscriptions" DROP COLUMN "paypal_account_id";
  ALTER TABLE "_subscriptions_v" DROP COLUMN "version_paypal_account_id";`)
}
