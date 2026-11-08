import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "fee" numeric;
  ALTER TABLE "entries" ADD COLUMN "counterparty" varchar;
  ALTER TABLE "_entries_v" ADD COLUMN "version_fee" numeric;
  ALTER TABLE "_entries_v" ADD COLUMN "version_counterparty" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" DROP COLUMN "fee";
  ALTER TABLE "entries" DROP COLUMN "counterparty";
  ALTER TABLE "_entries_v" DROP COLUMN "version_fee";
  ALTER TABLE "_entries_v" DROP COLUMN "version_counterparty";`)
}
