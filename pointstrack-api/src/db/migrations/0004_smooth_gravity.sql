CREATE TABLE IF NOT EXISTS "event_volunteers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_volunteers" ADD CONSTRAINT "event_volunteers_event_id_events_catalog_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events_catalog"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_volunteers" ADD CONSTRAINT "event_volunteers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_volunteers_event_idx" ON "event_volunteers" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_volunteers_student_idx" ON "event_volunteers" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_volunteers_event_student_unique" ON "event_volunteers" USING btree ("event_id","student_id");--> statement-breakpoint
-- ===========================================================================
-- Account-model merge: every account is a student that may also own a club.
-- Backfill a student profile for each existing organizer-only account, then
-- mark every account as a student. Idempotent.
-- ===========================================================================
INSERT INTO "students" ("id", "name", "email", "college", "usn", "year", "semester", "lateral_entry", "required_points")
SELECT o."id", COALESCE(o."full_name", o."club_name"), o."email", o."college", 'ORG-' || substr(o."id"::text, 1, 8), 1, 1, false, 100
FROM "organizers" o
LEFT JOIN "students" s ON s."id" = o."id"
WHERE s."id" IS NULL;--> statement-breakpoint
UPDATE "accounts" SET "role" = 'student' WHERE "role" <> 'student';