import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasks_status" AS ENUM('open', 'review', 'held', 'paying', 'paid');
  CREATE TYPE "public"."enum_tasks_verdict" AS ENUM('pay', 'hold');
  CREATE TYPE "public"."enum_tasks_paid_via" AS ENUM('autopay', 'approved', 'override');
  CREATE TYPE "public"."enum__tasks_v_version_status" AS ENUM('open', 'review', 'held', 'paying', 'paid');
  CREATE TYPE "public"."enum__tasks_v_version_verdict" AS ENUM('pay', 'hold');
  CREATE TYPE "public"."enum__tasks_v_version_paid_via" AS ENUM('autopay', 'approved', 'override');
  CREATE TABLE "tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"payee_name" varchar NOT NULL,
  	"payee_contact" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"status" "enum_tasks_status" DEFAULT 'open',
  	"delivery_note" varchar,
  	"verdict" "enum_tasks_verdict",
  	"reason" varchar,
  	"reviewed_by_ai" boolean DEFAULT false,
  	"paid_via" "enum_tasks_paid_via",
  	"paid_date" varchar,
  	"payout_ref" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tasks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_tasks_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_title" varchar NOT NULL,
  	"version_payee_name" varchar NOT NULL,
  	"version_payee_contact" varchar NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_status" "enum__tasks_v_version_status" DEFAULT 'open',
  	"version_delivery_note" varchar,
  	"version_verdict" "enum__tasks_v_version_verdict",
  	"version_reason" varchar,
  	"version_reviewed_by_ai" boolean DEFAULT false,
  	"version_paid_via" "enum__tasks_v_version_paid_via",
  	"version_paid_date" varchar,
  	"version_payout_ref" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tasks_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  ALTER TABLE "users" ADD COLUMN "autopay_limit" numeric DEFAULT 0;
  ALTER TABLE "_users_v" ADD COLUMN "version_autopay_limit" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tasks_id" integer;
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tasks_rels" ADD CONSTRAINT "tasks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tasks_rels" ADD CONSTRAINT "tasks_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tasks_rels" ADD CONSTRAINT "tasks_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tasks_v" ADD CONSTRAINT "_tasks_v_parent_id_tasks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tasks_v" ADD CONSTRAINT "_tasks_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tasks_v_rels" ADD CONSTRAINT "_tasks_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tasks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tasks_v_rels" ADD CONSTRAINT "_tasks_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tasks_v_rels" ADD CONSTRAINT "_tasks_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tasks_owner_idx" ON "tasks" USING btree ("owner_id");
  CREATE INDEX "tasks_updated_at_idx" ON "tasks" USING btree ("updated_at");
  CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");
  CREATE INDEX "tasks_rels_order_idx" ON "tasks_rels" USING btree ("order");
  CREATE INDEX "tasks_rels_parent_idx" ON "tasks_rels" USING btree ("parent_id");
  CREATE INDEX "tasks_rels_path_idx" ON "tasks_rels" USING btree ("path");
  CREATE INDEX "tasks_rels_admins_id_idx" ON "tasks_rels" USING btree ("admins_id");
  CREATE INDEX "tasks_rels_users_id_idx" ON "tasks_rels" USING btree ("users_id");
  CREATE INDEX "_tasks_v_parent_idx" ON "_tasks_v" USING btree ("parent_id");
  CREATE INDEX "_tasks_v_version_version_owner_idx" ON "_tasks_v" USING btree ("version_owner_id");
  CREATE INDEX "_tasks_v_version_version_updated_at_idx" ON "_tasks_v" USING btree ("version_updated_at");
  CREATE INDEX "_tasks_v_version_version_created_at_idx" ON "_tasks_v" USING btree ("version_created_at");
  CREATE INDEX "_tasks_v_created_at_idx" ON "_tasks_v" USING btree ("created_at");
  CREATE INDEX "_tasks_v_updated_at_idx" ON "_tasks_v" USING btree ("updated_at");
  CREATE INDEX "_tasks_v_rels_order_idx" ON "_tasks_v_rels" USING btree ("order");
  CREATE INDEX "_tasks_v_rels_parent_idx" ON "_tasks_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tasks_v_rels_path_idx" ON "_tasks_v_rels" USING btree ("path");
  CREATE INDEX "_tasks_v_rels_admins_id_idx" ON "_tasks_v_rels" USING btree ("admins_id");
  CREATE INDEX "_tasks_v_rels_users_id_idx" ON "_tasks_v_rels" USING btree ("users_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasks_fk" FOREIGN KEY ("tasks_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("tasks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tasks_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tasks_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tasks_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tasks" CASCADE;
  DROP TABLE "tasks_rels" CASCADE;
  DROP TABLE "_tasks_v" CASCADE;
  DROP TABLE "_tasks_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tasks_fk";
  
  DROP INDEX "payload_locked_documents_rels_tasks_id_idx";
  ALTER TABLE "users" DROP COLUMN "autopay_limit";
  ALTER TABLE "_users_v" DROP COLUMN "version_autopay_limit";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tasks_id";
  DROP TYPE "public"."enum_tasks_status";
  DROP TYPE "public"."enum_tasks_verdict";
  DROP TYPE "public"."enum_tasks_paid_via";
  DROP TYPE "public"."enum__tasks_v_version_status";
  DROP TYPE "public"."enum__tasks_v_version_verdict";
  DROP TYPE "public"."enum__tasks_v_version_paid_via";`)
}
