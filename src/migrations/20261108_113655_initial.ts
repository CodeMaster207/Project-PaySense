import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en');
  CREATE TYPE "public"."enum_users_currency" AS ENUM('MYR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CNY', 'INR', 'THB', 'JPY', 'IDR');
  CREATE TYPE "public"."enum_users_paypal_status" AS ENUM('disconnected', 'connected');
  CREATE TYPE "public"."enum_users_ai_provider" AS ENUM('openai', 'anthropic', 'gemini');
  CREATE TYPE "public"."enum_users_ai_auth" AS ENUM('key', 'google');
  CREATE TYPE "public"."enum__users_v_version_currency" AS ENUM('MYR', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CNY', 'INR', 'THB', 'JPY', 'IDR');
  CREATE TYPE "public"."enum__users_v_version_paypal_status" AS ENUM('disconnected', 'connected');
  CREATE TYPE "public"."enum__users_v_version_ai_provider" AS ENUM('openai', 'anthropic', 'gemini');
  CREATE TYPE "public"."enum__users_v_version_ai_auth" AS ENUM('key', 'google');
  CREATE TYPE "public"."enum_goals_skip_weekdays" AS ENUM('0', '1', '2', '3', '4', '5', '6');
  CREATE TYPE "public"."enum_goals_tag_color" AS ENUM('banana', 'honey', 'leaf', 'berry', 'peel');
  CREATE TYPE "public"."enum_goals_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum__goals_v_version_skip_weekdays" AS ENUM('0', '1', '2', '3', '4', '5', '6');
  CREATE TYPE "public"."enum__goals_v_version_tag_color" AS ENUM('banana', 'honey', 'leaf', 'berry', 'peel');
  CREATE TYPE "public"."enum__goals_v_version_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_entries_type" AS ENUM('income', 'expense');
  CREATE TYPE "public"."enum_entries_source" AS ENUM('manual', 'paypal');
  CREATE TYPE "public"."enum__entries_v_version_type" AS ENUM('income', 'expense');
  CREATE TYPE "public"."enum__entries_v_version_source" AS ENUM('manual', 'paypal');
  CREATE TYPE "public"."enum_subscriptions_category" AS ENUM('Streaming', 'Software', 'Shopping', 'Utilities', 'Other');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('active', 'cancelled');
  CREATE TYPE "public"."enum_subscriptions_source" AS ENUM('manual', 'paypal');
  CREATE TYPE "public"."enum__subscriptions_v_version_category" AS ENUM('Streaming', 'Software', 'Shopping', 'Utilities', 'Other');
  CREATE TYPE "public"."enum__subscriptions_v_version_status" AS ENUM('active', 'cancelled');
  CREATE TYPE "public"."enum__subscriptions_v_version_source" AS ENUM('manual', 'paypal');
  CREATE TYPE "public"."enum_jobs_kind" AS ENUM('job', 'contract');
  CREATE TYPE "public"."enum_jobs_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'yearly');
  CREATE TYPE "public"."enum__jobs_v_version_kind" AS ENUM('job', 'contract');
  CREATE TYPE "public"."enum__jobs_v_version_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'yearly');
  CREATE TYPE "public"."enum_payment_requests_status" AS ENUM('sent', 'paid', 'cancelled');
  CREATE TYPE "public"."enum__payment_requests_v_version_status" AS ENUM('sent', 'paid', 'cancelled');
  CREATE TYPE "public"."enum_payload_llm_instructions_entity_type" AS ENUM('collection', 'global');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "admins_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"_h_folders_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"original_filename" varchar,
  	"original_url" varchar,
  	"original_mime_type" varchar,
  	"original_filesize" numeric,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_prefix" varchar,
  	"original__objectkey" varchar,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_media_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_alt" varchar NOT NULL,
  	"version__h_folders_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_original_filename" varchar,
  	"version_original_url" varchar,
  	"version_original_mime_type" varchar,
  	"version_original_filesize" numeric,
  	"version_original_width" numeric,
  	"version_original_height" numeric,
  	"version_original_prefix" varchar,
  	"version_original__objectkey" varchar,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_media_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "folders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_h_folders_id" integer,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "folders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_folders_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__h_folders_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_folders_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_h_tags_id" integer,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_tags_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__h_tags_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tags_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"currency" "enum_users_currency" DEFAULT 'MYR',
  	"paypal_status" "enum_users_paypal_status" DEFAULT 'disconnected',
  	"paypal_last_sync" timestamp(3) with time zone,
  	"ai_provider" "enum_users_ai_provider",
  	"ai_auth" "enum_users_ai_auth",
  	"ai_model" varchar,
  	"ai_key_hint" varchar,
  	"ai_key_enc" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_users_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "_users_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_currency" "enum__users_v_version_currency" DEFAULT 'MYR',
  	"version_paypal_status" "enum__users_v_version_paypal_status" DEFAULT 'disconnected',
  	"version_paypal_last_sync" timestamp(3) with time zone,
  	"version_ai_provider" "enum__users_v_version_ai_provider",
  	"version_ai_auth" "enum__users_v_version_ai_auth",
  	"version_ai_model" varchar,
  	"version_ai_key_hint" varchar,
  	"version_ai_key_enc" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_email" varchar NOT NULL,
  	"version_reset_password_token" varchar,
  	"version_reset_password_expiration" timestamp(3) with time zone,
  	"version_salt" varchar,
  	"version_hash" varchar,
  	"version_reset_password_requested_at" timestamp(3) with time zone,
  	"version_login_attempts" numeric DEFAULT 0,
  	"version_lock_until" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_users_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "goals_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "goals_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric
  );
  
  CREATE TABLE "goals_skip_weekdays" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_goals_skip_weekdays",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "goals_excluded_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL
  );
  
  CREATE TABLE "goals_restored_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL
  );
  
  CREATE TABLE "goals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"target_date" varchar NOT NULL,
  	"start_date" varchar NOT NULL,
  	"target_amount" numeric,
  	"daily_amount" numeric NOT NULL,
  	"tag" varchar,
  	"tag_color" "enum_goals_tag_color" DEFAULT 'banana',
  	"description" varchar,
  	"status" "enum_goals_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "goals_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_goals_v_version_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_goals_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_goals_v_version_skip_weekdays" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__goals_v_version_skip_weekdays",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_goals_v_version_excluded_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_goals_v_version_restored_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_goals_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_title" varchar NOT NULL,
  	"version_target_date" varchar NOT NULL,
  	"version_start_date" varchar NOT NULL,
  	"version_target_amount" numeric,
  	"version_daily_amount" numeric NOT NULL,
  	"version_tag" varchar,
  	"version_tag_color" "enum__goals_v_version_tag_color" DEFAULT 'banana',
  	"version_description" varchar,
  	"version_status" "enum__goals_v_version_status" DEFAULT 'active',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_goals_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"date" varchar NOT NULL,
  	"type" "enum_entries_type" NOT NULL,
  	"description" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"source" "enum_entries_source" DEFAULT 'manual',
  	"external_id" varchar,
  	"original_currency" varchar,
  	"original_amount" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "entries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_entries_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_date" varchar NOT NULL,
  	"version_type" "enum__entries_v_version_type" NOT NULL,
  	"version_description" varchar NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_source" "enum__entries_v_version_source" DEFAULT 'manual',
  	"version_external_id" varchar,
  	"version_original_currency" varchar,
  	"version_original_amount" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_entries_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_subscriptions_category" DEFAULT 'Other',
  	"amount" numeric NOT NULL,
  	"renew_date" varchar,
  	"termination_date" varchar,
  	"status" "enum_subscriptions_status" DEFAULT 'active',
  	"tag" varchar,
  	"note" varchar,
  	"source" "enum_subscriptions_source" DEFAULT 'manual',
  	"external_id" varchar,
  	"paypal_subscription_id" varchar,
  	"original_currency" varchar,
  	"original_amount" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscriptions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_subscriptions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_category" "enum__subscriptions_v_version_category" DEFAULT 'Other',
  	"version_amount" numeric NOT NULL,
  	"version_renew_date" varchar,
  	"version_termination_date" varchar,
  	"version_status" "enum__subscriptions_v_version_status" DEFAULT 'active',
  	"version_tag" varchar,
  	"version_note" varchar,
  	"version_source" "enum__subscriptions_v_version_source" DEFAULT 'manual',
  	"version_external_id" varchar,
  	"version_paypal_subscription_id" varchar,
  	"version_original_currency" varchar,
  	"version_original_amount" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_subscriptions_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"kind" "enum_jobs_kind" DEFAULT 'job',
  	"amount" numeric NOT NULL,
  	"frequency" "enum_jobs_frequency" DEFAULT 'monthly' NOT NULL,
  	"start_date" varchar NOT NULL,
  	"end_date" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "jobs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_jobs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_kind" "enum__jobs_v_version_kind" DEFAULT 'job',
  	"version_amount" numeric NOT NULL,
  	"version_frequency" "enum__jobs_v_version_frequency" DEFAULT 'monthly' NOT NULL,
  	"version_start_date" varchar NOT NULL,
  	"version_end_date" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_jobs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payment_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"recipient_email" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"description" varchar NOT NULL,
  	"due_date" varchar,
  	"invoice_id" varchar NOT NULL,
  	"status" "enum_payment_requests_status" DEFAULT 'sent',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_requests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_payment_requests_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_owner_id" integer NOT NULL,
  	"version_recipient_email" varchar NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_description" varchar NOT NULL,
  	"version_due_date" varchar,
  	"version_invoice_id" varchar NOT NULL,
  	"version_status" "enum__payment_requests_v_version_status" DEFAULT 'sent',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_payment_requests_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"media_id" integer,
  	"folders_id" integer,
  	"tags_id" integer,
  	"users_id" integer,
  	"goals_id" integer,
  	"entries_id" integer,
  	"subscriptions_id" integer,
  	"jobs_id" integer,
  	"payment_requests_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"entity_slug" varchar NOT NULL,
  	"entity_type" "enum_payload_llm_instructions_entity_type" NOT NULL,
  	"additional_instructions" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders" ADD CONSTRAINT "folders__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_folders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags__h_tags_id_tags_id_fk" FOREIGN KEY ("_h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_version__h_tags_id_tags_id_fk" FOREIGN KEY ("version__h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tags_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_version_sessions" ADD CONSTRAINT "_users_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v" ADD CONSTRAINT "_users_v_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_summary" ADD CONSTRAINT "goals_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_items" ADD CONSTRAINT "goals_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_skip_weekdays" ADD CONSTRAINT "goals_skip_weekdays_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_excluded_days" ADD CONSTRAINT "goals_excluded_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_restored_days" ADD CONSTRAINT "goals_restored_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "goals_rels" ADD CONSTRAINT "goals_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_rels" ADD CONSTRAINT "goals_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "goals_rels" ADD CONSTRAINT "goals_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_version_summary" ADD CONSTRAINT "_goals_v_version_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_version_items" ADD CONSTRAINT "_goals_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_version_skip_weekdays" ADD CONSTRAINT "_goals_v_version_skip_weekdays_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_version_excluded_days" ADD CONSTRAINT "_goals_v_version_excluded_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_version_restored_days" ADD CONSTRAINT "_goals_v_version_restored_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v" ADD CONSTRAINT "_goals_v_parent_id_goals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_goals_v" ADD CONSTRAINT "_goals_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_goals_v_rels" ADD CONSTRAINT "_goals_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_goals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_rels" ADD CONSTRAINT "_goals_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_goals_v_rels" ADD CONSTRAINT "_goals_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_parent_id_entries_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscriptions_v" ADD CONSTRAINT "_subscriptions_v_parent_id_subscriptions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_subscriptions_v" ADD CONSTRAINT "_subscriptions_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_subscriptions_v_rels" ADD CONSTRAINT "_subscriptions_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_subscriptions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscriptions_v_rels" ADD CONSTRAINT "_subscriptions_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscriptions_v_rels" ADD CONSTRAINT "_subscriptions_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs_rels" ADD CONSTRAINT "jobs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_rels" ADD CONSTRAINT "jobs_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_rels" ADD CONSTRAINT "jobs_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_jobs_v" ADD CONSTRAINT "_jobs_v_parent_id_jobs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_jobs_v" ADD CONSTRAINT "_jobs_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_jobs_v_rels" ADD CONSTRAINT "_jobs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_jobs_v_rels" ADD CONSTRAINT "_jobs_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_jobs_v_rels" ADD CONSTRAINT "_jobs_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_requests_rels" ADD CONSTRAINT "payment_requests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payment_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_requests_rels" ADD CONSTRAINT "payment_requests_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_requests_rels" ADD CONSTRAINT "payment_requests_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payment_requests_v" ADD CONSTRAINT "_payment_requests_v_parent_id_payment_requests_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payment_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_requests_v" ADD CONSTRAINT "_payment_requests_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_requests_v_rels" ADD CONSTRAINT "_payment_requests_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_payment_requests_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payment_requests_v_rels" ADD CONSTRAINT "_payment_requests_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payment_requests_v_rels" ADD CONSTRAINT "_payment_requests_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_folders_fk" FOREIGN KEY ("folders_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_goals_fk" FOREIGN KEY ("goals_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_requests_fk" FOREIGN KEY ("payment_requests_id") REFERENCES "public"."payment_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_llm_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "admins_rels_order_idx" ON "admins_rels" USING btree ("order");
  CREATE INDEX "admins_rels_parent_idx" ON "admins_rels" USING btree ("parent_id");
  CREATE INDEX "admins_rels_path_idx" ON "admins_rels" USING btree ("path");
  CREATE INDEX "admins_rels_admins_id_idx" ON "admins_rels" USING btree ("admins_id");
  CREATE INDEX "admins_rels_users_id_idx" ON "admins_rels" USING btree ("users_id");
  CREATE INDEX "media__h_folders_idx" ON "media" USING btree ("_h_folders_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_original_original_filename_idx" ON "media" USING btree ("original_filename");
  CREATE INDEX "media_rels_order_idx" ON "media_rels" USING btree ("order");
  CREATE INDEX "media_rels_parent_idx" ON "media_rels" USING btree ("parent_id");
  CREATE INDEX "media_rels_path_idx" ON "media_rels" USING btree ("path");
  CREATE INDEX "media_rels_tags_id_idx" ON "media_rels" USING btree ("tags_id");
  CREATE INDEX "media_rels_admins_id_idx" ON "media_rels" USING btree ("admins_id");
  CREATE INDEX "media_rels_users_id_idx" ON "media_rels" USING btree ("users_id");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version__h_folders_idx" ON "_media_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_version_original_version_original_filename_idx" ON "_media_v" USING btree ("version_original_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE INDEX "_media_v_rels_order_idx" ON "_media_v_rels" USING btree ("order");
  CREATE INDEX "_media_v_rels_parent_idx" ON "_media_v_rels" USING btree ("parent_id");
  CREATE INDEX "_media_v_rels_path_idx" ON "_media_v_rels" USING btree ("path");
  CREATE INDEX "_media_v_rels_tags_id_idx" ON "_media_v_rels" USING btree ("tags_id");
  CREATE INDEX "_media_v_rels_admins_id_idx" ON "_media_v_rels" USING btree ("admins_id");
  CREATE INDEX "_media_v_rels_users_id_idx" ON "_media_v_rels" USING btree ("users_id");
  CREATE INDEX "folders__h_folders_idx" ON "folders" USING btree ("_h_folders_id");
  CREATE INDEX "folders_updated_at_idx" ON "folders" USING btree ("updated_at");
  CREATE INDEX "folders_created_at_idx" ON "folders" USING btree ("created_at");
  CREATE INDEX "folders_rels_order_idx" ON "folders_rels" USING btree ("order");
  CREATE INDEX "folders_rels_parent_idx" ON "folders_rels" USING btree ("parent_id");
  CREATE INDEX "folders_rels_path_idx" ON "folders_rels" USING btree ("path");
  CREATE INDEX "folders_rels_admins_id_idx" ON "folders_rels" USING btree ("admins_id");
  CREATE INDEX "folders_rels_users_id_idx" ON "folders_rels" USING btree ("users_id");
  CREATE INDEX "_folders_v_parent_idx" ON "_folders_v" USING btree ("parent_id");
  CREATE INDEX "_folders_v_version_version__h_folders_idx" ON "_folders_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_folders_v_version_version_updated_at_idx" ON "_folders_v" USING btree ("version_updated_at");
  CREATE INDEX "_folders_v_version_version_created_at_idx" ON "_folders_v" USING btree ("version_created_at");
  CREATE INDEX "_folders_v_created_at_idx" ON "_folders_v" USING btree ("created_at");
  CREATE INDEX "_folders_v_updated_at_idx" ON "_folders_v" USING btree ("updated_at");
  CREATE INDEX "_folders_v_rels_order_idx" ON "_folders_v_rels" USING btree ("order");
  CREATE INDEX "_folders_v_rels_parent_idx" ON "_folders_v_rels" USING btree ("parent_id");
  CREATE INDEX "_folders_v_rels_path_idx" ON "_folders_v_rels" USING btree ("path");
  CREATE INDEX "_folders_v_rels_admins_id_idx" ON "_folders_v_rels" USING btree ("admins_id");
  CREATE INDEX "_folders_v_rels_users_id_idx" ON "_folders_v_rels" USING btree ("users_id");
  CREATE INDEX "tags__h_tags_idx" ON "tags" USING btree ("_h_tags_id");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "tags_rels_order_idx" ON "tags_rels" USING btree ("order");
  CREATE INDEX "tags_rels_parent_idx" ON "tags_rels" USING btree ("parent_id");
  CREATE INDEX "tags_rels_path_idx" ON "tags_rels" USING btree ("path");
  CREATE INDEX "tags_rels_admins_id_idx" ON "tags_rels" USING btree ("admins_id");
  CREATE INDEX "tags_rels_users_id_idx" ON "tags_rels" USING btree ("users_id");
  CREATE INDEX "_tags_v_parent_idx" ON "_tags_v" USING btree ("parent_id");
  CREATE INDEX "_tags_v_version_version__h_tags_idx" ON "_tags_v" USING btree ("version__h_tags_id");
  CREATE INDEX "_tags_v_version_version_updated_at_idx" ON "_tags_v" USING btree ("version_updated_at");
  CREATE INDEX "_tags_v_version_version_created_at_idx" ON "_tags_v" USING btree ("version_created_at");
  CREATE INDEX "_tags_v_created_at_idx" ON "_tags_v" USING btree ("created_at");
  CREATE INDEX "_tags_v_updated_at_idx" ON "_tags_v" USING btree ("updated_at");
  CREATE INDEX "_tags_v_rels_order_idx" ON "_tags_v_rels" USING btree ("order");
  CREATE INDEX "_tags_v_rels_parent_idx" ON "_tags_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tags_v_rels_path_idx" ON "_tags_v_rels" USING btree ("path");
  CREATE INDEX "_tags_v_rels_admins_id_idx" ON "_tags_v_rels" USING btree ("admins_id");
  CREATE INDEX "_tags_v_rels_users_id_idx" ON "_tags_v_rels" USING btree ("users_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_admins_id_idx" ON "users_rels" USING btree ("admins_id");
  CREATE INDEX "users_rels_users_id_idx" ON "users_rels" USING btree ("users_id");
  CREATE INDEX "_users_v_version_sessions_order_idx" ON "_users_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_users_v_version_sessions_parent_id_idx" ON "_users_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_users_v_parent_idx" ON "_users_v" USING btree ("parent_id");
  CREATE INDEX "_users_v_version_version_updated_at_idx" ON "_users_v" USING btree ("version_updated_at");
  CREATE INDEX "_users_v_version_version_created_at_idx" ON "_users_v" USING btree ("version_created_at");
  CREATE INDEX "_users_v_version_version_email_idx" ON "_users_v" USING btree ("version_email");
  CREATE INDEX "_users_v_created_at_idx" ON "_users_v" USING btree ("created_at");
  CREATE INDEX "_users_v_updated_at_idx" ON "_users_v" USING btree ("updated_at");
  CREATE INDEX "_users_v_rels_order_idx" ON "_users_v_rels" USING btree ("order");
  CREATE INDEX "_users_v_rels_parent_idx" ON "_users_v_rels" USING btree ("parent_id");
  CREATE INDEX "_users_v_rels_path_idx" ON "_users_v_rels" USING btree ("path");
  CREATE INDEX "_users_v_rels_admins_id_idx" ON "_users_v_rels" USING btree ("admins_id");
  CREATE INDEX "_users_v_rels_users_id_idx" ON "_users_v_rels" USING btree ("users_id");
  CREATE INDEX "goals_summary_order_idx" ON "goals_summary" USING btree ("_order");
  CREATE INDEX "goals_summary_parent_id_idx" ON "goals_summary" USING btree ("_parent_id");
  CREATE INDEX "goals_items_order_idx" ON "goals_items" USING btree ("_order");
  CREATE INDEX "goals_items_parent_id_idx" ON "goals_items" USING btree ("_parent_id");
  CREATE INDEX "goals_skip_weekdays_order_idx" ON "goals_skip_weekdays" USING btree ("order");
  CREATE INDEX "goals_skip_weekdays_parent_idx" ON "goals_skip_weekdays" USING btree ("parent_id");
  CREATE INDEX "goals_excluded_days_order_idx" ON "goals_excluded_days" USING btree ("_order");
  CREATE INDEX "goals_excluded_days_parent_id_idx" ON "goals_excluded_days" USING btree ("_parent_id");
  CREATE INDEX "goals_restored_days_order_idx" ON "goals_restored_days" USING btree ("_order");
  CREATE INDEX "goals_restored_days_parent_id_idx" ON "goals_restored_days" USING btree ("_parent_id");
  CREATE INDEX "goals_owner_idx" ON "goals" USING btree ("owner_id");
  CREATE INDEX "goals_tag_idx" ON "goals" USING btree ("tag");
  CREATE INDEX "goals_updated_at_idx" ON "goals" USING btree ("updated_at");
  CREATE INDEX "goals_created_at_idx" ON "goals" USING btree ("created_at");
  CREATE INDEX "goals_rels_order_idx" ON "goals_rels" USING btree ("order");
  CREATE INDEX "goals_rels_parent_idx" ON "goals_rels" USING btree ("parent_id");
  CREATE INDEX "goals_rels_path_idx" ON "goals_rels" USING btree ("path");
  CREATE INDEX "goals_rels_admins_id_idx" ON "goals_rels" USING btree ("admins_id");
  CREATE INDEX "goals_rels_users_id_idx" ON "goals_rels" USING btree ("users_id");
  CREATE INDEX "_goals_v_version_summary_order_idx" ON "_goals_v_version_summary" USING btree ("_order");
  CREATE INDEX "_goals_v_version_summary_parent_id_idx" ON "_goals_v_version_summary" USING btree ("_parent_id");
  CREATE INDEX "_goals_v_version_items_order_idx" ON "_goals_v_version_items" USING btree ("_order");
  CREATE INDEX "_goals_v_version_items_parent_id_idx" ON "_goals_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_goals_v_version_skip_weekdays_order_idx" ON "_goals_v_version_skip_weekdays" USING btree ("order");
  CREATE INDEX "_goals_v_version_skip_weekdays_parent_idx" ON "_goals_v_version_skip_weekdays" USING btree ("parent_id");
  CREATE INDEX "_goals_v_version_excluded_days_order_idx" ON "_goals_v_version_excluded_days" USING btree ("_order");
  CREATE INDEX "_goals_v_version_excluded_days_parent_id_idx" ON "_goals_v_version_excluded_days" USING btree ("_parent_id");
  CREATE INDEX "_goals_v_version_restored_days_order_idx" ON "_goals_v_version_restored_days" USING btree ("_order");
  CREATE INDEX "_goals_v_version_restored_days_parent_id_idx" ON "_goals_v_version_restored_days" USING btree ("_parent_id");
  CREATE INDEX "_goals_v_parent_idx" ON "_goals_v" USING btree ("parent_id");
  CREATE INDEX "_goals_v_version_version_owner_idx" ON "_goals_v" USING btree ("version_owner_id");
  CREATE INDEX "_goals_v_version_version_tag_idx" ON "_goals_v" USING btree ("version_tag");
  CREATE INDEX "_goals_v_version_version_updated_at_idx" ON "_goals_v" USING btree ("version_updated_at");
  CREATE INDEX "_goals_v_version_version_created_at_idx" ON "_goals_v" USING btree ("version_created_at");
  CREATE INDEX "_goals_v_created_at_idx" ON "_goals_v" USING btree ("created_at");
  CREATE INDEX "_goals_v_updated_at_idx" ON "_goals_v" USING btree ("updated_at");
  CREATE INDEX "_goals_v_rels_order_idx" ON "_goals_v_rels" USING btree ("order");
  CREATE INDEX "_goals_v_rels_parent_idx" ON "_goals_v_rels" USING btree ("parent_id");
  CREATE INDEX "_goals_v_rels_path_idx" ON "_goals_v_rels" USING btree ("path");
  CREATE INDEX "_goals_v_rels_admins_id_idx" ON "_goals_v_rels" USING btree ("admins_id");
  CREATE INDEX "_goals_v_rels_users_id_idx" ON "_goals_v_rels" USING btree ("users_id");
  CREATE INDEX "entries_owner_idx" ON "entries" USING btree ("owner_id");
  CREATE INDEX "entries_date_idx" ON "entries" USING btree ("date");
  CREATE INDEX "entries_external_id_idx" ON "entries" USING btree ("external_id");
  CREATE INDEX "entries_updated_at_idx" ON "entries" USING btree ("updated_at");
  CREATE INDEX "entries_created_at_idx" ON "entries" USING btree ("created_at");
  CREATE INDEX "entries_rels_order_idx" ON "entries_rels" USING btree ("order");
  CREATE INDEX "entries_rels_parent_idx" ON "entries_rels" USING btree ("parent_id");
  CREATE INDEX "entries_rels_path_idx" ON "entries_rels" USING btree ("path");
  CREATE INDEX "entries_rels_admins_id_idx" ON "entries_rels" USING btree ("admins_id");
  CREATE INDEX "entries_rels_users_id_idx" ON "entries_rels" USING btree ("users_id");
  CREATE INDEX "_entries_v_parent_idx" ON "_entries_v" USING btree ("parent_id");
  CREATE INDEX "_entries_v_version_version_owner_idx" ON "_entries_v" USING btree ("version_owner_id");
  CREATE INDEX "_entries_v_version_version_date_idx" ON "_entries_v" USING btree ("version_date");
  CREATE INDEX "_entries_v_version_version_external_id_idx" ON "_entries_v" USING btree ("version_external_id");
  CREATE INDEX "_entries_v_version_version_updated_at_idx" ON "_entries_v" USING btree ("version_updated_at");
  CREATE INDEX "_entries_v_version_version_created_at_idx" ON "_entries_v" USING btree ("version_created_at");
  CREATE INDEX "_entries_v_created_at_idx" ON "_entries_v" USING btree ("created_at");
  CREATE INDEX "_entries_v_updated_at_idx" ON "_entries_v" USING btree ("updated_at");
  CREATE INDEX "_entries_v_rels_order_idx" ON "_entries_v_rels" USING btree ("order");
  CREATE INDEX "_entries_v_rels_parent_idx" ON "_entries_v_rels" USING btree ("parent_id");
  CREATE INDEX "_entries_v_rels_path_idx" ON "_entries_v_rels" USING btree ("path");
  CREATE INDEX "_entries_v_rels_admins_id_idx" ON "_entries_v_rels" USING btree ("admins_id");
  CREATE INDEX "_entries_v_rels_users_id_idx" ON "_entries_v_rels" USING btree ("users_id");
  CREATE INDEX "subscriptions_owner_idx" ON "subscriptions" USING btree ("owner_id");
  CREATE INDEX "subscriptions_external_id_idx" ON "subscriptions" USING btree ("external_id");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE INDEX "subscriptions_rels_order_idx" ON "subscriptions_rels" USING btree ("order");
  CREATE INDEX "subscriptions_rels_parent_idx" ON "subscriptions_rels" USING btree ("parent_id");
  CREATE INDEX "subscriptions_rels_path_idx" ON "subscriptions_rels" USING btree ("path");
  CREATE INDEX "subscriptions_rels_admins_id_idx" ON "subscriptions_rels" USING btree ("admins_id");
  CREATE INDEX "subscriptions_rels_users_id_idx" ON "subscriptions_rels" USING btree ("users_id");
  CREATE INDEX "_subscriptions_v_parent_idx" ON "_subscriptions_v" USING btree ("parent_id");
  CREATE INDEX "_subscriptions_v_version_version_owner_idx" ON "_subscriptions_v" USING btree ("version_owner_id");
  CREATE INDEX "_subscriptions_v_version_version_external_id_idx" ON "_subscriptions_v" USING btree ("version_external_id");
  CREATE INDEX "_subscriptions_v_version_version_updated_at_idx" ON "_subscriptions_v" USING btree ("version_updated_at");
  CREATE INDEX "_subscriptions_v_version_version_created_at_idx" ON "_subscriptions_v" USING btree ("version_created_at");
  CREATE INDEX "_subscriptions_v_created_at_idx" ON "_subscriptions_v" USING btree ("created_at");
  CREATE INDEX "_subscriptions_v_updated_at_idx" ON "_subscriptions_v" USING btree ("updated_at");
  CREATE INDEX "_subscriptions_v_rels_order_idx" ON "_subscriptions_v_rels" USING btree ("order");
  CREATE INDEX "_subscriptions_v_rels_parent_idx" ON "_subscriptions_v_rels" USING btree ("parent_id");
  CREATE INDEX "_subscriptions_v_rels_path_idx" ON "_subscriptions_v_rels" USING btree ("path");
  CREATE INDEX "_subscriptions_v_rels_admins_id_idx" ON "_subscriptions_v_rels" USING btree ("admins_id");
  CREATE INDEX "_subscriptions_v_rels_users_id_idx" ON "_subscriptions_v_rels" USING btree ("users_id");
  CREATE INDEX "jobs_owner_idx" ON "jobs" USING btree ("owner_id");
  CREATE INDEX "jobs_updated_at_idx" ON "jobs" USING btree ("updated_at");
  CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");
  CREATE INDEX "jobs_rels_order_idx" ON "jobs_rels" USING btree ("order");
  CREATE INDEX "jobs_rels_parent_idx" ON "jobs_rels" USING btree ("parent_id");
  CREATE INDEX "jobs_rels_path_idx" ON "jobs_rels" USING btree ("path");
  CREATE INDEX "jobs_rels_admins_id_idx" ON "jobs_rels" USING btree ("admins_id");
  CREATE INDEX "jobs_rels_users_id_idx" ON "jobs_rels" USING btree ("users_id");
  CREATE INDEX "_jobs_v_parent_idx" ON "_jobs_v" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_version_version_owner_idx" ON "_jobs_v" USING btree ("version_owner_id");
  CREATE INDEX "_jobs_v_version_version_updated_at_idx" ON "_jobs_v" USING btree ("version_updated_at");
  CREATE INDEX "_jobs_v_version_version_created_at_idx" ON "_jobs_v" USING btree ("version_created_at");
  CREATE INDEX "_jobs_v_created_at_idx" ON "_jobs_v" USING btree ("created_at");
  CREATE INDEX "_jobs_v_updated_at_idx" ON "_jobs_v" USING btree ("updated_at");
  CREATE INDEX "_jobs_v_rels_order_idx" ON "_jobs_v_rels" USING btree ("order");
  CREATE INDEX "_jobs_v_rels_parent_idx" ON "_jobs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_rels_path_idx" ON "_jobs_v_rels" USING btree ("path");
  CREATE INDEX "_jobs_v_rels_admins_id_idx" ON "_jobs_v_rels" USING btree ("admins_id");
  CREATE INDEX "_jobs_v_rels_users_id_idx" ON "_jobs_v_rels" USING btree ("users_id");
  CREATE INDEX "payment_requests_owner_idx" ON "payment_requests" USING btree ("owner_id");
  CREATE INDEX "payment_requests_invoice_id_idx" ON "payment_requests" USING btree ("invoice_id");
  CREATE INDEX "payment_requests_updated_at_idx" ON "payment_requests" USING btree ("updated_at");
  CREATE INDEX "payment_requests_created_at_idx" ON "payment_requests" USING btree ("created_at");
  CREATE INDEX "payment_requests_rels_order_idx" ON "payment_requests_rels" USING btree ("order");
  CREATE INDEX "payment_requests_rels_parent_idx" ON "payment_requests_rels" USING btree ("parent_id");
  CREATE INDEX "payment_requests_rels_path_idx" ON "payment_requests_rels" USING btree ("path");
  CREATE INDEX "payment_requests_rels_admins_id_idx" ON "payment_requests_rels" USING btree ("admins_id");
  CREATE INDEX "payment_requests_rels_users_id_idx" ON "payment_requests_rels" USING btree ("users_id");
  CREATE INDEX "_payment_requests_v_parent_idx" ON "_payment_requests_v" USING btree ("parent_id");
  CREATE INDEX "_payment_requests_v_version_version_owner_idx" ON "_payment_requests_v" USING btree ("version_owner_id");
  CREATE INDEX "_payment_requests_v_version_version_invoice_id_idx" ON "_payment_requests_v" USING btree ("version_invoice_id");
  CREATE INDEX "_payment_requests_v_version_version_updated_at_idx" ON "_payment_requests_v" USING btree ("version_updated_at");
  CREATE INDEX "_payment_requests_v_version_version_created_at_idx" ON "_payment_requests_v" USING btree ("version_created_at");
  CREATE INDEX "_payment_requests_v_created_at_idx" ON "_payment_requests_v" USING btree ("created_at");
  CREATE INDEX "_payment_requests_v_updated_at_idx" ON "_payment_requests_v" USING btree ("updated_at");
  CREATE INDEX "_payment_requests_v_rels_order_idx" ON "_payment_requests_v_rels" USING btree ("order");
  CREATE INDEX "_payment_requests_v_rels_parent_idx" ON "_payment_requests_v_rels" USING btree ("parent_id");
  CREATE INDEX "_payment_requests_v_rels_path_idx" ON "_payment_requests_v_rels" USING btree ("path");
  CREATE INDEX "_payment_requests_v_rels_admins_id_idx" ON "_payment_requests_v_rels" USING btree ("admins_id");
  CREATE INDEX "_payment_requests_v_rels_users_id_idx" ON "_payment_requests_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("folders_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_goals_id_idx" ON "payload_locked_documents_rels" USING btree ("goals_id");
  CREATE INDEX "payload_locked_documents_rels_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("entries_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("jobs_id");
  CREATE INDEX "payload_locked_documents_rels_payment_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_requests_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_entity_slug_idx" ON "payload_llm_instructions" USING btree ("entity_slug");
  CREATE INDEX "payload_llm_instructions_updated_at_idx" ON "payload_llm_instructions" USING btree ("updated_at");
  CREATE INDEX "payload_llm_instructions_created_at_idx" ON "payload_llm_instructions" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_rels_order_idx" ON "payload_llm_instructions_rels" USING btree ("order");
  CREATE INDEX "payload_llm_instructions_rels_parent_idx" ON "payload_llm_instructions_rels" USING btree ("parent_id");
  CREATE INDEX "payload_llm_instructions_rels_path_idx" ON "payload_llm_instructions_rels" USING btree ("path");
  CREATE INDEX "payload_llm_instructions_rels_admins_id_idx" ON "payload_llm_instructions_rels" USING btree ("admins_id");
  CREATE INDEX "payload_llm_instructions_rels_users_id_idx" ON "payload_llm_instructions_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "admins_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_rels" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "_media_v_rels" CASCADE;
  DROP TABLE "folders" CASCADE;
  DROP TABLE "folders_rels" CASCADE;
  DROP TABLE "_folders_v" CASCADE;
  DROP TABLE "_folders_v_rels" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_rels" CASCADE;
  DROP TABLE "_tags_v" CASCADE;
  DROP TABLE "_tags_v_rels" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "_users_v_version_sessions" CASCADE;
  DROP TABLE "_users_v" CASCADE;
  DROP TABLE "_users_v_rels" CASCADE;
  DROP TABLE "goals_summary" CASCADE;
  DROP TABLE "goals_items" CASCADE;
  DROP TABLE "goals_skip_weekdays" CASCADE;
  DROP TABLE "goals_excluded_days" CASCADE;
  DROP TABLE "goals_restored_days" CASCADE;
  DROP TABLE "goals" CASCADE;
  DROP TABLE "goals_rels" CASCADE;
  DROP TABLE "_goals_v_version_summary" CASCADE;
  DROP TABLE "_goals_v_version_items" CASCADE;
  DROP TABLE "_goals_v_version_skip_weekdays" CASCADE;
  DROP TABLE "_goals_v_version_excluded_days" CASCADE;
  DROP TABLE "_goals_v_version_restored_days" CASCADE;
  DROP TABLE "_goals_v" CASCADE;
  DROP TABLE "_goals_v_rels" CASCADE;
  DROP TABLE "entries" CASCADE;
  DROP TABLE "entries_rels" CASCADE;
  DROP TABLE "_entries_v" CASCADE;
  DROP TABLE "_entries_v_rels" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "subscriptions_rels" CASCADE;
  DROP TABLE "_subscriptions_v" CASCADE;
  DROP TABLE "_subscriptions_v_rels" CASCADE;
  DROP TABLE "jobs" CASCADE;
  DROP TABLE "jobs_rels" CASCADE;
  DROP TABLE "_jobs_v" CASCADE;
  DROP TABLE "_jobs_v_rels" CASCADE;
  DROP TABLE "payment_requests" CASCADE;
  DROP TABLE "payment_requests_rels" CASCADE;
  DROP TABLE "_payment_requests_v" CASCADE;
  DROP TABLE "_payment_requests_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "payload_llm_instructions" CASCADE;
  DROP TABLE "payload_llm_instructions_rels" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_currency";
  DROP TYPE "public"."enum_users_paypal_status";
  DROP TYPE "public"."enum_users_ai_provider";
  DROP TYPE "public"."enum_users_ai_auth";
  DROP TYPE "public"."enum__users_v_version_currency";
  DROP TYPE "public"."enum__users_v_version_paypal_status";
  DROP TYPE "public"."enum__users_v_version_ai_provider";
  DROP TYPE "public"."enum__users_v_version_ai_auth";
  DROP TYPE "public"."enum_goals_skip_weekdays";
  DROP TYPE "public"."enum_goals_tag_color";
  DROP TYPE "public"."enum_goals_status";
  DROP TYPE "public"."enum__goals_v_version_skip_weekdays";
  DROP TYPE "public"."enum__goals_v_version_tag_color";
  DROP TYPE "public"."enum__goals_v_version_status";
  DROP TYPE "public"."enum_entries_type";
  DROP TYPE "public"."enum_entries_source";
  DROP TYPE "public"."enum__entries_v_version_type";
  DROP TYPE "public"."enum__entries_v_version_source";
  DROP TYPE "public"."enum_subscriptions_category";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_source";
  DROP TYPE "public"."enum__subscriptions_v_version_category";
  DROP TYPE "public"."enum__subscriptions_v_version_status";
  DROP TYPE "public"."enum__subscriptions_v_version_source";
  DROP TYPE "public"."enum_jobs_kind";
  DROP TYPE "public"."enum_jobs_frequency";
  DROP TYPE "public"."enum__jobs_v_version_kind";
  DROP TYPE "public"."enum__jobs_v_version_frequency";
  DROP TYPE "public"."enum_payment_requests_status";
  DROP TYPE "public"."enum__payment_requests_v_version_status";
  DROP TYPE "public"."enum_payload_llm_instructions_entity_type";`)
}
