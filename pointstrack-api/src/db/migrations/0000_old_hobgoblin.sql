CREATE TYPE "public"."attendee_status" AS ENUM('pending', 'checked-in', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('organizer', 'student');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"organizer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"event_title" text NOT NULL,
	"status" "attendee_status" DEFAULT 'pending' NOT NULL,
	"engagement" text DEFAULT 'Pending' NOT NULL,
	"points_awarded" integer DEFAULT 10 NOT NULL,
	"check_in_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"start_time" text,
	"end_time" text,
	"date" text NOT NULL,
	"location" text,
	"type" text DEFAULT 'Activity' NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"club_name" text,
	"club_logo" text,
	"target_college" text,
	"open_to_all" boolean DEFAULT false NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certificate_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"club_name" text NOT NULL,
	"college" text NOT NULL,
	"bio" text,
	"established_date" text,
	"core_team" text,
	"logo" text,
	"cover_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"organizer_id" uuid,
	"event_id" uuid,
	"club_name" text,
	"club_logo" text,
	"title" text NOT NULL,
	"type" text DEFAULT 'Points Awarded' NOT NULL,
	"description" text,
	"points" integer DEFAULT 0 NOT NULL,
	"semester" integer DEFAULT 1 NOT NULL,
	"date" text NOT NULL,
	"certificate_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"college" text NOT NULL,
	"college_code" text,
	"region" text,
	"usn" text NOT NULL,
	"year" integer DEFAULT 1 NOT NULL,
	"semester" integer DEFAULT 1 NOT NULL,
	"lateral_entry" boolean DEFAULT false NOT NULL,
	"required_points" integer DEFAULT 100 NOT NULL,
	"push_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendees" ADD CONSTRAINT "attendees_event_id_events_catalog_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events_catalog"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendees" ADD CONSTRAINT "attendees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendees" ADD CONSTRAINT "attendees_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events_catalog" ADD CONSTRAINT "events_catalog_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizers" ADD CONSTRAINT "organizers_id_accounts_id_fk" FOREIGN KEY ("id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_event_id_events_catalog_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events_catalog"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students" ADD CONSTRAINT "students_id_accounts_id_fk" FOREIGN KEY ("id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_email_idx" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendees_organizer_idx" ON "attendees" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendees_event_idx" ON "attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendees_student_idx" ON "attendees" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_catalog_organizer_idx" ON "events_catalog" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_catalog_target_college_idx" ON "events_catalog" USING btree ("target_college");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "points_ledger_student_idx" ON "points_ledger" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_account_idx" ON "refresh_tokens" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_college_idx" ON "students" USING btree ("college");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_usn_idx" ON "students" USING btree ("usn");