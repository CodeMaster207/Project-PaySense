import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "auto_follow_up" boolean DEFAULT false;
  ALTER TABLE "_users_v" ADD COLUMN "version_auto_follow_up" boolean DEFAULT false;
  ALTER TABLE "payment_requests" ADD COLUMN "reminders_sent" numeric DEFAULT 0;
  ALTER TABLE "payment_requests" ADD COLUMN "last_reminder_date" varchar;
  ALTER TABLE "_payment_requests_v" ADD COLUMN "version_reminders_sent" numeric DEFAULT 0;
  ALTER TABLE "_payment_requests_v" ADD COLUMN "version_last_reminder_date" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "auto_follow_up";
  ALTER TABLE "_users_v" DROP COLUMN "version_auto_follow_up";
  ALTER TABLE "payment_requests" DROP COLUMN "reminders_sent";
  ALTER TABLE "payment_requests" DROP COLUMN "last_reminder_date";
  ALTER TABLE "_payment_requests_v" DROP COLUMN "version_reminders_sent";
  ALTER TABLE "_payment_requests_v" DROP COLUMN "version_last_reminder_date";`)
}
